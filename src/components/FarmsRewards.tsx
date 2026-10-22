import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { Card } from "../ui/Card";
import { SectionTabs } from "../ui/NavTabs";
import { TokenSelect, TokenLogo, type TokenBalanceInfo } from "../ui/TokenSelect";
import { Lock, LockOpen } from "lucide-react";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useSwapConfig } from "../context/SwapConfigContext";
import { useGoTo } from "../context/SwapViewContext";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import { fetchAllPools } from "../helpers/fetchAllPools";
import {
  fetchFarms,
  fetchFarmsFundingConfig,
  fetchFarmStreams,
  fetchMinFundAmount,
  type FarmRewardStream,
  type FarmsFundingConfig,
} from "../helpers/farms";
import { fetchFarmsApi, fetchFarmsConfigApi } from "../helpers/farmsApi";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { estimateGasLimit } from "../helpers/estimateGas";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import type { LiquidityPool, TokenMeta } from "../types";

// fund(): one storage write + an optional fee transfer — not measured yet
// (contract not deployed at the time of writing), generous default.
// Unused gas is not refunded ("too much gas provided" charges the full limit).
const FUND_GAS_LIMIT = 8_000_000; // measured 5.72M on devnet (incl. optional fee transfer)
const UNLOCK_GAS_LIMIT = 7_000_000; // storage write + fee transfer (setExtraFluxPrice alone: 3.42M), not measured yet
const MAX_PERCENTAGE = 10_000;

interface RewardOption {
  identifier: string;
  ticker: string;
  logoUrl?: string | null;
  priceUsd?: string | null;
}

/**
 * Create a farm / top up its rewards: fund(staked_token) paying the reward
 * token. Hidden route (#farms-rewards), not linked from the UI yet.
 * Preset with ?staked=<identifier>.
 */
export const FarmsRewards = () => {
  const { apiUrl, farmsAddress, address, networkApiAddress, chainId, onConnect, onSignTransactions } = useSwapConfig();
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const [searchParams] = useWidgetSearchParams();

  /* ---- Reference data ---- */
  const [config, setConfig] = React.useState<FarmsFundingConfig | null>(null);
  const [tokenMap, setTokenMap] = React.useState<Record<string, TokenMeta & { logoUrl?: string | null }>>({});
  const [dinovoxPools, setDinovoxPools] = React.useState<LiquidityPool[]>([]);
  const [farmStakedTokens, setFarmStakedTokens] = React.useState<string[]>([]);
  // total_staked per staked token — APR denominator (shared by all its streams).
  const [farmTotalStaked, setFarmTotalStaked] = React.useState<Record<string, string>>({});
  // Per-farm cap of streams per participant (+ local bump right after our own unlock,
  // since the backend snapshot is cached ~30s).
  const [farmMaxActive, setFarmMaxActive] = React.useState<Record<string, number>>({});
  // Backend snapshot (GET /farms + /farms/config) — null when unavailable, in
  // which case every read below falls back to on-chain views.
  const [apiFarms, setApiFarms] = React.useState<Awaited<ReturnType<typeof fetchFarmsApi>> | null>(null);
  const [minFundByToken, setMinFundByToken] = React.useState<Record<string, string> | null>(null);

  React.useEffect(() => {
    if (!farmsAddress) return;
    const onChain = () => {
      if (!networkApiAddress || !chainId) return;
      fetchFarmsFundingConfig(networkApiAddress, chainId, farmsAddress).then(setConfig).catch(console.error);
      fetchFarms(networkApiAddress, chainId, farmsAddress)
        .then((farms) => {
          setFarmStakedTokens(farms.map((f) => f.stakedToken));
          setFarmTotalStaked(Object.fromEntries(farms.map((f) => [f.stakedToken, f.totalStaked])));
          setFarmMaxActive(Object.fromEntries(farms.filter((f) => f.maxActive != null).map((f) => [f.stakedToken, f.maxActive!])));
        })
        .catch(() => {});
    };
    Promise.all([fetchFarmsApi(apiUrl), fetchFarmsConfigApi(apiUrl)])
      .then(([farms, cfg]) => {
        setApiFarms(farms);
        setFarmStakedTokens(farms.map((f) => f.stakedToken));
        setFarmTotalStaked(Object.fromEntries(farms.map((f) => [f.stakedToken, f.totalStaked])));
          setFarmMaxActive(Object.fromEntries(farms.filter((f) => f.maxActive != null).map((f) => [f.stakedToken, f.maxActive!])));
        setConfig({
          whitelistedRewardTokens: cfg.whitelistedRewardTokens.map((w) => w.token),
          feePercent: cfg.feePercent,
          defaultMsToMax: cfg.defaultMsToMax,
          defaultMaxActive: cfg.defaultMaxActiveRewardsPerPosition,
          maxActiveCeiling: cfg.maxActiveRewardsPerPositionCeiling,
          extraFluxPrice: cfg.extraFluxPrice,
          extraFluxToken: cfg.extraFluxToken ?? cfg.removeFeesToken,
          minFundAmountNonWhitelisted: cfg.minFundAmountNonWhitelisted,
        });
        setMinFundByToken(Object.fromEntries(cfg.whitelistedRewardTokens.map((w) => [w.token, w.minFundAmount])));
      })
      .catch(onChain);
  }, [apiUrl, farmsAddress, networkApiAddress, chainId]);

  React.useEffect(() => {
    if (!apiUrl) return;
    axios
      .get(`${apiUrl}/tokens`)
      .then((res) => {
        const map: Record<string, TokenMeta & { logoUrl?: string | null }> = {};
        for (const tk of res.data.tokens || []) {
          map[tk.identifier] = {
            identifier: tk.identifier,
            ticker: tk.ticker ?? tk.identifier.split("-")[0],
            decimals: tk.decimals ?? 18,
            priceUsd: tk.priceUsd ?? null,
            logoUrl: tk.logoUrl ?? null,
          };
        }
        setTokenMap(map);
      })
      .catch(() => {});
    fetchAllPools(apiUrl, { dexType: "DinoVox" })
      .then((pools) => setDinovoxPools(pools.filter((p) => p.isActive && p.lpToken)))
      .catch(() => {});
  }, [apiUrl]);

  // Wallet ESDTs: reward candidates beyond the DEX token list, so metadata
  // (ticker/decimals/logo) falls back on the wallet entry.
  const walletTokens = useGetUserESDT(undefined, { enabled: !!address, address, networkApiAddress });
  type WalletItem = { identifier?: string; ticker?: string; decimals?: number; balance?: string; assets?: { svgUrl?: string; pngUrl?: string } };
  const walletItems = (walletTokens ?? []) as WalletItem[];
  const walletMeta = (id: string) => walletItems.find((w) => w.identifier === id);
  const tickerOf = (id: string) => tokenMap[id]?.ticker ?? walletMeta(id)?.ticker ?? id.split("-")[0];
  const decimalsOf = (id: string) => tokenMap[id]?.decimals ?? walletMeta(id)?.decimals ?? 18;
  const poolByLp = React.useMemo(() => {
    const m: Record<string, LiquidityPool> = {};
    for (const p of dinovoxPools) m[p.lpToken] = p;
    return m;
  }, [dinovoxPools]);
  const stakedLabel = (id: string) => {
    const p = poolByLp[id];
    return p ? `${tickerOf(p.tokenA)} / ${tickerOf(p.tokenB)} — LP` : tickerOf(id);
  };

  /* ---- Staked token (farm) ----
     Only LP tokens of DinoVox pools — no free identifier here (the contract
     would accept any token, but this form only creates/funds LP farms).
     Searchable picker, grouped "existing farms" / "pools without a farm". */
  const stakedOptions = React.useMemo(
    () =>
      dinovoxPools
        .map((p) => ({
          identifier: p.lpToken,
          ticker: `${tickerOf(p.tokenA)} / ${tickerOf(p.tokenB)}`,
          logoUrl: tokenMap[p.tokenA]?.logoUrl ?? null,
          priceUsd: null,
        }))
        .sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [dinovoxPools, tokenMap], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const stakedSections = [
    { label: t("farms_fund_group_existing"), ids: stakedOptions.filter((o) => farmStakedTokens.includes(o.identifier)).map((o) => o.identifier) },
    { label: t("farms_fund_group_no_farm"), ids: stakedOptions.filter((o) => !farmStakedTokens.includes(o.identifier)).map((o) => o.identifier) },
  ];
  // Preset via ?staked= — kept only if it's one of the DinoVox LP options.
  const [stakedChoice, setStakedChoice] = React.useState<string>(() => searchParams.get("staked") ?? "");
  const stakedOption = stakedOptions.find((o) => o.identifier === stakedChoice) ?? null;
  const stakedToken = stakedOption?.identifier ?? null;
  const stakedValid = !!stakedToken;

  /* ---- Existing stream (top-up) vs new farm ---- */
  const [streams, setStreams] = React.useState<FarmRewardStream[] | null>(null);
  const [minFundRaw, setMinFundRaw] = React.useState<string>("0");
  React.useEffect(() => {
    setStreams(null);
    if (!stakedValid) return;
    // A staked token absent from /farms has no stream yet → new farm.
    if (apiFarms) return setStreams(apiFarms.find((f) => f.stakedToken === stakedToken)?.streams ?? []);
    if (!farmsAddress || !networkApiAddress || !chainId) return;
    fetchFarmStreams(networkApiAddress, chainId, farmsAddress, stakedToken!).then(setStreams).catch(() => setStreams([]));
  }, [stakedToken, stakedValid, apiFarms, farmsAddress, networkApiAddress, chainId]);
  /* ---- Reward token ---- */
  // fund() rules (cf. farms::fund):
  //  - CREATING a farm (very first stream on a staked token) requires a
  //    whitelisted reward token;
  //  - once the farm exists, any token can open a new stream or top one up;
  //  - a whitelisted token never pays the deposit fee; a non-whitelisted one
  //    pays the stream's fee_percentage (global fee at the stream's creation,
  //    adjustable by the owner, removable via removePoolFees).
  const balanceOf = (id: string) =>
    ((walletTokens ?? []) as Array<{ identifier?: string; balance?: string }>).find((w) => w.identifier === id)?.balance ?? "0";
  const whitelist = config?.whitelistedRewardTokens ?? [];
  // Creation = this staked token has no farm yet; otherwise it's a top-up of the farm.
  const farmExists = !!stakedToken && (farmStakedTokens.includes(stakedToken) || (streams ?? []).length > 0);
  // Wallet fungible ESDTs that aren't whitelisted (+ existing non-whitelisted
  // streams of this farm, even if not held), shown under the allowed ones.
  // Wallet tokens must be branded (MultiversX assets with a logo): unbranded
  // ones (LP tokens, spam, test tokens) aren't offered as new rewards.
  const otherIds = [
    ...new Set([
      ...walletItems
        .filter(
          (w) =>
            w.identifier &&
            /^[A-Z0-9]{3,10}-[a-f0-9]{6}$/.test(w.identifier) &&
            new BigNumber(w.balance ?? "0").gt(0) &&
            !!(w.assets?.svgUrl || w.assets?.pngUrl),
        )
        .map((w) => w.identifier!),
      ...(streams ?? []).map((s) => s.rewardedToken),
    ]),
  ].filter((id) => !whitelist.includes(id));
  const rewardOptions: RewardOption[] = [...whitelist, ...otherIds].map((id) => ({
    identifier: id,
    ticker: tickerOf(id),
    logoUrl: tokenMap[id]?.logoUrl ?? walletMeta(id)?.assets?.svgUrl ?? walletMeta(id)?.assets?.pngUrl ?? null,
    priceUsd: tokenMap[id]?.priceUsd ?? null,
  }));
  /** Mirrors fund(): whitelisted always; anything once the farm exists (first stream created). */
  const canFundWith = (id: string) => whitelist.includes(id) || farmExists;
  const rewardDisabledReason = (tok: RewardOption) =>
    canFundWith(tok.identifier) ? null : t("farms_fund_reason_not_allowed");
  const rewardSections = [
    { label: t("farms_fund_group_allowed"), ids: whitelist },
    { label: t("farms_fund_group_wallet"), ids: otherIds },
  ];
  const rewardBalances: Record<string, TokenBalanceInfo> = {};
  for (const opt of rewardOptions) {
    const amount = new BigNumber(balanceOf(opt.identifier)).shiftedBy(-decimalsOf(opt.identifier));
    if (amount.gt(0)) {
      const price = opt.priceUsd != null ? parseFloat(opt.priceUsd) : null;
      rewardBalances[opt.identifier] = { amount: amount.toNumber(), usd: price != null ? amount.toNumber() * price : null };
    }
  }
  const [reward, setReward] = React.useState<RewardOption | null>(null);

  React.useEffect(() => {
    setMinFundRaw("0");
    if (!reward) return;
    if (minFundByToken) return setMinFundRaw(minFundByToken[reward.identifier] ?? "0");
    if (!farmsAddress || !networkApiAddress || !chainId) return;
    fetchMinFundAmount(networkApiAddress, chainId, farmsAddress, reward.identifier).then(setMinFundRaw).catch(() => {});
  }, [reward, minFundByToken, farmsAddress, networkApiAddress, chainId]);
  const existing = reward && streams ? streams.find((s) => s.rewardedToken === reward.identifier) ?? null : null;
  const isNew = !!reward && streams != null && !existing;
  const isWhitelisted = !!reward && whitelist.includes(reward.identifier);
  // Fee actually charged by fund(): 0 for a whitelisted token, else the stream's own fee.
  // A new non-whitelisted stream is created with the current global fee.
  const feeBps = isWhitelisted ? 0 : (existing?.feePercentage ?? config?.feePercent ?? 0);
  const windowMs = existing ? existing.msToMax : (config?.defaultMsToMax ?? 0);

  /* ---- Amount ---- */
  const [amount, setAmount] = React.useState("");
  const rewardDec = reward ? decimalsOf(reward.identifier) : 18;
  const amountRaw = (() => {
    if (!reward || !amount || Number(amount) <= 0) return null;
    try {
      return new BigNumber(amount).shiftedBy(rewardDec).integerValue(BigNumber.ROUND_DOWN);
    } catch {
      return null;
    }
  })();
  const walletRaw = reward ? balanceOf(reward.identifier) : "0";
  // Same integer math as fund(): fee = amount * fee_percentage / 10000.
  const feeRaw = amountRaw ? amountRaw.multipliedBy(feeBps).dividedToIntegerBy(MAX_PERCENTAGE) : null;
  const netRaw = amountRaw && feeRaw ? amountRaw.minus(feeRaw) : null;

  /* ---- APR: current stream vs after this deposit ----
     Only meaningful once LP is staked (APR = yearly reward value / staked
     value). Same formula as the Farms tab: the stream pays ≈ balance/msToMax
     per ms, i.e. balance × min(1, year/msToMax) per year, at today's pace. */
  const YEAR_MS = 365 * 24 * 3600 * 1000;
  const totalStakedRaw = stakedToken ? farmTotalStaked[stakedToken] ?? "0" : "0";
  const stakedPriceUsd = (() => {
    if (!stakedToken) return null;
    const lpPrice = poolByLp[stakedToken]?.lpTokenPriceUsd;
    if (lpPrice) return parseFloat(lpPrice);
    const p = tokenMap[stakedToken]?.priceUsd;
    return p != null ? parseFloat(p) : null;
  })();
  const rewardPriceUsd = reward?.priceUsd != null ? parseFloat(reward.priceUsd) : null;
  const stakedUsd =
    stakedPriceUsd != null && stakedToken
      ? new BigNumber(totalStakedRaw).shiftedBy(-decimalsOf(stakedToken)).toNumber() * stakedPriceUsd
      : null;
  const aprFor = (balanceRaw: BigNumber.Value): number | null => {
    if (!reward || rewardPriceUsd == null || !stakedUsd || stakedUsd <= 0 || !windowMs) return null;
    const yearly = new BigNumber(balanceRaw).shiftedBy(-decimalsOf(reward.identifier)).toNumber() * Math.min(1, YEAR_MS / windowMs);
    return ((yearly * rewardPriceUsd) / stakedUsd) * 100;
  };
  const hasStakers = new BigNumber(totalStakedRaw).gt(0);
  const currentApr = existing && hasStakers ? aprFor(existing.balance) : null;
  const projectedApr =
    hasStakers && netRaw && netRaw.gt(0) ? aprFor(new BigNumber(existing?.balance ?? "0").plus(netRaw)) : null;
  const streamApr = (x: FarmRewardStream): number | null => {
    if (x.aprPct !== undefined) return x.aprPct; // GET /farms
    const price = tokenMap[x.rewardedToken]?.priceUsd;
    if (price == null || !stakedUsd || stakedUsd <= 0 || !x.msToMax) return null;
    const yearly = new BigNumber(x.balance).shiftedBy(-decimalsOf(x.rewardedToken)).toNumber() * Math.min(1, YEAR_MS / x.msToMax);
    return ((yearly * parseFloat(price)) / stakedUsd) * 100;
  };
  const fmtApr = (v: number) => `${v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2)} %`;
  const insufficient = !!amountRaw && amountRaw.gt(walletRaw);
  /* Minimum deposit, as enforced by fund():
     - creating the FARM (first deposit on this staked token): the whitelisted
       token's own minFundAmount;
     - opening a NEW non-whitelisted stream on an existing farm: the global
       divisibility floor (default 1_000_000 raw units);
     - anything else (top-ups, new whitelisted stream on an existing farm): none. */
  const NON_WL_FLOOR_DEFAULT = "1000000"; // DEFAULT_MIN_FUND_AMOUNT_NON_WHITELISTED
  const minKind: "farm" | "nonWlStream" | null = !reward || streams == null
    ? null
    : !farmExists
      ? "farm"
      : isNew && !isWhitelisted
        ? "nonWlStream"
        : null;
  const minRequiredRaw =
    minKind === "farm" ? minFundRaw : minKind === "nonWlStream" ? (config?.minFundAmountNonWhitelisted ?? NON_WL_FLOOR_DEFAULT) : "0";
  const belowMin = !!minKind && !!amountRaw && amountRaw.lt(minRequiredRaw);
  // Raw floors can be far below 1e-6 of a token (18 decimals): show every significant digit.
  const fmtExact = (raw: BigNumber.Value, id: string) => new BigNumber(raw).shiftedBy(-decimalsOf(id)).toFixed();
  const feeTooSmall = !isWhitelisted && !!amountRaw && feeBps > 0 && !!feeRaw && feeRaw.isZero();
  // Defensive: creating the farm (first stream) needs a whitelisted token.
  const cannotOpen = !!reward && streams != null && !farmExists && !isWhitelisted;
  const fmt = (raw: BigNumber | string, id: string) =>
    new BigNumber(raw).shiftedBy(-decimalsOf(id)).toFormat(Math.min(6, decimalsOf(id)), BigNumber.ROUND_DOWN);

  const blocker = !farmsAddress
    ? t("farms_not_configured")
    : !stakedValid
      ? t("farms_fund_pick_staked")
      : !reward
        ? t("farms_fund_pick_reward")
        : cannotOpen
          ? t("farms_fund_not_whitelisted")
          : existing?.paused
          ? t("farms_fund_paused")
          : !amountRaw
            ? t("dca_btn_enter_amount")
            : insufficient
              ? t("btn_insufficient")
              : belowMin
                ? t("farms_fund_below_min", { amount: `${fmtExact(minRequiredRaw, reward.identifier)} ${reward.ticker}` })
                : feeTooSmall
                  ? t("farms_fund_too_small")
                  : null;

  /* ---- Submit ---- */
  const [sending, setSending] = React.useState(false);
  const [txError, setTxError] = React.useState<string | null>(null);
  /* ---- Streams per participant (per-farm cap) + paid unlock ----
     A participant can follow at most N streams of a farm at once (default 2).
     unlockExtraFlux(staked) — anyone, paid extraFluxPrice in extraFluxToken —
     raises THIS farm's cap by +1 for every staker, up to the global ceiling. */
  const currentCap = stakedToken ? farmMaxActive[stakedToken] ?? config?.defaultMaxActive ?? null : null;
  const ceiling = config?.maxActiveCeiling ?? null;
  const farmStreamCount = (streams ?? []).filter((s) => !s.paused).length;
  const unlockToken = config?.extraFluxToken || null;
  const unlockPriceRaw = config?.extraFluxPrice ?? null;
  const unlockAtCeiling = currentCap != null && ceiling != null && currentCap >= ceiling;
  const unlockInsufficient = !!unlockToken && !!unlockPriceRaw && new BigNumber(balanceOf(unlockToken)).lt(unlockPriceRaw);
  const [unlocking, setUnlocking] = React.useState(false);
  const [confirmUnlock, setConfirmUnlock] = React.useState(false);
  const unlockExtra = async () => {
    if (!address || !chainId || !farmsAddress || !stakedToken || !unlockToken || !unlockPriceRaw) return;
    setConfirmUnlock(false);
    setTxError(null);
    setUnlocking(true);
    try {
      const data = ["ESDTTransfer", strToHex(unlockToken), bigToHex(BigInt(unlockPriceRaw)), strToHex("unlockExtraFlux"), strToHex(stakedToken)].join("@");
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [
          new Transaction({
            value: 0n,
            data: new TextEncoder().encode(data),
            receiver: new Address(farmsAddress),
            sender: new Address(address),
            gasLimit: BigInt(
              await estimateGasLimit(networkApiAddress, { sender: address, receiver: farmsAddress, data, chainId }, UNLOCK_GAS_LIMIT),
            ),
            gasPrice: BigInt(GAS_PRICE),
            chainID: chainId,
            version: 1,
          }),
        ],
        transactionsDisplayInfo: {
          processingMessage: t("farms_unlock_processing"),
          successMessage: t("farms_unlock_success"),
          errorMessage: t("farms_tx_error"),
        },
      });
      if (currentCap != null) setFarmMaxActive((m) => ({ ...m, [stakedToken]: currentCap + 1 }));
    } catch (err: any) {
      console.error("[FarmsRewards] unlock error:", err);
      setTxError(err?.message ?? t("farms_tx_error"));
    } finally {
      setUnlocking(false);
    }
  };

  const submit = async () => {
    if (blocker || !address || !chainId || !farmsAddress || !reward || !amountRaw || !stakedToken) return;
    setTxError(null);
    setSending(true);
    try {
      const data = ["ESDTTransfer", strToHex(reward.identifier), bigToHex(BigInt(amountRaw.toFixed(0))), strToHex("fund"), strToHex(stakedToken)].join("@");
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [
          new Transaction({
            value: 0n,
            data: new TextEncoder().encode(data),
            receiver: new Address(farmsAddress),
            sender: new Address(address),
            gasLimit: BigInt(
              await estimateGasLimit(networkApiAddress, { sender: address, receiver: farmsAddress, data, chainId }, FUND_GAS_LIMIT),
            ),
            gasPrice: BigInt(GAS_PRICE),
            chainID: chainId,
            version: 1,
          }),
        ],
        transactionsDisplayInfo: {
          processingMessage: t("farms_fund_processing"),
          successMessage: t("farms_fund_success"),
          errorMessage: t("farms_tx_error"),
        },
      });
      setAmount("");
      // Right after our own fund(): read the stream on-chain once — the backend
      // snapshot is cached (~30s) and would still show the pre-deposit balance.
      fetchFarmStreams(networkApiAddress!, chainId, farmsAddress, stakedToken).then(setStreams).catch(() => {});
    } catch (err: any) {
      console.error("[FarmsRewards] fund error:", err);
      setTxError(err?.message ?? t("farms_tx_error"));
    } finally {
      setSending(false);
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="dvx:flex dvx:justify-between dvx:gap-3 dvx:text-xs">
      <span className="dvx:text-gray-400">{label}</span>
      <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:text-right">{value}</span>
    </div>
  );
  const inner = "dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4";
  const label = "dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2";

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
            <SectionTabs active="farms" />
            <button
              type="button"
              onClick={() => goTo("farms")}
              className="dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-amber-500"
            >
              ← {t("farms_fund_back")}
            </button>
          </div>
        }
        description={t("farms_fund_desc")}
      >
        <div className="dvx:space-y-2 dvx:mt-4">
          {/* Farm (staked token) */}
          <div className={inner}>
            <p className={label}>{t("farms_fund_staked_label")}</p>
            <TokenSelect
              value={stakedOption}
              onChange={(o) => {
                setStakedChoice(o?.identifier ?? "");
                setReward(null);
                setAmount("");
              }}
              tokens={stakedOptions}
              sections={stakedSections}
              placeholder={t("farms_fund_pick_staked")}
              loading={dinovoxPools.length === 0}
            />
          </div>

          {/* Reward token + amount */}
          <div className={inner}>
            <p className={label}>{t("farms_fund_reward_label")}</p>
            {reward && (
              <div className="dvx:flex dvx:justify-end dvx:mb-2">
                <button
                  type="button"
                  onClick={() => setAmount(new BigNumber(walletRaw).shiftedBy(-rewardDec).toFixed())}
                  className="dvx:text-[10px] dvx:font-semibold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600"
                >
                  {t("balance")} : {fmt(walletRaw, reward.identifier)} · MAX
                </button>
              </div>
            )}
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <TokenSelect
                value={reward}
                onChange={(r) => {
                  setReward(r);
                  setAmount("");
                }}
                tokens={rewardOptions}
                balances={rewardBalances}
                sections={rewardSections}
                disabledReason={rewardDisabledReason}
                loading={!config}
              />
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:border-amber-400 dvx:dark:border-amber-500 dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
              />
            </div>
            {config && config.whitelistedRewardTokens.length === 0 && (
              <p className="dvx:mt-2 dvx:text-[10px] dvx:text-orange-500">{t("farms_fund_no_whitelist")}</p>
            )}
          </div>

          {/* Summary */}
          {reward && stakedValid && streams && (
            <div className={`${inner} dvx:space-y-1.5`}>
              <p className="dvx:text-xs dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                {isNew ? t("farms_fund_new_stream") : t("farms_fund_topup")}
              </p>
              {existing && row(t("farms_fund_current_balance"), `${fmt(existing.balance, reward.identifier)} ${reward.ticker}`)}
              {minKind && new BigNumber(minRequiredRaw).gt(0) &&
                row(
                  t(minKind === "farm" ? "farms_fund_min_open" : "farms_fund_min_non_wl"),
                  `${fmtExact(minRequiredRaw, reward.identifier)} ${reward.ticker}`,
                )}
              {row(
                t("farms_fund_fee"),
                isWhitelisted
                  ? t("farms_fund_fee_none")
                  : `${(feeBps / 100).toFixed(2)} %${feeRaw && feeRaw.gt(0) ? ` · ${fmt(feeRaw, reward.identifier)} ${reward.ticker}` : ""}`,
              )}
              {netRaw && row(t("farms_fund_net"), `${fmt(netRaw, reward.identifier)} ${reward.ticker}`)}
              {windowMs > 0 && row(t("farms_fund_window"), t("farms_fund_window_value", { days: Math.round(windowMs / 86_400_000) }))}
              {hasStakers && (existing || projectedApr != null) && (
                <div className="dvx:pt-1.5 dvx:mt-1.5 dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333] dvx:space-y-1.5">
                  {existing &&
                    row(t("farms_fund_apr_current", { token: reward.ticker }), currentApr != null ? fmtApr(currentApr) : "—")}
                  {projectedApr != null &&
                    row(
                      t("farms_fund_apr_projected"),
                      <span className="dvx:text-green-600 dvx:dark:text-green-400">
                        {fmtApr(projectedApr)}
                        {currentApr != null && projectedApr > currentApr && (
                          <span className="dvx:text-gray-400 dvx:font-normal"> (+{fmtApr(projectedApr - currentApr)})</span>
                        )}
                      </span>,
                    )}
                  <p className="dvx:text-[10px] dvx:text-gray-400 dvx:leading-relaxed">
                    {t("farms_fund_apr_hint", { tvl: stakedUsd != null ? `$${stakedUsd.toFixed(2)}` : "—" })}
                  </p>
                </div>
              )}
              <p className="dvx:pt-1 dvx:text-[10px] dvx:text-gray-400 dvx:leading-relaxed">{t("farms_fund_hint")}</p>
              <p className="dvx:text-[10px] dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:leading-relaxed">
                {t("farms_fund_topup_hint")}
              </p>
            </div>
          )}

          {/* Streams per participant: visual slots + paid unlock */}
          {stakedValid && streams && currentCap != null && (() => {
            const slots = Math.max(ceiling ?? currentCap, currentCap);
            const liveStreams = (streams ?? []).filter((x) => !x.paused);
            const canUnlock = farmExists && !!unlockToken && !!unlockPriceRaw && !unlockAtCeiling;
            const priceLabel = unlockToken && unlockPriceRaw ? `${fmt(unlockPriceRaw, unlockToken)} ${tickerOf(unlockToken)}` : "";
            return (
              <div className={`${inner} dvx:space-y-3`}>
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
                  <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">{t("farms_cap_title")}</p>
                  <span className="dvx:text-[11px] dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                    {t("farms_cap_slots", { n: currentCap, ceiling: slots })}
                  </span>
                </div>

                {/* One tile per slot: unlocked (🌾) then locked (🔒); the first locked one unlocks on click. */}
                <div className="dvx:flex dvx:gap-2">
                  {Array.from({ length: slots }, (_, i) => {
                    const unlocked = i < currentCap;
                    const isNext = i === currentCap && canUnlock;
                    const base =
                      "dvx:flex-1 dvx:aspect-square dvx:max-w-[56px] dvx:rounded-xl dvx:flex dvx:flex-col dvx:items-center dvx:justify-center dvx:gap-0.5 dvx:border-2 dvx:transition-colors";
                    if (unlocked)
                      return (
                        <div
                          key={i}
                          title={t("farms_cap_slot_open")}
                          className={`${base} dvx:border-amber-400`}
                          // Inline tint: same faint gold in both themes, immune to host CSS.
                          style={{ backgroundColor: "rgba(245, 158, 11, 0.14)" }}
                        >
                          <span className="dvx:text-lg" aria-hidden>🌾</span>
                        </div>
                      );
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!isNext || unlocking || unlockInsufficient || !address}
                        onClick={isNext ? () => setConfirmUnlock(true) : undefined}
                        style={isNext ? { backgroundColor: "rgba(245, 158, 11, 0.06)" } : undefined}
                        title={isNext ? t("farms_cap_unlock", { price: priceLabel }) : t("farms_cap_slot_locked")}
                        className={`${base} ${
                          isNext
                            ? "dvx:border-dashed dvx:border-amber-400 dvx:cursor-pointer dvx:hover:scale-105 dvx:disabled:cursor-not-allowed dvx:disabled:opacity-60"
                            : "dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:opacity-60 dvx:cursor-default"
                        }`}
                      >
                        {isNext && unlocking ? (
                          <span className="dvx:w-4 dvx:h-4 dvx:border-2 dvx:border-amber-500 dvx:border-t-transparent dvx:rounded-full dvx:animate-spin" />
                        ) : isNext ? (
                          <>
                            <LockOpen className="dvx:w-4 dvx:h-4 dvx:text-amber-500" />
                            <span className="dvx:text-[9px] dvx:font-bold dvx:text-amber-500">+1</span>
                          </>
                        ) : (
                          <Lock className="dvx:w-4 dvx:h-4 dvx:text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Streams currently live on the farm: remaining balance + APR, with the
                    deposit being prepared folded in (existing stream: "+ amount / + APR";
                    new stream: a simulated row). */}
                {(() => {
                  const addRaw = reward && netRaw && netRaw.gt(0) ? netRaw : null;
                  type Row = { token: string; balance: string; aprNow: number | null; sim: boolean };
                  const rows: Row[] = liveStreams.map((x) => ({ token: x.rewardedToken, balance: x.balance, aprNow: streamApr(x), sim: false }));
                  const selectedListed = !!reward && rows.some((r) => r.token === reward.identifier);
                  if (reward && addRaw && !selectedListed && farmExists)
                    rows.push({ token: reward.identifier, balance: "0", aprNow: null, sim: true });
                  if (!farmExists || rows.length === 0) return null;
                  // APR gained by the deposit on the selected row (projected - current).
                  const aprGain = projectedApr != null ? projectedApr - (currentApr ?? 0) : null;
                  const rankApr = (r: Row) => (r.token === reward?.identifier && projectedApr != null ? projectedApr : (r.aprNow ?? -1));
                  const liveCount = liveStreams.length;
                  return (
                    <div>
                      <p className="dvx:text-[10px] dvx:text-gray-400 dvx:mb-1">
                        {t(liveCount === 1 ? "farms_cap_streams_label_one" : "farms_cap_streams_label", { count: liveCount })}
                      </p>
                      <table className="dvx:w-full dvx:text-xs">
                        <thead>
                          <tr className="dvx:text-[10px] dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                            <th className="dvx:text-left dvx:font-semibold dvx:py-1 dvx:pl-2">{t("farms_table_token")}</th>
                            <th className="dvx:text-right dvx:font-semibold dvx:py-1">{t("farms_table_remaining")}</th>
                            <th className="dvx:text-right dvx:font-semibold dvx:py-1">APR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...rows]
                            .sort((a, b) => rankApr(b) - rankApr(a))
                            .map((r) => {
                              const price = tokenMap[r.token]?.priceUsd;
                              const isSelected = reward?.identifier === r.token;
                              const add = isSelected ? addRaw : null;
                              const totalH = new BigNumber(r.balance).plus(add ?? 0).shiftedBy(-decimalsOf(r.token));
                              return (
                                <tr
                                  key={r.token}
                                  className="dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333]"
                                  // Selected stream: faint gold wash + gold left edge, inline so it
                                  // reads the same in both themes (text keeps its normal colors).
                                  style={
                                    isSelected
                                      ? { backgroundColor: "rgba(245, 158, 11, 0.12)", boxShadow: "inset 3px 0 0 rgba(245, 158, 11, 0.9)" }
                                      : undefined
                                  }
                                >
                                  <td className="dvx:py-1.5 dvx:pl-2">
                                    <span className="dvx:inline-flex dvx:items-center dvx:gap-1.5 dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                                      <TokenLogo
                                        url={
                                          tokenMap[r.token]?.logoUrl ??
                                          (streams ?? []).find((x) => x.rewardedToken === r.token)?.logoUrl ??
                                          (reward?.identifier === r.token ? reward.logoUrl : null) ??
                                          null
                                        }
                                        ticker={tickerOf(r.token)}
                                      />
                                      {tickerOf(r.token)}
                                      {r.sim && (
                                        <span className="dvx:text-[9px] dvx:font-bold dvx:uppercase dvx:text-amber-600 dvx:dark:text-amber-400">
                                          {t("farms_table_new")}
                                        </span>
                                      )}
                                      {!whitelist.includes(r.token) && (
                                        <span className="dvx:text-[9px] dvx:font-medium dvx:text-gray-400">{t("farms_table_not_whitelisted")}</span>
                                      )}
                                    </span>
                                  </td>
                                  <td className="dvx:py-1.5 dvx:text-right dvx:text-gray-700 dvx:dark:text-gray-200">
                                    {r.sim ? (
                                      <span className="dvx:text-amber-600 dvx:dark:text-amber-400">+{fmt(add!, r.token)}</span>
                                    ) : (
                                      <>
                                        {fmt(r.balance, r.token)}
                                        {add && <span className="dvx:text-amber-600 dvx:dark:text-amber-400"> + {fmt(add, r.token)}</span>}
                                        {add && (
                                          <span className="dvx:block dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
                                            = {fmt(new BigNumber(r.balance).plus(add), r.token)}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {price != null && (
                                      <span className="dvx:block dvx:text-[10px] dvx:text-gray-400">
                                        ${(totalH.toNumber() * parseFloat(price)).toFixed(2)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="dvx:py-1.5 dvx:text-right dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400 dvx:whitespace-nowrap">
                                    {r.sim
                                      ? projectedApr != null ? `+${fmtApr(projectedApr)}` : "—"
                                      : <>
                                          {r.aprNow != null ? fmtApr(r.aprNow) : "—"}
                                          {isSelected && aprGain != null && aprGain > 0 && (
                                            <>
                                              <span className="dvx:text-amber-600 dvx:dark:text-amber-400"> + {fmtApr(aprGain)}</span>
                                              {projectedApr != null && (
                                                <span className="dvx:block dvx:text-sm dvx:font-black">= {fmtApr(projectedApr)}</span>
                                              )}
                                            </>
                                          )}
                                        </>}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      {rows.length > currentCap && (
                        <p className="dvx:mt-1 dvx:text-[10px] dvx:font-semibold dvx:text-orange-500">
                          {t("farms_cap_more_streams_short", { n: currentCap })}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {confirmUnlock && (
                  /* Confirmation modal — explains what the paid unlock does before signing. */
                  <div
                    className="dvx:fixed dvx:inset-0 dvx:z-50 dvx:flex dvx:items-center dvx:justify-center dvx:p-4"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
                    onClick={() => setConfirmUnlock(false)}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="dvx:w-full dvx:max-w-sm dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-[#ffffff] dvx:dark:bg-[#1e1e1e] dvx:p-5 dvx:shadow-xl dvx:space-y-3"
                    >
                      <div className="dvx:flex dvx:items-center dvx:gap-2">
                        <LockOpen className="dvx:w-5 dvx:h-5 dvx:text-amber-500" />
                        <p className="dvx:text-base dvx:font-black dvx:text-gray-900 dvx:dark:text-white">{t("farms_unlock_modal_title")}</p>
                      </div>
                      <p className="dvx:text-sm dvx:text-gray-600 dvx:dark:text-gray-300">
                        {t("farms_unlock_modal_body", { farm: stakedToken ? stakedLabel(stakedToken) : "", from: currentCap, to: currentCap + 1 })}
                      </p>
                      <ul className="dvx:text-xs dvx:text-gray-500 dvx:dark:text-gray-400 dvx:space-y-1 dvx:list-disc dvx:pl-4">
                        <li>{t("farms_unlock_modal_everyone")}</li>
                        <li>{t("farms_unlock_modal_final")}</li>
                        <li>{t("farms_unlock_modal_ceiling", { ceiling: slots })}</li>
                      </ul>
                      <div className="dvx:flex dvx:justify-between dvx:items-center dvx:rounded-xl dvx:bg-gray-50 dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2 dvx:text-sm">
                        <span className="dvx:text-gray-500 dvx:dark:text-gray-400">{t("farms_unlock_modal_price")}</span>
                        <span className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">{priceLabel}</span>
                      </div>
                      <div className="dvx:flex dvx:gap-2 dvx:pt-1">
                        <button
                          type="button"
                          onClick={() => setConfirmUnlock(false)}
                          className="dvx:flex-1 dvx:py-2 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:text-sm dvx:font-semibold dvx:text-gray-600 dvx:dark:text-gray-300 dvx:bg-transparent"
                        >
                          {t("farms_unlock_modal_cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={unlockExtra}
                          className="dinoButton orange dvx:flex-1 dvx:text-sm"
                          style={{ minHeight: "36px" }}
                        >
                          {t("farms_unlock_modal_confirm")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <p className="dvx:text-[10px] dvx:text-gray-400 dvx:leading-relaxed">
                  {farmExists ? t("farms_cap_hint") : t("farms_cap_new_farm", { n: currentCap, ceiling: slots })}
                  {canUnlock && priceLabel && <> {t("farms_cap_price", { price: priceLabel })}</>}
                  {canUnlock && unlockInsufficient && (
                    <span className="dvx:text-orange-500"> {t("farms_cap_insufficient")}</span>
                  )}
                </p>
              </div>
            );
          })()}

          {txError && (
            <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
              {txError}
            </div>
          )}

          <button
            onClick={!address ? onConnect : submit}
            disabled={!address ? !onConnect : !!blocker || sending}
            style={{ minHeight: "36px" }}
            className={`dinoButton orange dvx:w-full dvx:text-base ${address ? "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed" : ""}`}
          >
            {!address ? t("btn_connect") : sending ? t("dca_btn_signing") : (blocker ?? t("farms_fund_submit"))}
          </button>
        </div>
      </Card>
    </div>
  );
};
