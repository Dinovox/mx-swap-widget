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
import { PRICE_SCALE_DEC } from "../ui/OrderBookDepth";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useSwapConfig } from "../context/SwapConfigContext";
import { useGoTo } from "../context/SwapViewContext";
import { fetchFeeCollectorState, type FeeCollectorState, type FeeOutcome, type FeeTokenPreview } from "../helpers/feeCollector";

/** Price fields shared by a token preview and the compound preview. */
type Observation = Pick<FeeTokenPreview, "spotPrice" | "refPrice" | "refUpdatedAt" | "refNext">;
/** Why observing now is worth it: never observed, reference drifted from the AMM, or not observed for long. */
type DueReason = "new" | "drift" | "stale" | null;
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
// Past this, a reference is considered unattended: visitors are asked to
// observe again. Below it, observing changes little — the button stays
// available but secondary.
const STALE_OBSERVATION_SECONDS = 24 * 3600;
// Outcomes fee-collector plan_order returns after its observation step:
// processFees stores the observed reference for these tokens too, even with
// no order (BelowMinimum comes before it only for a zero balance, never listed).
const OBSERVED_OUTCOMES: FeeOutcome[] = ["WarmingUp", "PairUnavailable", "TooSoon", "BelowMinimum", "PriceOutOfBounds"];

type Action = "process" | "observe" | "claim" | "compound" | "compound_observe";

/** GET /orderbook/orders item — the collector's own sell orders (backend DB mirror of the pairs' order books). */
interface CollectorOrder {
  pairAddr: string;
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  tokenInTicker: string;
  tokenOutTicker: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  tokenInLogoUrl: string | null;
  /** ceil(min_out × 10^36 / amount_in), raw units. */
  price: string;
  amountInInitial: string;
  amountInRemaining: string;
  status: "active" | "filled" | "cancelled";
  createdAt: string;
}
const PAST_ORDERS_SHOWN = 5;

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
  const { t, i18n } = useTranslation("swap");
  const goTo = useGoTo();
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

  // The collector's orders: every active one, plus the last few closed.
  const [orders, setOrders] = React.useState<CollectorOrder[]>([]);
  const [activeTotal, setActiveTotal] = React.useState(0);
  const loadOrders = React.useCallback(() => {
    if (!apiUrl || !feeCollectorAddress) return;
    const get = (status: string, limit: number) =>
      axios
        .get<{ orders: CollectorOrder[]; total: number }>(`${apiUrl}/orderbook/orders`, { params: { address: feeCollectorAddress, status, limit } })
        .then((r) => r.data)
        .catch(() => ({ orders: [] as CollectorOrder[], total: 0 }));
    Promise.all([get("active", 100), get("filled,cancelled", PAST_ORDERS_SHOWN)]).then(([active, past]) => {
      setOrders([...active.orders, ...past.orders]);
      setActiveTotal(active.total);
    });
  }, [apiUrl, feeCollectorAddress]);
  React.useEffect(loadOrders, [loadOrders]);
  const reload = () => {
    load();
    loadOrders();
  };

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
  // The API's ticker is the full identifier for unbranded tokens — keep the prefix only.
  const tickerOf = (id: string) => (meta[id]?.ticker ?? id).split("-")[0];
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
  const fmtPrice = (v: string) => {
    const b = new BigNumber(v);
    return b.gte(1) ? b.decimalPlaces(4, BigNumber.ROUND_DOWN).toFormat() : b.precision(4, BigNumber.ROUND_DOWN).toFixed();
  };
  const nowSec = () => Math.floor(Date.now() / 1000);
  const durationText = (seconds: number) => {
    // Round to the minute first, so 47 h 59 min 30 s reads "48 h 0 min", not "47 h 60 min".
    const total = Math.ceil(Math.max(0, seconds) / 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  };
  const inDuration = (at: number) => durationText(at - nowSec());
  const longDuration = (seconds: number) => {
    const hours = Math.ceil(Math.max(0, seconds) / 3600);
    return hours >= 48 ? t("fees_duration_days", { d: Math.floor(hours / 24), h: hours % 24 }) : durationText(seconds);
  };
  // Big amounts in compact form ("586,4 k"); small ones keep their decimals.
  const fmtShort = (raw: string, id: string) =>
    human(raw, id).gte(1000)
      ? new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 }).format(human(raw, id).toNumber())
      : fmt(raw, id);
  const fmtShortDec = (raw: BigNumber, decimals: number) => {
    const v = raw.shiftedBy(-decimals);
    return v.gte(1000)
      ? new Intl.NumberFormat(i18n.language, { notation: "compact", maximumFractionDigits: 1 }).format(v.toNumber())
      : v.decimalPlaces(v.gte(1) ? 4 : 6, BigNumber.ROUND_DOWN).toFormat();
  };
  const signedPct = (v: BigNumber) => `${v.gt(0) ? "+" : "−"}${v.abs().toFixed(1)}`;
  // Price details, as label/value rows: AMM price, contract reference (and
  // what observing now would make of it), last observation. Shared by the
  // tokens (price in target) and compound (target price in quote).
  type Detail = { label: string; value: React.ReactNode };
  const priceRows = (o: Observation, unit: string, canObserve: boolean, due: DueReason): Detail[] => {
    const rows: Detail[] = [];
    if (o.spotPrice != null) rows.push({ label: t("fees_detail_spot"), value: `${fmtPrice(o.spotPrice)} ${unit}` });
    if (o.refPrice == null) {
      if (o.spotPrice != null) rows.push({ label: t("fees_detail_ref"), value: t("fees_detail_ref_none") });
    } else {
      const change = o.refNext != null && !new BigNumber(o.refPrice).isZero() ? new BigNumber(o.refNext).div(o.refPrice).minus(1).times(100) : null;
      rows.push({
        label: t("fees_detail_ref"),
        value: (
          <>
            {fmtPrice(o.refPrice)}
            {canObserve && change != null && change.abs().gte(0.05) && (
              <span className="dvx:text-amber-600 dvx:dark:text-amber-400 dvx:whitespace-nowrap" title={t("fees_detail_ref_next_title")}>
                {" "}
                {t("fees_detail_ref_next", { price: fmtPrice(o.refNext!), change: signedPct(change) })}
              </span>
            )}
            {due === "drift" && <span className="dvx:text-amber-600 dvx:dark:text-amber-400"> · {t("fees_detail_drift")}</span>}
          </>
        ),
      });
    }
    if (o.refUpdatedAt != null) {
      rows.push({
        label: t("fees_detail_observed"),
        value: (
          <>
            {t("fees_detail_ago", { ago: durationText(nowSec() - o.refUpdatedAt) })}
            {due === "stale" && <span className="dvx:text-amber-600 dvx:dark:text-amber-400"> · {t("fees_detail_stale")}</span>}
          </>
        ),
      });
    }
    return rows;
  };
  const detailRows = (tk: FeeTokenPreview): Detail[] => {
    const rows = priceRows(tk, tickerOf(target), selectable(tk), observationDue(tk));
    if (tk.orderCap != null && tk.orderCap !== "0" && (tk.outcome === "Done" || tk.outcome === "WarmingUp" || tk.outcome === "TooSoon")) {
      const token = tickerOf(tk.token);
      rows.push({
        label: t("fees_detail_order"),
        value: new BigNumber(tk.orderCap).lt(tk.balance)
          ? t("fees_detail_order_cap", { amount: fmtShort(tk.orderCap, tk.token), token, pct: (state?.maxOrderReserveBps ?? 0) / 100 })
          : t("fees_detail_order_all", { amount: fmtShort(tk.orderCap, tk.token), token }),
      });
    }
    return rows;
  };
  const detailGrid = (rows: Detail[]) =>
    rows.length > 0 && (
      <div className="dvx:text-[11px] dvx:leading-relaxed" style={{ display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 12, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <span className="dvx:text-gray-400 dvx:dark:text-gray-500">{r.label}</span>
            <span className="dvx:text-gray-600 dvx:dark:text-gray-300" style={{ minWidth: 0 }}>{r.value}</span>
          </React.Fragment>
        ))}
      </div>
    );

  /* ---- Selection: tokens processFees would sell now, or whose price it would observe ---- */
  // The reference (fee-collector price_ref.rs) prices every sale and only
  // moves on processFees calls, which observe each token they get far
  // enough, sold or not: anyone's call does it, so every visitor is offered to.
  const observable = (tk: FeeTokenPreview) => OBSERVED_OUTCOMES.includes(tk.outcome);
  const selectable = (tk: FeeTokenPreview) => tk.outcome === "Done" || observable(tk);
  // AMM price above the reference by more than the premium: an order at
  // reference + premium would sit under the market. It is also what a
  // manipulated observation (dumped spot) leaves behind, and only an honest
  // one lifts it back — observing a passing spike costs time only, the
  // reference then falling back by at most decay_bps_per_day.
  const lagsMarket = (tk: FeeTokenPreview) =>
    tk.spotPrice != null &&
    tk.refPrice != null &&
    new BigNumber(tk.spotPrice).gt(new BigNumber(tk.refPrice).times(1 + (state?.premiumBps ?? 0) / 10_000));
  // Observing is worth asking for when the price was never observed (starts
  // the warm-up), lags the market, or is warming up with nobody observing it
  // for STALE_OBSERVATION_SECONDS.
  // Why an observation is due (shown on the matching detail row), null if not.
  const observationDue = (tk: FeeTokenPreview): DueReason => {
    if (!observable(tk)) return null;
    if (tk.refUpdatedAt == null) return "new";
    if (lagsMarket(tk)) return "drift";
    if (tk.outcome === "WarmingUp" && nowSec() - tk.refUpdatedAt > STALE_OBSERVATION_SECONDS) return "stale";
    return null;
  };
  const needsObservation = (tk: FeeTokenPreview) => observationDue(tk) != null;
  const ready = (state?.tokens ?? []).filter((tk) => tk.outcome === "Done");
  const observing = (state?.tokens ?? []).filter(observable);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Pre-select, on each refresh, what is worth sending: sales, and observations that are due.
  React.useEffect(
    () => setSelected(new Set((state?.tokens ?? []).filter((tk) => tk.outcome === "Done" || needsObservation(tk)).map((tk) => tk.token))),
    [state], // eslint-disable-line react-hooks/exhaustive-deps
  );
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
      // signAndSendTransactions resolves once sent, not once executed: re-read
      // a few times so the new state (warm-up start, order placed…) shows up.
      for (const ms of [6_000, 15_000, 30_000]) setTimeout(reload, ms);
    } catch (err: any) {
      console.error(`[DexFees] ${action} error:`, err);
      setTxError(err?.message ?? t("fees_tx_error"));
    } finally {
      setSending(null);
    }
  };
  const sellTokens = ready.filter((tk) => selected.has(tk.token)).map((tk) => tk.token);
  const observeTokens = observing.filter((tk) => selected.has(tk.token)).map((tk) => tk.token);
  const processTokens = [...sellTokens, ...observeTokens];
  const processAction: Action = sellTokens.length > 0 ? "process" : "observe";
  const runProcess = () =>
    send(processAction, ["processFees", ...processTokens.map(strToHex)].join("@"), PROCESS_GAS_BASE + PROCESS_GAS_PER_TOKEN * processTokens.length);
  const claimable = (state?.claimable ?? []).filter((c) => c.amount !== "0");
  const claimTotal = claimable.reduce((acc, c) => acc.plus(c.amount), new BigNumber(0));
  // Empty list = every pair the collector has orders on (the contract skips the empty ones).
  const runClaim = () => send("claim", "claimProceeds", CLAIM_GAS_BASE + CLAIM_GAS_PER_PAIR * Math.max(1, (state?.claimable ?? []).length));
  // compound observes the target token's price too (same warm-up before the
  // first deposit), deposit or not. Worth asking for, as for the tokens, when
  // never observed, when the AMM drifted past the deposit tolerance (deposits
  // put off below it; the reference only follows on observations), or when
  // nobody observed for STALE_OBSERVATION_SECONDS.
  const compound = state?.compound;
  const compoundObservable = !!compound && OBSERVED_OUTCOMES.includes(compound.outcome);
  // Drift is worth an observation only if one would move the reference now:
  // AMM above it, it jumps straight to the spot; AMM below, it only loses the
  // decay accrued since the last observation — worth calling once that
  // window is full (max_decay_seconds: waiting longer gains nothing), not
  // a minute after the previous call.
  const compoundDueReason: DueReason = (() => {
    if (!compound || !compoundObservable) return null;
    if (compound.refUpdatedAt == null) return "new";
    const elapsed = nowSec() - compound.refUpdatedAt;
    if (compound.spotPrice != null && compound.refPrice != null && !new BigNumber(compound.refPrice).isZero()) {
      const gap = new BigNumber(compound.spotPrice).div(compound.refPrice).minus(1);
      if (gap.abs().times(10_000).gt(compound.maxPriceDeviationBps) && (gap.gt(0) || elapsed >= (state?.maxDecaySeconds ?? 0)))
        return "drift";
    }
    return elapsed > STALE_OBSERVATION_SECONDS ? "stale" : null;
  })();
  const compoundDue = compoundDueReason != null;
  // AMM under the deposit tolerance: the reference only comes down through
  // observations, each taking off decay × min(elapsed, max_decay). Best case,
  // one observation per full window from the last one: after k windows the
  // reference is ref × (1 − decay × window / day)^k. Deposits resume once
  // ref × (1 − max deviation) ≤ spot, assuming the AMM stays where it is.
  const compoundEta = (() => {
    if (!compound || compound.outcome !== "PriceOutOfBounds" || !state) return null;
    if (compound.spotPrice == null || compound.refPrice == null || compound.refUpdatedAt == null) return null;
    const windowSec = state.maxDecaySeconds;
    const step = new BigNumber(state.decayBpsPerDay).times(windowSec).div(10_000 * 86_400);
    if (windowSec <= 0 || step.lte(0) || step.gte(1)) return null;
    const threshold = new BigNumber(compound.spotPrice).div(1 - compound.maxPriceDeviationBps / 10_000);
    let ref = new BigNumber(compound.refPrice);
    let k = 0;
    while (ref.gt(threshold) && k < 1000) {
      ref = ref.times(new BigNumber(1).minus(step));
      k++;
    }
    if (k === 0 || k >= 1000) return null;
    return { at: compound.refUpdatedAt + k * windowSec, observations: k, windowSec };
  })();
  const compoundAction: Action = compound?.outcome === "Done" ? "compound" : "compound_observe";
  const runCompound = () => send(compoundAction, "compound", COMPOUND_GAS_LIMIT);

  /* ---- Styles (same as the other views) ---- */
  const inner = "dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4";
  const label = "dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400";
  const hint = "dvx:text-[11px] dvx:text-gray-400 dvx:leading-relaxed";
  const actionBtn = (action: Action, text: string, onClick: () => void, disabled: boolean, secondary = false) => (
    <button
      onClick={!address ? onConnect : onClick}
      disabled={!address ? !onConnect : disabled || sending != null}
      style={{ minHeight: "36px" }}
      className={`${
        secondary && address
          ? "dvx:rounded-xl dvx:border dvx:border-gray-300 dvx:dark:border-[#444] dvx:bg-transparent dvx:text-gray-600 dvx:dark:text-gray-300 dvx:hover:bg-gray-100 dvx:dark:hover:bg-[#262626] dvx:font-semibold"
          : "dinoButton orange"
      } dvx:w-full dvx:text-sm ${address ? "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed" : ""}`}
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
              onClick={reload}
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
                          className={`dvx:flex dvx:items-start dvx:gap-3 dvx:rounded-xl dvx:px-2 dvx:py-2.5 ${
                            isSelectable ? "dvx:cursor-pointer dvx:hover:bg-gray-100 dvx:dark:hover:bg-[#262626]" : "dvx:opacity-70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(tk.token)}
                            disabled={!isSelectable}
                            onChange={() => toggle(tk.token)}
                            style={{ width: 16, height: 16, flexShrink: 0, marginTop: 8, accentColor: "#f59e0b", cursor: isSelectable ? "pointer" : "default", visibility: isSelectable ? "visible" : "hidden" }}
                          />
                          <div style={{ flexShrink: 0 }}>
                            <TokenLogo url={meta[tk.token]?.logoUrl ?? null} ticker={tickerOf(tk.token)} />
                          </div>
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
                            {tk.outcome === "PoolTooSmall" && (
                              <p className="dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400" style={{ margin: 0 }}>
                                {t("fees_pool_too_small_text", { pair: `${tickerOf(tk.token)}/${tickerOf(target)}` })}{" "}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    // Inside the row's <label>: keep the click off the checkbox.
                                    e.preventDefault();
                                    goTo("add-liquidity", { tokenA: tk.token, tokenB: target });
                                  }}
                                  className="dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:hover:underline"
                                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                                >
                                  {t("fees_pool_too_small_cta")}
                                </button>
                              </p>
                            )}
                            {tk.outcome === "NoPair" && (
                              <p className="dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400" style={{ margin: 0 }}>
                                {t("fees_no_pair_text", { pair: `${tickerOf(tk.token)}/${tickerOf(target)}` })}{" "}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    // CreatePool only preselects tokens the wallet holds (tokenY always, tokenX off mainnet).
                                    goTo("create-pool", { tokenX: target, tokenY: tk.token });
                                  }}
                                  className="dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:hover:underline"
                                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                                >
                                  {t("fees_no_pair_cta")}
                                </button>
                              </p>
                            )}
                            {detailGrid(detailRows(tk))}
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
                  sellTokens.length === 0 && !observing.some((tk) => selected.has(tk.token) && needsObservation(tk)),
                )}
                <p className={hint} style={{ margin: 0 }}>{t("fees_process_hint")}</p>
                {observing.length > 0 && (
                  <p className={hint} style={{ margin: 0 }}>
                    {t("fees_warmup_hint", { hours: warmupHours, decay: state.decayBpsPerDay / 100, premium: state.premiumBps / 100 })}
                  </p>
                )}
              </div>

              {/* 2. The collector's orders on the pairs' books */}
              <div className={`${inner} dvx:space-y-3`}>
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
                  <p className={label} style={{ margin: 0 }}>{t("fees_orders_title")}</p>
                  <span className="dvx:text-[11px] dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                    {t("fees_orders_active", { n: activeTotal })}
                  </span>
                </div>
                {orders.length === 0 ? (
                  <p className="dvx:text-sm dvx:text-gray-400" style={{ margin: 0 }}>{t("fees_orders_empty")}</p>
                ) : (
                  <div className="dvx:space-y-1">
                    {orders.map((o) => {
                      const initial = new BigNumber(o.amountInInitial);
                      const remaining = new BigNumber(o.amountInRemaining);
                      const filledPct = initial.gt(0) ? initial.minus(remaining).div(initial).times(100) : new BigNumber(0);
                      const price = new BigNumber(o.price).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(o.tokenInDecimals - o.tokenOutDecimals);
                      // Same unit as the token rows (target per token): how far above the AMM the order sits.
                      const spot = o.tokenOut === target ? state.tokens.find((tk) => tk.token === o.tokenIn)?.spotPrice : null;
                      const vsSpot = spot && !new BigNumber(spot).isZero() ? price.div(spot).minus(1).times(100) : null;
                      const amount = (raw: BigNumber) => fmtShortDec(raw, o.tokenInDecimals);
                      const status =
                        o.status === "active" && filledPct.gt(0) ? "partial" : o.status;
                      const rows: Detail[] = [
                        { label: t("fees_orders_price"), value: `1 ${o.tokenInTicker} = ${fmtPrice(price.toFixed())} ${o.tokenOutTicker}` },
                      ];
                      if (o.status === "active" && vsSpot != null)
                        rows.push({ label: t("fees_orders_vs_spot"), value: t("fees_orders_vs_spot_value", { pct: signedPct(vsSpot) }) });
                      if (status === "partial")
                        rows.push({
                          label: t("fees_orders_filled"),
                          value: t("fees_orders_filled_value", { pct: filledPct.toFixed(1), left: amount(remaining), token: o.tokenInTicker }),
                        });
                      rows.push({ label: t("fees_orders_created"), value: t("fees_detail_ago", { ago: durationText(nowSec() - Math.floor(Date.parse(o.createdAt) / 1000)) }) });
                      return (
                        <div
                          key={`${o.pairAddr}:${o.orderId}`}
                          className={`dvx:flex dvx:items-start dvx:gap-3 dvx:rounded-xl dvx:px-2 dvx:py-2.5 ${o.status === "active" ? "" : "dvx:opacity-60"}`}
                        >
                          <div style={{ flexShrink: 0 }}>
                            <TokenLogo url={o.tokenInLogoUrl} ticker={o.tokenInTicker} />
                          </div>
                          <div className="dvx:flex-1 dvx:min-w-0">
                            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:flex-wrap">
                              <span className="dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                                {amount(initial)} {o.tokenInTicker} → {o.tokenOutTicker}
                              </span>
                              <span
                                className={`dvx:text-[10px] dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:whitespace-nowrap ${
                                  status === "filled"
                                    ? "dvx:bg-green-100 dvx:dark:bg-green-900/30 dvx:text-green-700 dvx:dark:text-green-400"
                                    : status === "cancelled"
                                      ? "dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-500 dvx:dark:text-gray-400"
                                      : "dvx:bg-amber-100 dvx:dark:bg-amber-900/20 dvx:text-amber-700 dvx:dark:text-amber-400"
                                }`}
                              >
                                {t(`fees_orders_status_${status}`)}
                              </span>
                            </div>
                            {detailGrid(rows)}
                            {o.status === "active" && (
                              <button
                                type="button"
                                onClick={() => goTo("limit", { from: o.tokenIn, to: o.tokenOut })}
                                className="dvx:mt-1 dvx:text-[11px] dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:hover:underline"
                                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                              >
                                {t("fees_orders_book_link")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeTotal > orders.filter((o) => o.status === "active").length && (
                  <p className={hint} style={{ margin: 0 }}>{t("fees_orders_more", { n: activeTotal - orders.filter((o) => o.status === "active").length })}</p>
                )}
              </div>

              {/* 3. Filled orders → VOXEGLD back to the collector (claimProceeds) */}
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

              {/* 4. Collected VOXEGLD → single-side liquidity (compound) */}
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
                {state.compound.quoteToken &&
                  detailGrid([
                    ...priceRows(state.compound, tickerOf(state.compound.quoteToken), compoundObservable, compoundDueReason),
                    ...(compoundEta
                      ? [
                          {
                            label: t("fees_detail_eta"),
                            value: (
                              <span title={t("fees_detail_eta_title")}>
                                {t("fees_detail_eta_value", {
                                  when: longDuration(compoundEta.at - nowSec()),
                                  count: compoundEta.observations,
                                  every: durationText(compoundEta.windowSec),
                                })}
                              </span>
                            ),
                          },
                        ]
                      : []),
                  ])}
                {actionBtn(
                  compoundAction,
                  state.compound.outcome === "Done"
                    ? t("fees_compound_btn", { amount: fmt(state.compound.amount, target), token: tickerOf(target) })
                    : compoundObservable
                      ? t("fees_compound_observe_btn", { token: tickerOf(target) })
                      : t("fees_compound_not_ready"),
                  runCompound,
                  (state.compound.outcome !== "Done" && !compoundObservable) || state.paused,
                  state.compound.outcome !== "Done" && !compoundDue,
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
