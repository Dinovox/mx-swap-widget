import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionTabs } from "../ui/NavTabs";
import { TokenLogo } from "../ui/TokenSelect";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useSwapConfig } from "../context/SwapConfigContext";
import { fetchFeeCollectorState, type FeeCollectorState, type FeeOutcome, type FeeTokenPreview } from "../helpers/feeCollector";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { estimateGasLimit } from "../helpers/estimateGas";
import strToHex from "../helpers/strToHex";

// Fallback gas when the simulation fails — not measured yet (contract not on
// mainnet). processFees does one createOrder sync_call per token sold;
// claimProceeds one claimOrderProceeds per pair; compound one
// addLiquiditySingle plus the LP transfer.
const PROCESS_GAS_BASE = 10_000_000;
const PROCESS_GAS_PER_TOKEN = 25_000_000;
const CLAIM_GAS_BASE = 5_000_000;
const CLAIM_GAS_PER_PAIR = 15_000_000;
const COMPOUND_GAS_LIMIT = 60_000_000;
const MAX_GAS = 600_000_000;

type Action = "process" | "observe" | "claim" | "compound" | "compound_observe";

/**
 * "Dex Fees": the protocol fees collected from every DinoVox pair, and the
 * fee collector's public endpoints anyone can trigger — processFees (sell
 * each token for VOXEGLD through a limit order above market), claimProceeds
 * (bring back the VOXEGLD of filled orders), compound (deposit the VOXEGLD
 * single-side into VOXEGLD/WEGLD). The caller only pays gas; funds never
 * leave the protocol.
 */
export const DexFees = () => {
  const { apiUrl, feeCollectorAddress, address, networkApiAddress, chainId, explorerAddress, onConnect, onSignTransactions } =
    useSwapConfig();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");

  const [state, setState] = React.useState<FeeCollectorState | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const load = React.useCallback(() => {
    if (!feeCollectorAddress || !networkApiAddress || !chainId) return;
    setLoading(true);
    setLoadError(false);
    fetchFeeCollectorState(networkApiAddress, chainId, feeCollectorAddress)
      .then(setState)
      .catch((err) => {
        console.error("[DexFees] load error:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [feeCollectorAddress, networkApiAddress, chainId]);
  React.useEffect(load, [load]);

  // USD prices from the DEX token list (optional — values hidden without them).
  const [prices, setPrices] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    if (!apiUrl) return;
    axios
      .get(`${apiUrl}/tokens`)
      .then((res) => {
        const map: Record<string, number> = {};
        for (const tk of res.data.tokens || []) if (tk.priceUsd != null) map[tk.identifier] = parseFloat(tk.priceUsd);
        setPrices(map);
      })
      .catch(() => {});
  }, [apiUrl]);

  const meta = state?.meta ?? {};
  const tickerOf = (id: string) => meta[id]?.ticker ?? id.split("-")[0];
  const decimalsOf = (id: string) => meta[id]?.decimals ?? 18;
  const human = (raw: string, id: string) => new BigNumber(raw).shiftedBy(-decimalsOf(id));
  const fmt = (raw: string, id: string) => {
    const v = human(raw, id);
    return v.decimalPlaces(v.gte(1) ? 4 : 6, BigNumber.ROUND_DOWN).toFormat();
  };
  const usd = (raw: string, id: string) => {
    const p = prices[id];
    return p != null ? `$${human(raw, id).times(p).toFixed(2)}` : null;
  };
  const inDuration = (at: number) => {
    const s = Math.max(0, at - Math.floor(Date.now() / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.ceil((s % 3600) / 60);
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  };

  /* ---- Selection: tokens processFees would sell now, or whose price warm-up it would start / keep going ---- */
  // A token's first sale waits for its price warm-up (fee-collector
  // price_ref.rs), which only advances on processFees calls: anyone's call
  // observes the price, so every visitor is offered to do it.
  const selectable = (tk: FeeTokenPreview) => tk.outcome === "Done" || tk.outcome === "WarmingUp";
  const ready = (state?.tokens ?? []).filter((tk) => tk.outcome === "Done");
  const warming = (state?.tokens ?? []).filter((tk) => tk.outcome === "WarmingUp");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Pre-select every selectable token on each refresh.
  React.useEffect(() => setSelected(new Set((state?.tokens ?? []).filter(selectable).map((tk) => tk.token))), [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* ---- Transactions ---- */
  const [sending, setSending] = React.useState<Action | null>(null);
  const [txError, setTxError] = React.useState<string | null>(null);
  const send = async (action: Action, data: string, fallbackGas: number) => {
    if (!address || !chainId || !feeCollectorAddress) return;
    setTxError(null);
    setSending(action);
    try {
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [
          new Transaction({
            value: 0n,
            data: new TextEncoder().encode(data),
            receiver: new Address(feeCollectorAddress),
            sender: new Address(address),
            gasLimit: BigInt(
              await estimateGasLimit(networkApiAddress, { sender: address, receiver: feeCollectorAddress, data, chainId }, Math.min(fallbackGas, MAX_GAS)),
            ),
            gasPrice: BigInt(GAS_PRICE),
            chainID: chainId,
            version: 1,
          }),
        ],
        transactionsDisplayInfo: {
          processingMessage: t(`fees_${action}_processing`),
          successMessage: t(`fees_${action}_success`),
          errorMessage: t("fees_tx_error"),
        },
      });
      load();
    } catch (err: any) {
      console.error(`[DexFees] ${action} error:`, err);
      setTxError(err?.message ?? t("fees_tx_error"));
    } finally {
      setSending(null);
    }
  };
  const sellTokens = ready.filter((tk) => selected.has(tk.token)).map((tk) => tk.token);
  const observeTokens = warming.filter((tk) => selected.has(tk.token)).map((tk) => tk.token);
  const processTokens = [...sellTokens, ...observeTokens];
  const processAction: Action = sellTokens.length > 0 ? "process" : "observe";
  const runProcess = () =>
    send(processAction, ["processFees", ...processTokens.map(strToHex)].join("@"), PROCESS_GAS_BASE + PROCESS_GAS_PER_TOKEN * processTokens.length);
  const claimable = (state?.claimable ?? []).filter((c) => c.amount !== "0");
  const claimTotal = claimable.reduce((acc, c) => acc.plus(c.amount), new BigNumber(0));
  // Empty list = every pair the collector has orders on (the contract skips the empty ones).
  const runClaim = () => send("claim", "claimProceeds", CLAIM_GAS_BASE + CLAIM_GAS_PER_PAIR * Math.max(1, (state?.claimable ?? []).length));
  // compound observes the target token's price too: same warm-up before the first deposit.
  const compoundAction: Action = state?.compound.outcome === "WarmingUp" ? "compound_observe" : "compound";
  const runCompound = () => send(compoundAction, "compound", COMPOUND_GAS_LIMIT);

  /* ---- Styles (same as the other views) ---- */
  const inner = "dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4";
  const label = "dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400";
  const hint = "dvx:text-[11px] dvx:text-gray-400 dvx:leading-relaxed";
  const actionBtn = (action: Action, text: string, onClick: () => void, disabled: boolean) => (
    <button
      onClick={!address ? onConnect : onClick}
      disabled={!address ? !onConnect : disabled || sending != null}
      style={{ minHeight: "36px" }}
      className={`dinoButton orange dvx:w-full dvx:text-sm ${address ? "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed" : ""}`}
    >
      {!address ? t("btn_connect") : sending === action ? t("dca_btn_signing") : text}
    </button>
  );
  const outcomeBadge = (outcome: FeeOutcome, nextAt: number | null) => {
    const ok = outcome === "Done";
    const waiting = outcome === "TooSoon" || outcome === "WarmingUp";
    return (
      <span
        className={`dvx:text-[10px] dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:whitespace-nowrap ${
          ok
            ? "dvx:bg-green-100 dvx:dark:bg-green-900/30 dvx:text-green-700 dvx:dark:text-green-400"
            : waiting
              ? "dvx:bg-amber-100 dvx:dark:bg-amber-900/20 dvx:text-amber-700 dvx:dark:text-amber-400"
              : "dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-500 dvx:dark:text-gray-400"
        }`}
      >
        {outcome === "TooSoon" && nextAt != null ? t("fees_outcome_TooSoon_in", { when: inDuration(nextAt) }) : t(`fees_outcome_${outcome}`)}
      </span>
    );
  };

  const header = (
    <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
      <SectionTabs active="fees" />
    </div>
  );

  if (!feeCollectorAddress) {
    return (
      <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
        <Card className="dvx:border-2 dvx:border-cyan-500/20" title={header} description={t("fees_desc")}>
          <p className="dvx:py-8 dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400">{t("fees_not_available")}</p>
        </Card>
      </div>
    );
  }

  const target = state?.targetToken ?? "";
  const warmupHours = Math.round((state?.warmupSeconds ?? 0) / 3600);
  const warmupText = (endsAt: number | null, prefix: "fees_warmup" | "fees_compound_warmup") =>
    endsAt != null ? t(`${prefix}_ends_in`, { when: inDuration(endsAt) }) : t(`${prefix}_not_started`, { hours: warmupHours, token: tickerOf(target) });
  const rank = (o: FeeOutcome) => (o === "Done" ? 0 : o === "WarmingUp" ? 1 : 2);
  const others = (state?.tokens ?? []).slice().sort((a, b) => {
    if (rank(a.outcome) !== rank(b.outcome)) return rank(a.outcome) - rank(b.outcome);
    const ua = prices[a.token] != null ? human(a.balance, a.token).times(prices[a.token]).toNumber() : 0;
    const ub = prices[b.token] != null ? human(b.balance, b.token).times(prices[b.token]).toNumber() : 0;
    return ub - ua;
  });

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card className="dvx:border-2 dvx:border-cyan-500/20" title={header} description={t("fees_desc")}>
        <div className="dvx:space-y-3 dvx:mt-4">
          <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3">
            <p className={hint} style={{ margin: 0 }}>
              {t("fees_intro", { target: target ? tickerOf(target) : "VOXEGLD", premium: state ? state.premiumBps / 100 : 10 })}
            </p>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              title={t("fees_refresh")}
              className="dvx:shrink-0 dvx:bg-transparent dvx:p-1 dvx:text-gray-400 dvx:hover:text-amber-500"
            >
              <RefreshCw className={`dvx:w-4 dvx:h-4 ${loading ? "dvx:animate-spin" : ""}`} />
            </button>
          </div>

          {state?.paused && (
            <div className="dvx:rounded-xl dvx:border dvx:border-amber-300 dvx:dark:border-amber-700/60 dvx:bg-amber-50 dvx:dark:bg-amber-900/15 dvx:px-3 dvx:py-2 dvx:text-xs dvx:text-amber-700 dvx:dark:text-amber-300">
              {t("fees_paused")}
            </div>
          )}
          {loadError && !state && <p className="dvx:text-sm dvx:text-red-500">{t("fees_load_error")}</p>}
          {!state && !loadError && <p className="dvx:text-sm dvx:text-gray-400">{t("fees_loading")}</p>}

          {state && (
            <>
              {/* 1. Collected tokens → sell orders (processFees) */}
              <div className={`${inner} dvx:space-y-3`}>
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
                  <p className={label} style={{ margin: 0 }}>{t("fees_tokens_title")}</p>
                  <span className="dvx:text-[11px] dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                    {t("fees_tokens_ready", { n: ready.length, total: others.length })}
                  </span>
                </div>
                {others.length === 0 ? (
                  <p className="dvx:text-sm dvx:text-gray-400">{t("fees_tokens_empty")}</p>
                ) : (
                  <div className="dvx:space-y-1">
                    {others.map((tk) => {
                      const isSelectable = selectable(tk);
                      return (
                        <label
                          key={tk.token}
                          className={`dvx:flex dvx:items-center dvx:gap-3 dvx:rounded-xl dvx:px-2 dvx:py-2 ${
                            isSelectable ? "dvx:cursor-pointer dvx:hover:bg-gray-100 dvx:dark:hover:bg-[#262626]" : "dvx:opacity-70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(tk.token)}
                            disabled={!isSelectable}
                            onChange={() => toggle(tk.token)}
                            style={{ width: 16, height: 16, flexShrink: 0, accentColor: "#f59e0b", cursor: isSelectable ? "pointer" : "default", visibility: isSelectable ? "visible" : "hidden" }}
                          />
                          <TokenLogo url={meta[tk.token]?.logoUrl ?? null} ticker={tickerOf(tk.token)} />
                          <div className="dvx:flex-1 dvx:min-w-0">
                            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:flex-wrap">
                              <span className="dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                                {fmt(tk.balance, tk.token)} {tickerOf(tk.token)}
                                {usd(tk.balance, tk.token) && (
                                  <span className="dvx:ml-1 dvx:text-[11px] dvx:font-normal dvx:text-gray-400">≈ {usd(tk.balance, tk.token)}</span>
                                )}
                              </span>
                              {outcomeBadge(tk.outcome, tk.nextOrderAt)}
                            </div>
                            {tk.outcome === "Done" && (
                              <p className="dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400" style={{ margin: 0 }}>
                                {t("fees_order_preview", {
                                  amount: fmt(tk.amount, tk.token),
                                  token: tickerOf(tk.token),
                                  out: fmt(tk.minAmountOut, target),
                                  target: tickerOf(target),
                                })}
                              </p>
                            )}
                            {tk.outcome === "WarmingUp" && (
                              <p className="dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400" style={{ margin: 0 }}>
                                {warmupText(tk.warmupEndsAt, "fees_warmup")}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {actionBtn(
                  processAction,
                  sellTokens.length > 0 && observeTokens.length > 0
                    ? t("fees_process_btn_both", { n: sellTokens.length, m: observeTokens.length })
                    : sellTokens.length > 0
                      ? t("fees_process_btn", { n: sellTokens.length })
                      : observeTokens.length > 0
                        ? t("fees_observe_btn", { n: observeTokens.length })
                        : t("fees_process_none"),
                  runProcess,
                  processTokens.length === 0 || state.paused,
                )}
                <p className={hint} style={{ margin: 0 }}>{t("fees_process_hint")}</p>
                {warming.length > 0 && <p className={hint} style={{ margin: 0 }}>{t("fees_warmup_hint", { hours: warmupHours })}</p>}
              </div>

              {/* 2. Filled orders → VOXEGLD back to the collector (claimProceeds) */}
              <div className={`${inner} dvx:space-y-3`}>
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
                  <p className={label} style={{ margin: 0 }}>{t("fees_claim_title")}</p>
                  <span className="dvx:text-sm dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
                    {fmt(claimTotal.toFixed(0), target)} {tickerOf(target)}
                  </span>
                </div>
                {claimable.length > 0 && (
                  <ul className="dvx:space-y-0.5 dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {claimable.map((c) => (
                      <li key={c.pair} className="dvx:flex dvx:justify-between dvx:gap-2">
                        <a
                          href={`${explorerAddress}/accounts/${c.pair}`}
                          target="_blank"
                          rel="noreferrer"
                          className="dvx:font-mono dvx:text-gray-400 dvx:hover:text-amber-500"
                        >
                          {c.pair.slice(0, 10)}…{c.pair.slice(-6)}
                        </a>
                        <span>{fmt(c.amount, target)} {tickerOf(target)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {actionBtn(
                  "claim",
                  claimTotal.gt(0) ? t("fees_claim_btn", { amount: fmt(claimTotal.toFixed(0), target), token: tickerOf(target) }) : t("fees_claim_none"),
                  runClaim,
                  claimTotal.lte(0),
                )}
              </div>

              {/* 3. Collected VOXEGLD → single-side liquidity (compound) */}
              <div className={`${inner} dvx:space-y-3`}>
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
                  <p className={label} style={{ margin: 0 }}>{t("fees_compound_title")}</p>
                  {outcomeBadge(state.compound.outcome, state.compound.nextZapAt)}
                </div>
                <div className="dvx:flex dvx:justify-between dvx:gap-3 dvx:text-xs">
                  <span className="dvx:text-gray-400">{t("fees_compound_balance")}</span>
                  <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                    {fmt(state.targetBalance, target)} {tickerOf(target)}
                    {usd(state.targetBalance, target) && <span className="dvx:ml-1 dvx:font-normal dvx:text-gray-400">≈ {usd(state.targetBalance, target)}</span>}
                  </span>
                </div>
                {state.compound.outcome === "Done" && (
                  <div className="dvx:flex dvx:justify-between dvx:gap-3 dvx:text-xs">
                    <span className="dvx:text-gray-400">{t("fees_compound_amount")}</span>
                    <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                      {fmt(state.compound.amount, target)} {tickerOf(target)}
                    </span>
                  </div>
                )}
                {state.compound.outcome === "WarmingUp" && (
                  <p className="dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400" style={{ margin: 0 }}>
                    {warmupText(state.compound.warmupEndsAt, "fees_compound_warmup")}
                  </p>
                )}
                {actionBtn(
                  compoundAction,
                  state.compound.outcome === "Done"
                    ? t("fees_compound_btn", { amount: fmt(state.compound.amount, target), token: tickerOf(target) })
                    : state.compound.outcome === "WarmingUp"
                      ? t("fees_compound_observe_btn", { token: tickerOf(target) })
                      : t("fees_compound_not_ready"),
                  runCompound,
                  (state.compound.outcome !== "Done" && state.compound.outcome !== "WarmingUp") || state.paused,
                )}
                <p className={hint} style={{ margin: 0 }}>
                  {state.compound.quoteToken
                    ? t("fees_compound_hint", { token: tickerOf(target), quote: state.compound.quoteToken.split("-")[0] })
                    : t("fees_compound_off")}
                </p>
              </div>
            </>
          )}

          {txError && (
            <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
              {txError}
            </div>
          )}
          <p className={hint} style={{ margin: 0 }}>{t("fees_open_to_all")}</p>
          <a
            href={`${explorerAddress}/accounts/${feeCollectorAddress}`}
            target="_blank"
            rel="noreferrer"
            className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[11px] dvx:text-gray-400 dvx:hover:text-amber-500"
          >
            {t("fees_collector_link")}
            <span className="dvx:font-mono">
              {feeCollectorAddress.slice(0, 10)}…{feeCollectorAddress.slice(-6)}
            </span>
            <ExternalLink className="dvx:w-3 dvx:h-3" />
          </a>
        </div>
      </Card>
    </div>
  );
};
