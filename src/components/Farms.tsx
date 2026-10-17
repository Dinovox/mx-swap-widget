import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Info, Lock } from "lucide-react";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { Card } from "../ui/Card";
import { SectionTabs } from "../ui/NavTabs";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useSwapConfig } from "../context/SwapConfigContext";
import { useGoTo } from "../context/SwapViewContext";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { fetchAllPools } from "../helpers/fetchAllPools";
import {
  fetchFarms,
  fetchFarmUserPosition,
  fetchFarmPositionToken,
  yearlyEmissionRaw,
  type Farm,
  type FarmUserPosition,
} from "../helpers/farms";
import { fetchFarmsApi, fetchFarmsConfigApi, fetchFarmPositionsApi, pendingRewardRaw, type FarmsSortBy } from "../helpers/farmsApi";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import type { LiquidityPool, TokenMeta } from "../types";

// No devnet/mainnet measurement yet (contract not deployed at the time of
// writing) — generous defaults, same "measure later, don't underestimate now"
// posture as the DCA limits before they were measured.
// Devnet measurements (unused gas is NOT refunded — "too much gas provided"
// charges the full limit, so keep limits close to real usage):
//   stake (0 active stream) 6.36M · subscribeReward 4.52M · fund 5.72M.
// stake / unstake / claimAllRewards settle EVERY active stream (one reward
// transfer each), so their limit grows with the user's active streams.
const STAKE_GAS_BASE = 9_000_000; // + position MetaESDT mint/transfer
const UNSTAKE_GAS_BASE = 9_000_000; // + position MetaESDT burn + LP refund
const GAS_PER_ACTIVE_STREAM = 2_500_000; // settle + reward transfer, per enrolled stream (not measured yet)
const CLAIM_GAS_LIMIT = 8_000_000; // one stream settle + transfer (not measured yet)
const SUBSCRIBE_GAS_LIMIT = 7_000_000; // measured 4.52M
const CLAIM_ALL_GAS_BASE = 5_000_000;
const UNSUBSCRIBE_GAS_LIMIT = 8_000_000; // settles one stream then drops it (not measured yet)
const withStreams = (base: number, activeStreams: number) => base + GAS_PER_ACTIVE_STREAM * activeStreams;

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

function formatAmount(bn: BigNumber): string {
  if (bn.isZero()) return "0";
  if (bn.gte(1_000_000)) return bn.toFormat(0);
  if (bn.gte(1000)) return bn.toFormat(2);
  if (bn.gte(1)) return bn.toFormat(4);
  return bn.precision(4).toFixed();
}

/** Multi-reward LP farms (swapv2/farms), read on-chain. */
export const Farms = () => {
  const {
    apiUrl,
    farmsAddress,
    address,
    networkApiAddress,
    chainId,
    onConnect,
    onSignTransactions,
  } = useSwapConfig();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const goTo = useGoTo();

  const [farms, setFarms] = React.useState<Farm[] | null>(null);
  // Server-side sort (desc, nulls last) — TVL by default, like the backend.
  const [sortBy, setSortBy] = React.useState<FarmsSortBy>("tvlUsd");
  // ?pool=<address>: opened from a pool's "Farms" badge — show only that pool's farm.
  const [searchParams] = useWidgetSearchParams();
  const [poolFilter, setPoolFilter] = React.useState<string | null>(() => searchParams.get("pool"));
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [tokenMap, setTokenMap] = React.useState<Record<string, TokenMeta>>({});
  const [poolByLp, setPoolByLp] = React.useState<Record<string, LiquidityPool>>({});

  // Position MetaESDT collection (needed to unstake) — from /farms/config.
  const [farmTokenId, setFarmTokenId] = React.useState<string | null>(null);
  // Global ceiling of streams per participant (locked slots shown up to it).
  const [maxCeiling, setMaxCeiling] = React.useState<number | null>(null);

  // Backend first (GET /farms + /farms/config: zero VM query from the
  // browser); on-chain views only as a fallback when a route fails.
  React.useEffect(() => {
    if (!farmsAddress) return;
    setError(null);
    const onChain = () => {
      if (!networkApiAddress || !chainId) return;
      fetchFarms(networkApiAddress, chainId, farmsAddress)
        .then((list) => setFarms(list))
        .catch((e) => {
          console.error("[Farms] fetchFarms", e);
          setError(t("farms_load_error"));
          setFarms([]);
        });
    };
    Promise.all([fetchFarmsApi(apiUrl, { sortBy, sortDir: "desc", ...(poolFilter ? { pool: poolFilter } : {}) }), fetchFarmsConfigApi(apiUrl)])
      .then(([list, cfg]) => {
        setFarms(list);
        setFarmTokenId(cfg.farmTokenId || null);
        setMaxCeiling(cfg.maxActiveRewardsPerPositionCeiling ?? null);
      })
      .catch((e) => {
        console.warn("[Farms] backend farms routes unavailable, falling back to on-chain reads", e);
        onChain();
      });
  }, [apiUrl, farmsAddress, networkApiAddress, chainId, reloadKey, sortBy, poolFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live clock for pending rewards (recomputed client-side from checkpoints).
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Token metadata (tickers/decimals/prices) + LP token → pool, so a staked LP
  // token reads as its pair and gets a USD price (lpTokenPriceUsd).
  React.useEffect(() => {
    if (!apiUrl) return;
    axios
      .get(`${apiUrl}/tokens`)
      .then((res) => {
        const map: Record<string, TokenMeta> = {};
        for (const tk of res.data.tokens || []) {
          map[tk.identifier] = {
            identifier: tk.identifier,
            ticker: tk.ticker ?? tk.identifier.split("-")[0],
            decimals: tk.decimals ?? 18,
            priceUsd: tk.priceUsd ?? null,
          };
        }
        setTokenMap(map);
      })
      .catch(() => {});
    // Only DinoVox LPs can be farmed as pairs (labels + LP price).
    fetchAllPools(apiUrl, { dexType: "DinoVox" })
      .then((pools) => {
        const map: Record<string, LiquidityPool> = {};
        for (const p of pools) if (p.lpToken) map[p.lpToken] = p;
        setPoolByLp(map);
      })
      .catch(() => {});
  }, [apiUrl]);

  /* ---- User positions + wallet balances ---- */
  const [positions, setPositions] = React.useState<Record<string, FarmUserPosition>>({});
  // Position MetaESDT balance per staked token. Unstake pays it back, so it —
  // not userStake — is the real unstake ceiling: stakeRewards() grows
  // userStake WITHOUT minting position tokens, so after a compound the wallet
  // holds fewer position tokens than its stake.
  const [positionTokenRaw, setPositionTokenRaw] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (!address || !farms || !farmsAddress || !networkApiAddress || !chainId) {
      setPositions({});
      return;
    }
    let cancelled = false;
    // Backend first: one call for every position (stake, subscriptions,
    // checkpoints, position-token balance). On-chain per-farm reads below
    // only if it fails.
    fetchFarmPositionsApi(apiUrl, address)
      .then((map) => {
        if (cancelled) return;
        setPositions(map);
        setPositionTokenRaw(Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.positionTokenBalance ?? "0"])));
      })
      .catch(() => {
        if (!cancelled) positionsOnChain();
      });
    return () => {
      cancelled = true;
    };

    function positionsOnChain() {
    if (!address || !farms || !farmsAddress || !networkApiAddress || !chainId) return;
    Promise.all(
      farms.map((f) =>
        fetchFarmUserPosition(networkApiAddress, chainId, farmsAddress, address, f.stakedToken)
          .then((pos) => [f.stakedToken, pos] as const)
          .catch(() => null),
      ),
    ).then((entries) => {
      const map: Record<string, FarmUserPosition> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setPositions(map);
    });
    Promise.all(
      farms.map(async (f) => {
        const { farmTokenId, nonce } = await fetchFarmPositionToken(networkApiAddress, chainId, farmsAddress, f.stakedToken);
        if (!farmTokenId || !nonce) return [f.stakedToken, "0"] as const;
        const nonceHex = nonce.toString(16).padStart(2, "0");
        const hex = nonceHex.length % 2 ? `0${nonceHex}` : nonceHex;
        const res = await axios
          .get<{ balance?: string }>(`/accounts/${address}/nfts/${farmTokenId}-${hex}`, { baseURL: networkApiAddress })
          .catch(() => null);
        return [f.stakedToken, res?.data?.balance ?? "0"] as const;
      }),
    )
      .then((entries) => setPositionTokenRaw(Object.fromEntries(entries)))
      .catch(() => setPositionTokenRaw({}));
    }
  }, [apiUrl, address, farms, farmsAddress, networkApiAddress, chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  const walletTokens = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
    refreshKey: reloadKey,
  });
  const walletBalance = (id: string) =>
    ((walletTokens ?? []) as Array<{ identifier?: string; balance?: string }>).find((w) => w.identifier === id)
      ?.balance ?? "0";

  /* ---- Display helpers ---- */
  const decimalsOf = (id: string) => tokenMap[id]?.decimals ?? 18;
  const tickerOf = (id: string) => tokenMap[id]?.ticker ?? id.split("-")[0];
  const human = (raw: string, id: string) => new BigNumber(raw).shiftedBy(-decimalsOf(id));
  const priceOf = (id: string): number | null => {
    const pool = poolByLp[id];
    if (pool?.lpTokenPriceUsd) return parseFloat(pool.lpTokenPriceUsd);
    const p = tokenMap[id]?.priceUsd;
    return p != null ? parseFloat(p) : null;
  };
  const farmLabel = (stakedToken: string) => {
    const pool = poolByLp[stakedToken];
    return pool ? `${tickerOf(pool.tokenA)} / ${tickerOf(pool.tokenB)}` : tickerOf(stakedToken);
  };

  /* ---- Transactions ---- */
  const [busy, setBusy] = React.useState<string | null>(null);
  const [txError, setTxError] = React.useState<string | null>(null);

  // Re-reads after a tx: the signing call returns before the tx is executed,
  // so one immediate refresh usually still sees the old state — re-poll a few
  // times over ~25s to catch the on-chain result.
  const refreshTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  React.useEffect(() => () => refreshTimers.current.forEach(clearTimeout), []);
  const scheduleRefreshes = () => {
    refreshTimers.current.forEach(clearTimeout);
    setReloadKey((k) => k + 1);
    refreshTimers.current = [3000, 8000, 15000, 25000].map((ms) => setTimeout(() => setReloadKey((k) => k + 1), ms));
  };

  const send = async (
    key: string,
    txs: Array<{ data: string; receiver: string; gas: number }>,
    labels: { processing: string; success: string; error: string },
    /** Optimistic local update applied right after signing (overwritten by the next refresh). */
    onSent?: () => void,
  ) => {
    if (!address || !chainId) return;
    setTxError(null);
    setBusy(key);
    try {
      const sender = new Address(address);
      await signAndSendTransactions({
        onSignTransactions,
        transactions: txs.map(
          (tx) =>
            new Transaction({
              value: 0n,
              data: new TextEncoder().encode(tx.data),
              receiver: new Address(tx.receiver),
              sender,
              gasLimit: BigInt(tx.gas),
              gasPrice: BigInt(GAS_PRICE),
              chainID: chainId,
              version: 1,
            }),
        ),
        transactionsDisplayInfo: {
          processingMessage: labels.processing,
          successMessage: labels.success,
          errorMessage: labels.error,
        },
      });
      onSent?.();
      scheduleRefreshes();
    } catch (err: any) {
      console.error("[Farms] tx error:", err);
      setTxError(err?.message ?? t("farms_tx_error"));
    } finally {
      setBusy(null);
    }
  };

  /**
   * stake() takes no argument and enrolls in nothing (subscription is explicit,
   * cf. subscribeReward). Existing position (stake > 0, even with zero
   * subscriptions left — the user may have left them on purpose) → stake only.
   * New position (no stake at all) → stake, then ONE subscribeReward on the
   * best-APR stream — never auto-enroll the others.
   * Same sender + same contract shard: the subscribe executes after the stake
   * (nonce order), which it requires ("Stake before subscribing").
   */
  const stake = (farm: Farm, amountRaw: bigint, bestRewardedToken: string | null) => {
    if (!farmsAddress) return;
    const isNewPosition = new BigNumber(positions[farm.stakedToken]?.stake ?? "0").isZero();
    const txs = [
      {
        data: ["ESDTTransfer", strToHex(farm.stakedToken), bigToHex(amountRaw), strToHex("stake")].join("@"),
        receiver: farmsAddress,
        gas: withStreams(STAKE_GAS_BASE, positions[farm.stakedToken]?.activeRewards.length ?? 0),
      },
      ...(isNewPosition && bestRewardedToken
        ? [
            {
              data: ["subscribeReward", strToHex(farm.stakedToken), strToHex(bestRewardedToken)].join("@"),
              receiver: farmsAddress,
              gas: SUBSCRIBE_GAS_LIMIT,
            },
          ]
        : []),
    ];
    return send(`stake:${farm.stakedToken}`, txs, {
      processing: t("farms_stake_processing"),
      success: t("farms_stake_success"),
      error: t("farms_tx_error"),
    });
  };

  /** Explicit opt-in to one reward stream (requires an existing stake). */
  const subscribe = (farm: Farm, rewardedToken: string) =>
    farmsAddress &&
    send(
      `sub:${farm.stakedToken}:${rewardedToken}`,
      [{ data: ["subscribeReward", strToHex(farm.stakedToken), strToHex(rewardedToken)].join("@"), receiver: farmsAddress, gas: SUBSCRIBE_GAS_LIMIT }],
      { processing: t("farms_subscribe_processing"), success: t("farms_subscribe_success"), error: t("farms_tx_error") },
      () =>
        setPositions((prev) => {
          const pos = prev[farm.stakedToken];
          if (!pos || pos.activeRewards.includes(rewardedToken)) return prev;
          return {
            ...prev,
            [farm.stakedToken]: {
              ...pos,
              activeRewards: [...pos.activeRewards, rewardedToken],
              // Fresh subscription: earns from now (pending recomputed live from it).
              checkpoints: pos.checkpoints ? { ...pos.checkpoints, [rewardedToken]: Date.now() } : pos.checkpoints,
            },
          };
        }),
    );

  /** Unstake = send back position MetaESDT (farm token, this staked token's nonce). Settles every stream. */
  const unstake = async (farm: Farm, amountRaw: bigint) => {
    if (!farmsAddress || !networkApiAddress || !chainId || !address) return;
    let token: { farmTokenId: string; nonce: number };
    if (farmTokenId && farm.positionNonce) {
      token = { farmTokenId, nonce: farm.positionNonce };
    } else {
      try {
        token = await fetchFarmPositionToken(networkApiAddress, chainId, farmsAddress, farm.stakedToken);
      } catch {
        setTxError(t("farms_tx_error"));
        return;
      }
    }
    const data = [
      "ESDTNFTTransfer",
      strToHex(token.farmTokenId),
      bigToHex(BigInt(token.nonce)),
      bigToHex(amountRaw),
      new Address(farmsAddress).toHex(),
      strToHex("unstake"),
      strToHex(farm.stakedToken),
    ].join("@");
    // NFT/MetaESDT transfer convention: receiver = sender, destination is an argument.
    return send(`unstake:${farm.stakedToken}`, [{ data, receiver: address, gas: withStreams(UNSTAKE_GAS_BASE, positions[farm.stakedToken]?.activeRewards.length ?? 0) }], {
      processing: t("farms_unstake_processing"),
      success: t("farms_unstake_success"),
      error: t("farms_tx_error"),
    });
  };

  const claim = (farm: Farm, rewardedToken: string) =>
    farmsAddress &&
    send(
      `claim:${farm.stakedToken}:${rewardedToken}`,
      [{ data: ["claimRewards", strToHex(farm.stakedToken), strToHex(rewardedToken)].join("@"), receiver: farmsAddress, gas: CLAIM_GAS_LIMIT }],
      { processing: t("farms_claim_processing"), success: t("farms_claim_success"), error: t("farms_tx_error") },
    );

  const compound = (farm: Farm) =>
    farmsAddress &&
    send(
      `compound:${farm.stakedToken}`,
      [{ data: ["stakeRewards", strToHex(farm.stakedToken)].join("@"), receiver: farmsAddress, gas: CLAIM_GAS_LIMIT }],
      { processing: t("farms_claim_processing"), success: t("farms_claim_success"), error: t("farms_tx_error") },
    );

  const claimAll = (farm: Farm) =>
    farmsAddress &&
    send(
      `claimAll:${farm.stakedToken}`,
      [{ data: ["claimAllRewards", strToHex(farm.stakedToken)].join("@"), receiver: farmsAddress, gas: withStreams(CLAIM_ALL_GAS_BASE, positions[farm.stakedToken]?.activeRewards.length ?? 0) }],
      { processing: t("farms_claim_processing"), success: t("farms_claim_success"), error: t("farms_tx_error") },
    );

  /** Settle one stream then leave it — frees an enrollment slot; also cleans up an ended stream. */
  const unsubscribe = (farm: Farm, rewardedToken: string) =>
    farmsAddress &&
    send(
      `unsub:${farm.stakedToken}:${rewardedToken}`,
      [{ data: ["unsubscribeReward", strToHex(farm.stakedToken), strToHex(rewardedToken)].join("@"), receiver: farmsAddress, gas: UNSUBSCRIBE_GAS_LIMIT }],
      { processing: t("farms_unsubscribe_processing"), success: t("farms_unsubscribe_success"), error: t("farms_tx_error") },
      () =>
        setPositions((prev) => {
          const pos = prev[farm.stakedToken];
          if (!pos) return prev;
          const { [rewardedToken]: _dropped, ...checkpoints } = pos.checkpoints ?? {};
          return {
            ...prev,
            [farm.stakedToken]: {
              ...pos,
              activeRewards: pos.activeRewards.filter((r) => r !== rewardedToken),
              checkpoints: pos.checkpoints ? checkpoints : pos.checkpoints,
            },
          };
        }),
    );

  // On-chain fallback can't filter server-side: apply ?pool= here (no-op on backend results).
  const visibleFarms = (farms ?? []).filter((f) => !poolFilter || f.pool === poolFilter || poolByLp[f.stakedToken]?.address === poolFilter);
  const poolFilterLabel = (() => {
    const f = visibleFarms[0];
    return f ? farmLabel(f.stakedToken) : "";
  })();

  /* ---------- Render ---------- */
  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
            <SectionTabs active="farms" />
          </div>
        }
        description={t("farms_card_desc")}
      >
        {farmsAddress && (
          <div className="dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-2 dvx:mt-4">
            {poolFilter && (
              <button
                type="button"
                onClick={() => setPoolFilter(null)}
                title={t("farms_filter_clear")}
                className="dvx:inline-flex dvx:items-center dvx:gap-1.5 dvx:px-3 dvx:py-1 dvx:rounded-full dvx:border dvx:border-amber-400 dvx:text-xs dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:bg-transparent"
              >
                🌾 {t("farms_filter_pool", { pair: poolFilterLabel })}
                <span aria-hidden className="dvx:text-gray-400">✕</span>
              </button>
            )}
            <div className="dvx:flex dvx:items-center dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:ml-auto">
              <span className="dvx:px-2 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                {t("pools_sort_label")}
              </span>
              {(["tvlUsd", "farmAprPct", "stakers"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={`dvx:px-3 dvx:py-1 dvx:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all ${
                    sortBy === key
                      ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md"
                      : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
                  }`}
                >
                  {key === "tvlUsd" ? "TVL" : key === "farmAprPct" ? "APR" : t("farms_sort_stakers")}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="dvx:space-y-3 dvx:mt-4">
          {!farmsAddress ? (
            <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-6 dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400">
              {t("farms_not_configured")}
            </div>
          ) : farms == null ? (
            <div className="dvx:flex dvx:justify-center dvx:py-10">
              <div className="dvx:w-6 dvx:h-6 dvx:border-2 dvx:border-amber-500 dvx:border-t-transparent dvx:rounded-full dvx:animate-spin" />
            </div>
          ) : visibleFarms.length === 0 ? (
            <p className="dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400 dvx:py-8">
              {error ?? t("farms_empty")}
            </p>
          ) : (
            visibleFarms.map((farm) => (
              <FarmCard
                key={farm.stakedToken}
                farm={farm}
                label={farmLabel(farm.stakedToken)}
                position={positions[farm.stakedToken]}
                positionTokenRaw={positionTokenRaw[farm.stakedToken] ?? "0"}
                walletRaw={walletBalance(farm.stakedToken)}
                connected={!!address}
                onConnect={onConnect}
                busy={busy}
                human={human}
                tickerOf={tickerOf}
                priceOf={priceOf}
                decimalsOf={decimalsOf}
                onStake={stake}
                onUnstake={unstake}
                onClaim={claim}
                onCompound={compound}
                onClaimAll={claimAll}
                onSubscribe={subscribe}
                onUnsubscribe={unsubscribe}
                maxActive={farm.maxActive ?? null}
                maxCeiling={maxCeiling}
                nowMs={nowMs}
                t={t}
              />
            ))
          )}
          {txError && (
            <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
              {txError}
            </div>
          )}
          {farmsAddress && (
            // Same style as Pools' "Create a new pool": opens the funding form
            // (create a farm, or add rewards to an existing one).
            <button
              type="button"
              onClick={() => goTo("farms-rewards")}
              className="dvx:w-full dvx:py-3 dvx:rounded-xl dvx:border-2 dvx:border-amber-500 dvx:text-amber-500 dvx:font-bold dvx:bg-transparent dvx:hover:bg-amber-50 dvx:dark:hover:bg-amber-900/20 dvx:transition-colors dvx:mt-2"
            >
              {t("farms_create")}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */

type TFn = (key: string, options?: Record<string, unknown>) => string;

function FarmCard({
  farm,
  label,
  position,
  positionTokenRaw,
  walletRaw,
  connected,
  onConnect,
  busy,
  human,
  tickerOf,
  priceOf,
  decimalsOf,
  onStake,
  onUnstake,
  onClaim,
  onCompound,
  onClaimAll,
  onSubscribe,
  onUnsubscribe,
  maxActive,
  maxCeiling,
  nowMs,
  t,
}: {
  farm: Farm;
  label: string;
  position?: FarmUserPosition;
  positionTokenRaw: string;
  walletRaw: string;
  connected: boolean;
  onConnect?: () => void;
  busy: string | null;
  human: (raw: string, id: string) => BigNumber;
  tickerOf: (id: string) => string;
  priceOf: (id: string) => number | null;
  decimalsOf: (id: string) => number;
  onStake: (farm: Farm, amount: bigint, bestRewardedToken: string | null) => void;
  onUnstake: (farm: Farm, amount: bigint) => void;
  onClaim: (farm: Farm, rewardedToken: string) => void;
  onCompound: (farm: Farm) => void;
  onClaimAll: (farm: Farm) => void;
  onSubscribe: (farm: Farm, rewardedToken: string) => void;
  onUnsubscribe: (farm: Farm, rewardedToken: string) => void;
  maxActive: number | null;
  maxCeiling: number | null;
  nowMs: number;
  t: TFn;
}) {
  const [mode, setMode] = React.useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = React.useState("");
  // Exact raw amount chosen via slider / % buttons (the input then only shows a
  // rounded value); cleared as soon as the user types.
  const [pickedRaw, setPickedRaw] = React.useState<bigint | null>(null);

  const staked = farm.stakedToken;
  const totalStakedH = human(farm.totalStaked, staked);
  const stakedPrice = priceOf(staked);
  // Server value (GET /farms) when present, else priced client-side.
  const tvlUsd = farm.tvlUsd !== undefined ? farm.tvlUsd : stakedPrice != null ? totalStakedH.toNumber() * stakedPrice : null;
  const myStakeRaw = position?.stake ?? "0";
  const myStakeH = human(myStakeRaw, staked);
  const hasStake = myStakeH.gt(0);
  const myStakeUsd = stakedPrice != null ? myStakeH.toNumber() * stakedPrice : null;
  const sharePct = hasStake && totalStakedH.gt(0) ? myStakeH.dividedBy(totalStakedH).multipliedBy(100).toNumber() : null;
  const active = new Set(position?.activeRewards ?? []);
  const atCap = maxActive != null && active.size >= maxActive;
  // Enrolled in a stream that no longer exists (ended via endRewardStream):
  // nothing more to earn, only an unsubscribe to free the slot.
  const endedEnrolled = [...active].filter((id) => !farm.streams.some((s) => s.rewardedToken === id));
  // Pending of one stream: live from the checkpoint (backend), else the on-chain snapshot.
  const pendingOf = (rewardedToken: string): string | undefined => {
    const checkpoint = position?.checkpoints?.[rewardedToken];
    const stream = farm.streams.find((x) => x.rewardedToken === rewardedToken);
    if (checkpoint != null && stream && position) {
      return pendingRewardRaw(position.stake, farm.totalStaked, stream.balance, checkpoint, stream.msToMax, nowMs).toString();
    }
    return position?.pending[rewardedToken];
  };
  const claimableCount = [...active].filter((id) => new BigNumber(pendingOf(id) ?? "0").gt(0)).length;
  const liveStreams = farm.streams.filter((s) => !s.paused && new BigNumber(s.balance).gt(0));
  // Stream auto-subscribed on a NEW position: highest yearly USD emission
  // (= highest APR, same TVL denominator); unpriced streams rank last, then
  // the first live stream as a fallback.
  const bestRewardedToken = (() => {
    let best: { id: string; usd: number } | null = null;
    for (const s of liveStreams) {
      const price = priceOf(s.rewardedToken);
      const usd = price != null ? new BigNumber(yearlyEmissionRaw(s)).shiftedBy(-decimalsOf(s.rewardedToken)).toNumber() * price : -1;
      if (!best || usd > best.usd) best = { id: s.rewardedToken, usd };
    }
    return best?.id ?? null;
  })();

  // Unstake ceiling = position tokens actually held (≤ stake, cf. positionTokenRaw).
  const unstakeMaxRaw = BigNumber.min(myStakeRaw, positionTokenRaw).toFixed(0);
  const maxRaw = mode === "stake" ? walletRaw : unstakeMaxRaw;
  // Slider / quick % — on the raw max so 100% is exactly the max (no rounding dust).
  const maxBN = new BigNumber(maxRaw);
  const setPct = (pct: number) => {
    if (maxBN.lte(0)) {
      setPickedRaw(null);
      return setAmount("");
    }
    const raw = pct >= 100 ? maxBN : maxBN.multipliedBy(pct).dividedToIntegerBy(100);
    setPickedRaw(BigInt(raw.toFixed(0)));
    // Display only: 6 decimals max, the exact raw is what gets sent.
    setAmount(raw.isZero() ? "" : human(raw.toFixed(0), staked).decimalPlaces(6, BigNumber.ROUND_DOWN).toFixed());
  };
  // USD counter-value: LP amounts mean nothing across pools (a "unit" of LP is
  // worth wildly different amounts depending on the pair), so always show $.
  const usdOf = (raw: BigNumber.Value) =>
    stakedPrice != null ? human(new BigNumber(raw).toFixed(0), staked).toNumber() * stakedPrice : null;
  const amountRaw = (() => {
    if (pickedRaw != null) return pickedRaw > 0n ? pickedRaw : null;
    if (!amount || Number(amount) <= 0) return null;
    try {
      return BigInt(new BigNumber(amount).shiftedBy(decimalsOf(staked)).toFixed(0, BigNumber.ROUND_DOWN));
    } catch {
      return null;
    }
  })();
  const tooMuch = amountRaw != null && new BigNumber(amountRaw.toString()).gt(maxRaw);
  const canSubmit =
    connected && amountRaw != null && !tooMuch && !busy && (mode === "unstake" ? hasStake : liveStreams.length > 0);

  return (
    <div
      className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
      style={
        hasStake
          ? {
              boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.55)",
              backgroundImage: "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 55%)",
            }
          : undefined
      }
    >
      {/* Title */}
      <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3 dvx:mb-3">
        <div className="dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap dvx:min-w-0">
          <span className="dvx:font-black dvx:text-gray-900 dvx:dark:text-white dvx:text-base">{label}</span>
          {hasStake && myStakeUsd != null && (
            <span className="dvx:text-sm dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">≈ {formatUsd(myStakeUsd)}</span>
          )}
          {sharePct != null && (
            <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400">
              {t("farms_share", { pct: sharePct < 0.01 ? "<0.01" : sharePct.toFixed(2) })}
            </span>
          )}
          {farm.farmAprPct != null && (
            // Server cumulative APR: best `maxActive` streams (what one participant can follow).
            <span
              className="dvx:text-[11px] dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400 dvx:whitespace-nowrap dvx:cursor-help"
              title={t("farms_apr_total_tooltip", { n: maxActive ?? farm.streams.length })}
            >
              APR 🌾 {farm.farmAprPct >= 100 ? Math.round(farm.farmAprPct).toLocaleString("en-US") : farm.farmAprPct.toFixed(2)}%
            </span>
          )}
        </div>
        <span className="dvx:shrink-0 dvx:mt-1 dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:whitespace-nowrap">
          {tvlUsd != null ? `TVL ${formatUsd(tvlUsd)} · ` : ""}
          {t("farms_stakers", { count: farm.stakers })}
        </span>
      </div>

      {/* Reward streams */}
      <div className="dvx:space-y-1.5">
        {farm.streams.map((s) => {
          const rewardPrice = priceOf(s.rewardedToken);
          const balanceH = human(s.balance, s.rewardedToken);
          const yearlyH = new BigNumber(yearlyEmissionRaw(s)).shiftedBy(-decimalsOf(s.rewardedToken));
          const aprPct =
            s.aprPct !== undefined
              ? s.aprPct // server-computed (GET /farms)
              : rewardPrice != null && tvlUsd && tvlUsd > 0
                ? (yearlyH.toNumber() * rewardPrice * 100) / tvlUsd
                : null;
          const pendingRaw = pendingOf(s.rewardedToken);
          const pendingH = pendingRaw ? human(pendingRaw, s.rewardedToken) : null;
          const enrolled = active.has(s.rewardedToken);
          const sameToken = s.rewardedToken === staked;
          return (
            <div
              key={s.rewardedToken}
              className="dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-x-3 dvx:gap-y-1 dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2 dvx:text-xs"
            >
              <span className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">{tickerOf(s.rewardedToken)}</span>
              {aprPct != null && (
                <span
                  className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400 dvx:cursor-help"
                  title={t("farms_apr_tooltip", { days: Math.round(s.msToMax / 86_400_000) })}
                >
                  {t("pools_apr", { pct: aprPct.toFixed(2) })}
                  <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                </span>
              )}
              <span className="dvx:text-[10px] dvx:text-gray-400">
                {t("farms_remaining", { amount: `${formatAmount(balanceH)} ${tickerOf(s.rewardedToken)}` })}
                {rewardPrice != null && ` (${formatUsd(balanceH.toNumber() * rewardPrice)})`}
              </span>
              {s.paused && (
                <span className="dvx:text-[10px] dvx:font-semibold dvx:text-orange-500">{t("farms_paused")}</span>
              )}
              {hasStake && (
                <span className="dvx:ml-auto dvx:flex dvx:items-center dvx:gap-2">
                  {enrolled ? (
                    <>
                      <span className="dvx:text-[10px] dvx:text-gray-400">
                        {t("farms_pending")}{" "}
                        <span className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                          {pendingH ? formatAmount(pendingH) : "0"} {tickerOf(s.rewardedToken)}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={!!busy || !pendingH?.gt(0)}
                        onClick={() => onClaim(farm, s.rewardedToken)}
                        className="dvx:text-[11px] dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:disabled:opacity-40"
                      >
                        {t("farms_claim")}
                      </button>
                      {sameToken && (
                        <button
                          type="button"
                          disabled={!!busy || !pendingH?.gt(0)}
                          onClick={() => onCompound(farm)}
                          className="dvx:text-[11px] dvx:font-bold dvx:text-green-600 dvx:bg-transparent dvx:hover:text-green-700 dvx:disabled:opacity-40"
                        >
                          {t("farms_compound")}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => onUnsubscribe(farm, s.rewardedToken)}
                        title={t("farms_unsubscribe_tooltip")}
                        className="dvx:text-[11px] dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-red-500 dvx:disabled:opacity-40"
                      >
                        {t("farms_unsubscribe")}
                      </button>
                    </>
                  ) : (
                    !s.paused && (
                      // Explicit opt-in (subscribeReward) — claimRewards no longer enrolls.
                      <button
                        type="button"
                        disabled={!!busy || atCap}
                        onClick={() => onSubscribe(farm, s.rewardedToken)}
                        title={atCap ? t("farms_cap_reached", { max: maxActive }) : t("farms_join_tooltip")}
                        className="dvx:text-[11px] dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:disabled:opacity-40"
                      >
                        {t("farms_join")}
                      </button>
                    )
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Streams the user is still enrolled in but that were ended */}
      {endedEnrolled.map((id) => (
        <div
          key={id}
          className="dvx:mt-1.5 dvx:flex dvx:items-center dvx:gap-3 dvx:rounded-xl dvx:border dvx:border-dashed dvx:border-gray-200 dvx:dark:border-[#3a3a3a] dvx:px-3 dvx:py-2 dvx:text-xs"
        >
          <span className="dvx:font-bold dvx:text-gray-400">{tickerOf(id)}</span>
          <span className="dvx:text-[10px] dvx:text-gray-400">{t("farms_stream_ended")}</span>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => onUnsubscribe(farm, id)}
            className="dvx:ml-auto dvx:text-[11px] dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-red-500 dvx:disabled:opacity-40"
          >
            {t("farms_unsubscribe")}
          </button>
        </div>
      ))}

      {/* Stream slots: followed (🌾) · free · locked (🔒) up to the global ceiling */}
      {maxActive != null && (
        <div className="dvx:mt-2 dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap" title={t("farms_slots_tooltip")}>
          <div className="dvx:flex dvx:gap-1">
            {Array.from({ length: Math.max(maxCeiling ?? maxActive, maxActive) }, (_, i) => {
              const followed = hasStake && i < active.size;
              const open = i < maxActive;
              return (
                <span
                  key={i}
                  className="dvx:flex dvx:items-center dvx:justify-center dvx:text-[11px]"
                  // Inline (not utility classes): renders even with a stale host stylesheet.
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: `1px solid ${open ? "rgba(245, 158, 11, 0.8)" : "rgba(156, 163, 175, 0.35)"}`,
                    opacity: open ? 1 : 0.6,
                    backgroundColor: followed ? "rgba(245, 158, 11, 0.18)" : "transparent",
                  }}
                >
                  {followed ? <span aria-hidden>🌾</span> : !open ? <Lock className="dvx:w-3 dvx:h-3 dvx:text-gray-400" /> : null}
                </span>
              );
            })}
          </div>
          <span className={`dvx:text-[11px] ${hasStake && atCap ? "dvx:text-orange-500 dvx:font-semibold" : "dvx:text-gray-400"}`}>
            {hasStake
              ? t("farms_slots_detail", { used: active.size, max: maxActive, free: Math.max(0, maxActive - active.size) })
              : t("farms_slots_open", { max: maxActive })}
          </span>
        </div>
      )}

      {/* My stake · claim all */}
      {hasStake && (
        <div className="dvx:mt-2 dvx:flex dvx:items-center dvx:gap-3 dvx:flex-wrap dvx:text-[11px] dvx:text-gray-400">
          <span>
            {t("farms_my_stake")}{" "}
            <span className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
              {formatAmount(myStakeH)} {tickerOf(staked)}
            </span>
          </span>
          {claimableCount >= 2 && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onClaimAll(farm)}
              className="dvx:ml-auto dvx:text-[11px] dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:disabled:opacity-40"
            >
              {t("farms_claim_all")}
            </button>
          )}
        </div>
      )}

      {/* Stake / Unstake */}
      <div className="dvx:mt-3 dvx:pt-3 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333]">
        {!connected ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={!onConnect}
            className="dinoButton dvx:w-full dvx:text-sm"
            style={{ minHeight: "32px" }}
          >
            {t("btn_connect")}
          </button>
        ) : (
          <>
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:mb-2">
              <div className="dvx:flex dvx:gap-1 dvx:p-0.5 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-lg">
                {(["stake", "unstake"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setAmount("");
                      setPickedRaw(null);
                    }}
                    disabled={m === "unstake" && !hasStake}
                    className={`dvx:px-3 dvx:py-1 dvx:text-[11px] dvx:font-bold dvx:rounded-md dvx:transition-all dvx:disabled:opacity-40 ${
                      mode === m
                        ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-sm"
                        : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
                    }`}
                  >
                    {t(m === "stake" ? "farms_stake" : "farms_unstake")}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPct(100)}
                className="dvx:text-[10px] dvx:font-semibold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600"
              >
                {t(mode === "stake" ? "farms_wallet" : "farms_staked")}: {formatAmount(human(maxRaw, staked))}
                {usdOf(maxRaw) != null && <span className="dvx:text-gray-400"> (≈ {formatUsd(usdOf(maxRaw)!)})</span>} · MAX
              </button>
            </div>
            {/* Slider + quick percentages of the available max */}
            {maxBN.gt(0) && (
              <div className="dvx:mb-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={amountRaw != null ? Math.min(100, Math.round(new BigNumber(amountRaw.toString()).dividedBy(maxBN).multipliedBy(100).toNumber())) : 0}
                  onChange={(e) => setPct(Number(e.target.value))}
                  className="dvx:w-full dvx:cursor-pointer"
                  style={{ accentColor: "#f59e0b" }}
                  aria-label={t(mode === "stake" ? "farms_stake" : "farms_unstake")}
                />
                {/* Quick % labels placed exactly under their slider position
                    (25/50/75 centred on the point, MAX right-aligned at 100%). */}
                <div className="dvx:relative dvx:h-6 dvx:mt-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPct(pct)}
                      className="dvx:absolute dvx:top-0 dvx:px-1.5 dvx:py-0.5 dvx:rounded-md dvx:text-[10px] dvx:font-bold dvx:text-gray-500 dvx:dark:text-gray-300 dvx:bg-transparent dvx:hover:text-amber-500"
                      style={{ left: `${pct}%`, transform: pct === 100 ? "translateX(-100%)" : "translateX(-50%)" }}
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="dvx:flex dvx:gap-2">
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => {
                  setPickedRaw(null);
                  setAmount(e.target.value);
                }}
                className={`dvx:flex-1 dvx:min-w-0 dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 ${
                  tooMuch
                    ? "dvx:border-red-400 dvx:focus:ring-red-400"
                    : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500"
                }`}
              />
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => amountRaw != null && (mode === "stake" ? onStake(farm, amountRaw, bestRewardedToken) : onUnstake(farm, amountRaw))}
                className="dinoButton orange dvx:px-4 dvx:text-sm dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed"
              >
                {busy === `${mode}:${staked}`
                  ? t("dca_btn_signing")
                  : tooMuch
                    ? t("btn_insufficient")
                    : t(mode === "stake" ? "farms_stake" : "farms_unstake")}
              </button>
            </div>
            {amountRaw != null && usdOf(amountRaw.toString()) != null && (
              <p className="dvx:mt-1 dvx:text-[11px] dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-300">
                ≈ {formatUsd(usdOf(amountRaw.toString())!)}
              </p>
            )}
            {mode === "stake" && liveStreams.length === 0 && (
              <p className="dvx:mt-1.5 dvx:text-[10px] dvx:text-orange-500">{t("farms_no_live_stream")}</p>
            )}
            {mode === "stake" && !hasStake && bestRewardedToken && (
              <p className="dvx:mt-1.5 dvx:text-[10px] dvx:text-gray-400">
                {t("farms_stake_best_hint", { token: tickerOf(bestRewardedToken) })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
