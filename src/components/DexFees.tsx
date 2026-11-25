import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Address, Transaction } from "@multiversx/sdk-core";
import { ChevronDown, ExternalLink, RefreshCw } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionTabs } from "../ui/NavTabs";
import { TokenLogo } from "../ui/TokenSelect";
import { PRICE_SCALE_DEC } from "../ui/OrderBookDepth";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useSwapConfig } from "../context/SwapConfigContext";
import { useGoTo } from "../context/SwapViewContext";
import { fetchFeeCollectorState, fetchFeeCollectorStateFromApi, type FeeCollectorState, type FeeOutcome, type FeeTokenPreview } from "../helpers/feeCollector";

/** Price fields shared by a token preview and the compound preview. */
type Observation = Pick<FeeTokenPreview, "spotPrice" | "refPrice" | "refUpdatedAt" | "refNext">;
/** Why observing now is worth it: never observed, reference drifted from the AMM, or not observed for long. */
type DueReason = "new" | "drift" | "stale" | null;
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { estimateGasLimit, GAS_PRICE } from "../helpers/estimateGas";
import strToHex from "../helpers/strToHex";
import bigToHex from "../helpers/bigToHex";

// Fallback gas when the simulation fails — not measured yet (contract not on
// mainnet). processFees does one createOrder sync_call per token sold, one
// addLiquiditySingle plus the LP transfer per routed token deposited;
// claimProceeds one claimOrderProceeds per pair; compound and compoundQuote
// one addLiquiditySingle plus the LP transfer; stake one liquid staking stake
// (mint + transfer).
const PROCESS_GAS_BASE = 10_000_000;
const PROCESS_GAS_PER_TOKEN = 25_000_000;
const PROCESS_GAS_PER_DEPOSIT = 60_000_000;
const CLAIM_GAS_BASE = 5_000_000;
const CLAIM_GAS_PER_PAIR = 15_000_000;
// cancelStaleOrders: one pair::cancelOrder sync_call per order cancelled.
const CANCEL_STALE_GAS_BASE = 5_000_000;
const CANCEL_STALE_GAS_PER_ORDER = 15_000_000;
// fee-collector MAX_PAIR_CALLS: pairs claimed / orders cancelled per
// transaction at most — a longer list goes out as several transactions under
// one signature.
const PAIR_CALLS_MAX = 30;
/** `list` in slices of `size`. */
const chunks = <T,>(list: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
const COMPOUND_GAS_LIMIT = 60_000_000;
const STAKE_GAS_LIMIT = 30_000_000;
const MAX_GAS = 600_000_000;
/** fee-collector MIN_STAKE_AMOUNT (0.001 EGLD): below it, stake waits (BelowMinimum). */
const STAKE_MIN_RAW = "1000000000000000";
// Past this, a reference is considered unattended: visitors are asked to
// observe again. Below it, observing changes little — the button stays
// available but secondary.
const STALE_OBSERVATION_SECONDS = 24 * 3600;
/** Token list long enough to get a search field. */
const TOKEN_SEARCH_FROM = 8;
type TokenGroup = "sell" | "deposit" | "observe" | "wait" | "blocked";
// Outcomes fee-collector plan_order returns after its observation step:
// processFees stores the observed reference for these tokens too, even with
// no order (BelowMinimum comes before it only for a zero balance, never listed).
const OBSERVED_OUTCOMES: FeeOutcome[] = ["WarmingUp", "PairUnavailable", "TooSoon", "BelowMinimum", "PriceOutOfBounds"];

type Action = "process" | "process_lp" | "observe" | "claim" | "cancel_stale";

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
  /** AMM price of the pair from the indexed reserves, same scale as `price` (null: unknown; absent: older backend). */
  spotPrice?: string | null;
}
const PAST_ORDERS_SHOWN = 5;

/**
 * "Dex Fees": the protocol fees collected from every DinoVox pair, and the
 * fee collector's public endpoints anyone can trigger — processFees (sell
 * each token for VOXEGLD through a limit order above market, or deposit it
 * single-side into the pool the owner routed it to), claimProceeds
 * (bring back the VOXEGLD of filled orders), compound (deposit the VOXEGLD
 * single-side into VOXEGLD/WEGLD), compoundQuote (deposit the WEGLD on the
 * other side of that pair instead of selling it), stake (turn the EGLD it
 * receives into VOXEGLD on the liquid staking contract). The caller only pays
 * gas; funds never leave the protocol.
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
  // Backend first (one shared read); the chain directly when it can't serve this collector.
  const load = React.useCallback((fresh = false) => {
    if (!feeCollectorAddress || !networkApiAddress || !chainId) return;
    setLoading(true);
    setLoadError(false);
    (apiUrl ? fetchFeeCollectorStateFromApi(apiUrl, feeCollectorAddress, fresh) : Promise.resolve(null))
      .then((fromApi) => fromApi ?? fetchFeeCollectorState(networkApiAddress, chainId, feeCollectorAddress))
      .then(setState)
      .catch((err) => {
        console.error("[DexFees] load error:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [apiUrl, feeCollectorAddress, networkApiAddress, chainId]);
  React.useEffect(() => load(), [load]);

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
  // Order groups (one per pair and direction) unfolded by the user; closed orders folded by default.
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // Always a fresh read: called by the ↻ button and after our own transactions.
  const reload = () => {
    load(true);
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
  // A routed token is priced in its pool's other token, and its next action is an LP deposit.
  const detailRows = (tk: FeeTokenPreview): Detail[] => {
    const rows = priceRows(tk, tickerOf(tk.route?.otherToken || target), selectable(tk), observationDue(tk));
    if (tk.orderCap != null && tk.orderCap !== "0" && (tk.outcome === "Done" || tk.outcome === "WarmingUp" || tk.outcome === "TooSoon")) {
      const token = tickerOf(tk.token);
      const capBps = tk.route ? state?.maxZapReserveBps : state?.maxOrderReserveBps;
      rows.push({
        label: t(tk.route ? "fees_detail_deposit" : "fees_detail_order"),
        value: new BigNumber(tk.orderCap).lt(tk.balance)
          ? t("fees_detail_order_cap", { amount: fmtShort(tk.orderCap, tk.token), token, pct: (capBps ?? 0) / 100 })
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
  // LP deposits (compound, routed tokens) are put off once the AMM sits more
  // than max_price_deviation_bps under the reference. A drift past that
  // tolerance is worth an observation only if one would move the reference
  // now: AMM above it, it jumps straight to the spot (a reference left under
  // the market lets a dumped price through) — counted only if `aboveCounts`;
  // AMM below, it only loses the decay accrued since the last observation —
  // worth calling once that window is full (max_decay_seconds: waiting longer
  // gains nothing), not a minute after the previous call.
  const depositDrift = (o: Observation, maxDeviationBps: number, aboveCounts = true) => {
    if (o.spotPrice == null || o.refPrice == null || o.refUpdatedAt == null || new BigNumber(o.refPrice).isZero()) return false;
    const gap = new BigNumber(o.spotPrice).div(o.refPrice).minus(1);
    return gap.abs().times(10_000).gt(maxDeviationBps) && (gap.gt(0) ? aboveCounts : nowSec() - o.refUpdatedAt >= (state?.maxDecaySeconds ?? 0));
  };
  // A routed token's pool often pairs two volatile assets (USDC/VOXEGLD,
  // WBTC/VOXEGLD) that drift past the tolerance most days. While it warms up
  // or waits for its next deposit (TooSoon), nothing can be deposited, and
  // the call that deposits lifts the reference to the spot first: an AMM
  // above the reference is no reason to observe then. A drop still is (the
  // decay only accrues through observations).
  const depositWaits = (tk: FeeTokenPreview) => tk.outcome === "WarmingUp" || tk.outcome === "TooSoon";
  // Observing is worth asking for when the price was never observed (starts
  // the warm-up), lags the market (routed token: drifts past the deposit
  // tolerance), or is warming up with nobody observing it for
  // STALE_OBSERVATION_SECONDS.
  // Why an observation is due (shown on the matching detail row), null if not.
  const observationDue = (tk: FeeTokenPreview): DueReason => {
    if (!observable(tk)) return null;
    if (tk.refUpdatedAt == null) return "new";
    if (tk.route ? depositDrift(tk, state?.compound.maxPriceDeviationBps ?? 0, !depositWaits(tk)) : lagsMarket(tk)) return "drift";
    if (tk.outcome === "WarmingUp" && nowSec() - tk.refUpdatedAt > STALE_OBSERVATION_SECONDS) return "stale";
    return null;
  };
  const needsObservation = (tk: FeeTokenPreview) => observationDue(tk) != null;
  const ready = (state?.tokens ?? []).filter((tk) => tk.outcome === "Done");
  const observing = (state?.tokens ?? []).filter(observable);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // Pre-select, on each refresh, what is worth sending: sales, and observations that are due.
  React.useEffect(
    () =>
      setSelected(
        new Set([
          ...(state?.tokens ?? []).filter((tk) => tk.outcome === "Done" || needsObservation(tk)).map((tk) => tk.token),
          ...extras.filter((e) => e.worth).map((e) => e.id),
        ]),
      ),
    [state], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectMany = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  // Section 1 display: groups unfolded (the actionable ones by default), tokens with details shown, search.
  const [openTokenGroups, setOpenTokenGroups] = React.useState<Set<TokenGroup>>(new Set(["sell", "deposit", "observe"]));
  const toggleTokenGroup = (g: TokenGroup) =>
    setOpenTokenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const [openTokens, setOpenTokens] = React.useState<Set<string>>(new Set());
  const toggleToken = (id: string) =>
    setOpenTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [tokenQuery, setTokenQuery] = React.useState("");

  /* ---- Transactions ---- */
  const [sending, setSending] = React.useState<Action | null>(null);
  const [txError, setTxError] = React.useState<string | null>(null);
  // Several calls go out under one signature (processFees with compound,
  // compoundQuote, stake; claims and cancellations by PAIR_CALLS_MAX).
  const sendMany = async (action: Action, calls: Array<{ data: string; gas: number }>) => {
    if (!address || !chainId || !feeCollectorAddress || calls.length === 0) return;
    setTxError(null);
    setSending(action);
    try {
      const transactions = await Promise.all(
        calls.map(
          async ({ data, gas }) =>
            new Transaction({
              value: 0n,
              data: new TextEncoder().encode(data),
              receiver: new Address(feeCollectorAddress),
              sender: new Address(address),
              gasLimit: BigInt(
                await estimateGasLimit(networkApiAddress, { sender: address, receiver: feeCollectorAddress, data, chainId }, Math.min(gas, MAX_GAS)),
              ),
              gasPrice: BigInt(GAS_PRICE),
              chainID: chainId,
              version: 1,
            }),
        ),
      );
      await signAndSendTransactions({
        onSignTransactions,
        transactions,
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
  // Sales and deposits first, then observations, the most valuable first in
  // each, within what one transaction can take (MAX_GAS, a deposit costing
  // more than an order): a long list goes out in batches, the biggest amounts
  // in the first one (unpriced tokens last).
  const usdValue = (tk: FeeTokenPreview) => (prices[tk.token] != null ? human(tk.balance, tk.token).times(prices[tk.token]).toNumber() : -1);
  const byValue = (a: FeeTokenPreview, b: FeeTokenPreview) => usdValue(b) - usdValue(a);
  const gasOf = (tk: FeeTokenPreview) => (tk.outcome === "Done" && tk.route ? PROCESS_GAS_PER_DEPOSIT : PROCESS_GAS_PER_TOKEN);
  const selectedReady = ready.filter((tk) => selected.has(tk.token)).sort(byValue);
  const selectedObserve = observing.filter((tk) => selected.has(tk.token)).sort(byValue);
  const processBatch: FeeTokenPreview[] = [];
  let processGas = PROCESS_GAS_BASE;
  for (const tk of [...selectedReady, ...selectedObserve]) {
    if (processGas + gasOf(tk) > MAX_GAS) break;
    processBatch.push(tk);
    processGas += gasOf(tk);
  }
  const processTokens = processBatch.map((tk) => tk.token);
  const processOverflow = selectedReady.length + selectedObserve.length - processBatch.length;
  const sellTokens = processBatch.filter((tk) => tk.outcome === "Done" && !tk.route).map((tk) => tk.token);
  const depositTokens = processBatch.filter((tk) => tk.outcome === "Done" && tk.route).map((tk) => tk.token);
  const observeTokens = processBatch.filter((tk) => tk.outcome !== "Done").map((tk) => tk.token);
  const claimable = (state?.claimable ?? []).filter((c) => c.amount !== "0");
  const claimTotal = claimable.reduce((acc, c) => acc.plus(c.amount), new BigNumber(0));
  // The pairs with something to claim, named: without a list the contract
  // only scans the first pairs of its registry.
  const runClaim = () =>
    sendMany(
      "claim",
      chunks(
        claimable.map((c) => c.pair),
        PAIR_CALLS_MAX,
      ).map((pairs) => ({
        data: ["claimProceeds", ...pairs.map((pair) => new Address(pair).toHex())].join("@"),
        gas: CLAIM_GAS_BASE + CLAIM_GAS_PER_PAIR * pairs.length,
      })),
    );
  // The ids getStaleOrders returned, named: the contract checks each one again
  // at execution time and skips those no longer stale.
  const staleIdsOf = (pair: string) => state?.staleOrderIds[pair] ?? [];
  const runCancelStale = (pair: string) =>
    sendMany(
      "cancel_stale",
      chunks(staleIdsOf(pair), PAIR_CALLS_MAX).map((ids) => ({
        data: ["cancelStaleOrders", new Address(pair).toHex(), ...ids.map((id) => bigToHex(BigInt(id)))].join("@"),
        gas: CANCEL_STALE_GAS_BASE + CANCEL_STALE_GAS_PER_ORDER * ids.length,
      })),
    );
  // compound observes the target token's price too (same warm-up before the
  // first deposit), deposit or not — but, like plan_order, only while the
  // collector holds some: with none, its BelowMinimum comes before the
  // observation step and nothing is stored. Worth asking for, as for the
  // tokens, when never observed, when the AMM drifted past the deposit
  // tolerance (deposits put off below it; the reference only follows on
  // observations), or when nobody observed for STALE_OBSERVATION_SECONDS.
  const compound = state?.compound;
  const compoundObservable =
    !!compound && new BigNumber(state?.targetBalance ?? 0).gt(0) && OBSERVED_OUTCOMES.includes(compound.outcome);
  const compoundDueReason: DueReason = (() => {
    if (!compound || !compoundObservable) return null;
    if (compound.refUpdatedAt == null) return "new";
    if (depositDrift(compound, compound.maxPriceDeviationBps)) return "drift";
    return nowSec() - compound.refUpdatedAt > STALE_OBSERVATION_SECONDS ? "stale" : null;
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
  // EGLD the collector received, shown only while it holds some: staked whole
  // into the target token at the liquid staking contract's rate.
  const stake = state?.stake && new BigNumber(state.stake.egldBalance).gt(0) ? state.stake : null;
  // WEGLD the collector received (the LP pair's quote token), shown only while
  // it holds some: not sold but deposited on the other side of the pair, which
  // buys VOXEGLD only while it trades under its liquid staking rate.
  const quoteToken = state?.compound.quoteToken ?? null;
  const quoteBalance = (quoteToken && state?.tokens.find((tk) => tk.token === quoteToken)?.balance) || "0";
  const quoteDeposit = state?.compoundQuote && new BigNumber(quoteBalance).gt(0) ? state.compoundQuote : null;
  const quoteGap =
    quoteDeposit?.spotPrice != null && quoteDeposit.stakingRate != null && !new BigNumber(quoteDeposit.stakingRate).isZero()
      ? new BigNumber(quoteDeposit.spotPrice).div(quoteDeposit.stakingRate).minus(1).times(100)
      : null;
  // The liquidity side, listed with the collected tokens as tokens to handle
  // among the others, each its own call signed with processFees: the collected
  // VOXEGLD (compound: deposit, or observe its price), the WEGLD received
  // (compoundQuote) and the EGLD received (stake).
  type Extra = {
    kind: "compound" | "quote" | "stake";
    id: string;
    balance: string;
    outcome: FeeOutcome;
    nextAt: number | null;
    badge?: string;
    group: TokenGroup;
    /** Selecting it adds its call. */
    canSelect: boolean;
    /** Pre-selected on refresh. */
    worth: boolean;
  };
  const extras: Extra[] = [];
  if (state && compound && new BigNumber(state.targetBalance).gt(0)) {
    extras.push({
      kind: "compound",
      id: state.targetToken,
      balance: state.targetBalance,
      outcome: compound.outcome,
      nextAt: compound.nextZapAt,
      group: compound.outcome === "Done" ? "deposit" : !compoundObservable ? "blocked" : compoundDue ? "observe" : "wait",
      canSelect: compound.outcome === "Done" || compoundObservable,
      worth: compound.outcome === "Done" || compoundDue,
    });
  }
  if (quoteDeposit && quoteToken) {
    const off = quoteDeposit.outcome === "Disabled" || quoteDeposit.outcome === "PairUnavailable";
    extras.push({
      kind: "quote",
      id: quoteToken,
      balance: quoteBalance,
      outcome: quoteDeposit.outcome,
      nextAt: quoteDeposit.nextZapAt,
      badge: quoteDeposit.outcome === "PriceOutOfBounds" ? t("fees_quote_at_rate_badge") : undefined,
      group: quoteDeposit.outcome === "Done" ? "deposit" : off ? "blocked" : "wait",
      canSelect: quoteDeposit.outcome === "Done",
      worth: quoteDeposit.outcome === "Done",
    });
  }
  if (stake) {
    extras.push({
      kind: "stake",
      id: "EGLD",
      balance: stake.egldBalance,
      outcome: stake.outcome,
      nextAt: null,
      badge: stake.outcome === "PairUnavailable" ? t("fees_stake_paused_badge") : undefined,
      group: stake.outcome === "Done" ? "deposit" : stake.outcome === "BelowMinimum" ? "wait" : "blocked",
      canSelect: stake.outcome === "Done",
      worth: stake.outcome === "Done",
    });
  }
  const extraCalls = extras
    .filter((e) => e.canSelect && selected.has(e.id))
    .map((e) => ({
      e,
      data: e.kind === "compound" ? "compound" : e.kind === "quote" ? "compoundQuote" : "stake",
      gas: e.kind === "stake" ? STAKE_GAS_LIMIT : COMPOUND_GAS_LIMIT,
    }));
  const nSell = sellTokens.length;
  const nDeposit = depositTokens.length + extraCalls.filter(({ e }) => e.outcome === "Done").length;
  const nObserve = observeTokens.length + extraCalls.filter(({ e }) => e.outcome !== "Done").length;
  const processAction: Action = nDeposit > 0 ? "process_lp" : nSell > 0 ? "process" : "observe";
  const runProcess = () =>
    sendMany(processAction, [
      ...(processTokens.length > 0 ? [{ data: ["processFees", ...processTokens.map(strToHex)].join("@"), gas: processGas }] : []),
      ...extraCalls.map(({ data, gas }) => ({ data, gas })),
    ]);
  const observationWorth =
    observing.some((tk) => selected.has(tk.token) && needsObservation(tk)) || extraCalls.some(({ e }) => e.kind === "compound" && compoundDue);

  /* ---- Styles (same as the other views) ---- */
  const inner = "dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4";
  const label = "dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400";
  const hint = "dvx:text-[11px] dvx:text-gray-400 dvx:leading-relaxed";
  const actionBtn = (action: Action, text: string, onClick: () => void, disabled: boolean, secondary = false) => (
    <button
      onClick={!address ? onConnect : onClick}
      disabled={!address ? !onConnect : disabled || sending != null}
      style={{ minHeight: "36px" }}
      title={address ? text : undefined}
      className={`${
        secondary && address
          ? "dvx:rounded-xl dvx:border dvx:border-gray-300 dvx:dark:border-[#444] dvx:bg-transparent dvx:text-gray-600 dvx:dark:text-gray-300 dvx:hover:bg-gray-100 dvx:dark:hover:bg-[#262626] dvx:font-semibold"
          : "dinoButton orange"
      } dvx:w-full dvx:min-w-0 dvx:overflow-hidden dvx:text-ellipsis dvx:text-sm ${address ? "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed" : ""}`}
    >
      {!address ? t("btn_connect") : sending === action ? t("dca_btn_signing") : text}
    </button>
  );
  const outcomeBadge = (outcome: FeeOutcome, nextAt: number | null, text?: string) => {
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
        {text ?? (outcome === "TooSoon" && nextAt != null ? t("fees_outcome_TooSoon_in", { when: inDuration(nextAt) }) : t(`fees_outcome_${outcome}`))}
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
  const warmupText = (endsAt: number | null, prefix: "fees_warmup" | "fees_route_warmup" | "fees_compound_warmup") =>
    endsAt != null ? t(`${prefix}_ends_in`, { when: inDuration(endsAt) }) : t(`${prefix}_not_started`, { hours: warmupHours, token: tickerOf(target) });
  const rank = (o: FeeOutcome) => (o === "Done" ? 0 : o === "WarmingUp" ? 1 : 2);
  // The quote token is never sold: it has its own block, next to compound.
  const others = (state?.tokens ?? []).filter((tk) => tk.outcome !== "QuoteToken").sort((a, b) => {
    if (rank(a.outcome) !== rank(b.outcome)) return rank(a.outcome) - rank(b.outcome);
    const ua = prices[a.token] != null ? human(a.balance, a.token).times(prices[a.token]).toNumber() : 0;
    const ub = prices[b.token] != null ? human(b.balance, b.token).times(prices[b.token]).toNumber() : 0;
    return ub - ua;
  });
  // Tokens the owner routed to a pool's liquidity instead of the order book (setLpRoute).
  const routedHeld = others.filter((tk) => tk.route);
  const routePair = (tk: FeeTokenPreview) => `${tickerOf(tk.token)}/${tk.route?.otherToken ? tickerOf(tk.route.otherToken) : "?"}`;

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card className="dvx:border-2 dvx:border-cyan-500/20" title={header} description={t("fees_desc")}>
        <div className="dvx:space-y-3 dvx:mt-4">
          <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3">
            <div className="dvx:space-y-1.5">
              <p className={hint} style={{ margin: 0 }}>
                {t("fees_intro", { target: target ? tickerOf(target) : "VOXEGLD" })}
              </p>
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
              {/* 1. Collected tokens → sell orders, or LP deposits for the routed ones (processFees) */}
              <div className={`${inner} dvx:space-y-3`}>
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
                  <p className={label} style={{ margin: 0 }}>
                    {t(routedHeld.length > 0 || extras.length > 0 ? "fees_tokens_title_routes" : "fees_tokens_title")}
                  </p>
                  <span className="dvx:text-[11px] dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                    {t("fees_tokens_ready", { n: ready.length + extras.filter((e) => e.outcome === "Done").length, total: others.length + extras.length })}
                  </span>
                </div>
                {others.length + extras.length === 0 ? (
                  <p className="dvx:text-sm dvx:text-gray-400">{t("fees_tokens_empty")}</p>
                ) : (
                  (() => {
                    // Grouped by what can be done about them, one compact line per token: with
                    // every DEX pair's fees landing here the list runs into the dozens. The
                    // actionable groups open, the others folded; details on demand per token.
                    const groupOf = (tk: FeeTokenPreview): TokenGroup =>
                      tk.outcome === "Done"
                        ? tk.route
                          ? "deposit"
                          : "sell"
                        : !observable(tk)
                          ? "blocked"
                          : needsObservation(tk)
                            ? "observe"
                            : "wait";
                    const chevron = (open: boolean) => (
                      <ChevronDown size={14} className="dvx:text-gray-400 dvx:shrink-0 dvx:transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} />
                    );
                    const linkBtn = "dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:hover:underline";
                    const linkStyle = { background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" } as const;
                    const usdSum = (rows: Row[]) => {
                      const priced = rows.filter((r) => prices[r.id] != null);
                      return priced.length ? priced.reduce((s, r) => s + human(r.balance, r.id).times(prices[r.id]).toNumber(), 0) : null;
                    };
                    const detailsBox = "dvx:mt-1.5 dvx:pl-[52px] dvx:space-y-1 dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400";
                    const details = (tk: FeeTokenPreview) => (
                      <div className={detailsBox}>
                        {tk.route && <p style={{ margin: 0 }}>{t("fees_route_text", { pair: routePair(tk) })}</p>}
                        {tk.outcome === "Done" &&
                          (tk.route ? (
                            <p style={{ margin: 0 }}>{t("fees_deposit_preview", { amount: fmt(tk.amount, tk.token), token: tickerOf(tk.token), pair: routePair(tk) })}</p>
                          ) : (
                            <p style={{ margin: 0 }}>
                              {t("fees_order_preview", { amount: fmt(tk.amount, tk.token), token: tickerOf(tk.token), out: fmt(tk.minAmountOut, target), target: tickerOf(target) })}
                            </p>
                          ))}
                        {tk.outcome === "WarmingUp" && <p style={{ margin: 0 }}>{warmupText(tk.warmupEndsAt, tk.route ? "fees_route_warmup" : "fees_warmup")}</p>}
                        {tk.outcome === "PoolTooSmall" && (
                          <p style={{ margin: 0 }}>
                            {t("fees_pool_too_small_text", { pair: `${tickerOf(tk.token)}/${tickerOf(target)}` })}{" "}
                            <button type="button" onClick={() => goTo("add-liquidity", { tokenA: tk.token, tokenB: target })} className={linkBtn} style={linkStyle}>
                              {t("fees_pool_too_small_cta")}
                            </button>
                          </p>
                        )}
                        {tk.outcome === "NoPair" && (
                          <p style={{ margin: 0 }}>
                            {t("fees_no_pair_text", { pair: `${tickerOf(tk.token)}/${tickerOf(target)}` })}{" "}
                            {/* CreatePool only preselects tokens the wallet holds (tokenY always, tokenX off mainnet). */}
                            <button type="button" onClick={() => goTo("create-pool", { tokenX: target, tokenY: tk.token })} className={linkBtn} style={linkStyle}>
                              {t("fees_no_pair_cta")}
                            </button>
                          </p>
                        )}
                        {detailGrid(detailRows(tk))}
                      </div>
                    );
                    const pairText = quoteToken ? `${tickerOf(target)}/${tickerOf(quoteToken)}` : "";
                    const extraDetails = (e: Extra) => {
                      if (e.kind === "compound" && compound) {
                        return (
                          <div className={detailsBox}>
                            <p style={{ margin: 0 }}>
                              {compound.quoteToken ? t("fees_compound_side_hint", { token: tickerOf(target), pair: pairText }) : t("fees_compound_off")}
                            </p>
                            {compound.outcome === "Done" && (
                              <p style={{ margin: 0 }}>{t("fees_deposit_preview", { amount: fmt(compound.amount, target), token: tickerOf(target), pair: pairText })}</p>
                            )}
                            {compound.outcome === "WarmingUp" && <p style={{ margin: 0 }}>{warmupText(compound.warmupEndsAt, "fees_compound_warmup")}</p>}
                            {compound.quoteToken &&
                              detailGrid([
                                ...priceRows(compound, tickerOf(compound.quoteToken), compoundObservable, compoundDueReason),
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
                          </div>
                        );
                      }
                      if (e.kind === "quote" && quoteDeposit && quoteToken) {
                        return (
                          <div className={detailsBox}>
                            <p style={{ margin: 0 }}>
                              {quoteDeposit.outcome === "Disabled"
                                ? t("fees_quote_off", { quote: tickerOf(quoteToken) })
                                : quoteDeposit.outcome === "PriceOutOfBounds"
                                  ? t("fees_quote_at_rate", { token: tickerOf(target) })
                                  : quoteDeposit.outcome === "PairUnavailable"
                                    ? t("fees_quote_unavailable")
                                    : quoteDeposit.outcome === "BelowMinimum"
                                      ? t("fees_quote_below_min")
                                      : t("fees_quote_hint", { quote: tickerOf(quoteToken), token: tickerOf(target), pair: pairText })}
                            </p>
                            {quoteDeposit.outcome === "Done" && (
                              <p style={{ margin: 0 }}>
                                {t("fees_deposit_preview", { amount: fmt(quoteDeposit.amount, quoteToken), token: tickerOf(quoteToken), pair: pairText })}
                              </p>
                            )}
                            {detailGrid([
                              ...(quoteDeposit.spotPrice != null
                                ? [{ label: t("fees_quote_spot", { token: tickerOf(target) }), value: `${fmtPrice(quoteDeposit.spotPrice)} ${tickerOf(quoteToken)}` }]
                                : []),
                              ...(quoteDeposit.stakingRate != null ? [{ label: t("fees_quote_rate"), value: `${fmtPrice(quoteDeposit.stakingRate)} EGLD` }] : []),
                              ...(quoteGap != null ? [{ label: t("fees_quote_gap"), value: `${signedPct(quoteGap)} %` }] : []),
                            ])}
                          </div>
                        );
                      }
                      if (e.kind === "stake" && stake) {
                        return (
                          <div className={detailsBox}>
                            <p style={{ margin: 0 }}>
                              {stake.outcome === "Disabled"
                                ? t("fees_stake_off")
                                : stake.outcome === "PairUnavailable"
                                  ? t("fees_stake_paused")
                                  : stake.outcome === "BelowMinimum"
                                    ? t("fees_stake_below_min", { min: fmt(STAKE_MIN_RAW, "EGLD") })
                                    : t("fees_stake_hint", { token: tickerOf(target) })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    };
                    // Collected tokens and the liquidity side, one row type, sorted by value (unpriced last).
                    type Row = {
                      id: string;
                      balance: string;
                      outcome: FeeOutcome;
                      nextAt: number | null;
                      badge?: string;
                      tag?: { text: string; title: string };
                      group: TokenGroup;
                      canSelect: boolean;
                      details: () => React.ReactNode;
                    };
                    const rowValue = (r: Row) => (prices[r.id] != null ? human(r.balance, r.id).times(prices[r.id]).toNumber() : -1);
                    const allRows: Row[] = [
                      ...others.map((tk) => ({
                        id: tk.token,
                        balance: tk.balance,
                        outcome: tk.outcome,
                        nextAt: tk.nextOrderAt,
                        tag: tk.route ? { text: "LP", title: t("fees_route_badge_title", { pair: routePair(tk) }) } : undefined,
                        group: groupOf(tk),
                        canSelect: groupOf(tk) !== "blocked",
                        details: () => details(tk),
                      })),
                      ...extras.map((e) => ({
                        id: e.id,
                        balance: e.balance,
                        outcome: e.outcome,
                        nextAt: e.nextAt,
                        badge: e.badge,
                        tag:
                          e.kind === "stake"
                            ? { text: "STAKE", title: t("fees_stake_tag_title", { token: tickerOf(target) }) }
                            : { text: "LP", title: t("fees_route_badge_title", { pair: pairText }) },
                        group: e.group,
                        canSelect: e.canSelect,
                        details: () => extraDetails(e),
                      })),
                    ].sort((a, b) => rowValue(b) - rowValue(a));
                    const q = tokenQuery.trim().toUpperCase();
                    const shown = q ? allRows.filter((r) => r.id.toUpperCase().includes(q)) : allRows;
                    const groups = (["sell", "deposit", "observe", "wait", "blocked"] as TokenGroup[])
                      .map((g) => ({ g, rows: shown.filter((r) => r.group === g) }))
                      .filter(({ rows }) => rows.length > 0);
                    return (
                      <>
                        {allRows.length > TOKEN_SEARCH_FROM && (
                          <input
                            type="search"
                            value={tokenQuery}
                            onChange={(e) => setTokenQuery(e.target.value)}
                            placeholder={t("fees_tokens_search")}
                            className="dvx:w-full dvx:rounded-lg dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-white dvx:dark:bg-[#161616] dvx:px-3 dvx:py-1.5 dvx:text-xs dvx:text-gray-900 dvx:dark:text-white dvx:outline-none dvx:focus:border-amber-500"
                          />
                        )}
                        <div className="dvx:divide-y dvx:divide-gray-200 dvx:dark:divide-[#333]">
                          {groups.map(({ g, rows }) => {
                            const open = q !== "" || openTokenGroups.has(g);
                            const selectable = rows.filter((r) => r.canSelect);
                            const canSelect = selectable.length > 0;
                            const allSelected = canSelect && selectable.every((r) => selected.has(r.id));
                            const total = usdSum(rows);
                            return (
                              <div key={g} className="dvx:py-2">
                                <div className="dvx:flex dvx:items-center dvx:gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleTokenGroup(g)}
                                    className="dvx:flex-1 dvx:flex dvx:items-center dvx:gap-2 dvx:text-left dvx:min-w-0"
                                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                  >
                                    {chevron(open)}
                                    <span className="dvx:text-xs dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">{t(`fees_group_${g}`)}</span>
                                    <span className="dvx:text-[11px] dvx:text-gray-400">
                                      {rows.length}
                                      {total != null && ` · ≈ $${total.toFixed(2)}`}
                                    </span>
                                  </button>
                                  {canSelect && open && (
                                    <button
                                      type="button"
                                      onClick={() => selectMany(selectable.map((r) => r.id), !allSelected)}
                                      className={`dvx:text-[11px] ${linkBtn}`}
                                      style={linkStyle}
                                    >
                                      {allSelected ? t("fees_group_select_none") : t("fees_group_select_all")}
                                    </button>
                                  )}
                                </div>
                                {open && (
                                  <div className="dvx:mt-1">
                                    {rows.map((r) => {
                                      const unfolded = openTokens.has(r.id);
                                      return (
                                        <div key={r.id} className="dvx:py-1">
                                          <div className="dvx:flex dvx:items-center dvx:gap-2">
                                            <input
                                              type="checkbox"
                                              checked={r.canSelect && selected.has(r.id)}
                                              disabled={!r.canSelect}
                                              onChange={() => toggle(r.id)}
                                              style={{ width: 14, height: 14, flexShrink: 0, accentColor: "#f59e0b", cursor: "pointer", visibility: r.canSelect ? "visible" : "hidden" }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => toggleToken(r.id)}
                                              className="dvx:flex-1 dvx:flex dvx:items-center dvx:gap-2 dvx:text-left dvx:min-w-0"
                                              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                            >
                                              <TokenLogo url={meta[r.id]?.logoUrl ?? null} ticker={tickerOf(r.id)} />
                                              <span className="dvx:text-xs dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:whitespace-nowrap">{tickerOf(r.id)}</span>
                                              {r.tag && (
                                                <span
                                                  title={r.tag.title}
                                                  className="dvx:text-[9px] dvx:font-bold dvx:px-1.5 dvx:rounded dvx:bg-cyan-100 dvx:dark:bg-cyan-900/30 dvx:text-cyan-700 dvx:dark:text-cyan-400"
                                                >
                                                  {r.tag.text}
                                                </span>
                                              )}
                                              <span className="dvx:flex-1 dvx:min-w-0 dvx:truncate dvx:text-[11px] dvx:tabular-nums dvx:text-gray-500 dvx:dark:text-gray-400">
                                                {fmtShort(r.balance, r.id)}
                                                {usd(r.balance, r.id) && ` · ${usd(r.balance, r.id)}`}
                                              </span>
                                              {outcomeBadge(r.outcome, r.nextAt, r.badge)}
                                              {chevron(unfolded)}
                                            </button>
                                          </div>
                                          {unfolded && r.details()}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {groups.length === 0 && <p className="dvx:py-2 dvx:text-xs dvx:text-gray-400" style={{ margin: 0 }}>{t("fees_tokens_no_match")}</p>}
                        </div>
                      </>
                    );
                  })()
                )}
                {actionBtn(
                  processAction,
                  nDeposit > 0
                    ? nSell + nObserve > 0
                      ? t("fees_process_btn_mixed", { n: nSell + nDeposit + nObserve })
                      : t("fees_deposit_btn", { n: nDeposit })
                    : nSell > 0 && nObserve > 0
                      ? t("fees_process_btn_both", { n: nSell, m: nObserve })
                      : nSell > 0
                        ? t("fees_process_btn", { n: nSell })
                        : nObserve > 0
                          ? t("fees_observe_btn", { n: nObserve })
                          : t("fees_process_none"),
                  runProcess,
                  processTokens.length + extraCalls.length === 0 || state.paused,
                  nSell + nDeposit === 0 && !observationWorth,
                )}
                {processOverflow > 0 && (
                  <p className="dvx:text-[11px] dvx:text-amber-600 dvx:dark:text-amber-400" style={{ margin: 0 }}>
                    {t("fees_process_max", { max: processTokens.length, n: processOverflow })}
                  </p>
                )}
                <p className={hint} style={{ margin: 0 }}>
                  {t("fees_process_hint")}
                  {observing.length > 0 && ` ${t("fees_warmup_hint", { hours: warmupHours })}`}
                </p>
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
                  (() => {
                    const view = orders.map((o) => {
                      const initial = new BigNumber(o.amountInInitial);
                      const remaining = new BigNumber(o.amountInRemaining);
                      const filledPct = initial.gt(0) ? initial.minus(remaining).div(initial).times(100) : new BigNumber(0);
                      const price = new BigNumber(o.price).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(o.tokenInDecimals - o.tokenOutDecimals);
                      // How far above the AMM the order sits: the backend's AMM price of the order's
                      // own pair, same scale as its price (also there once a token sits wholly in orders).
                      const spot = o.spotPrice ? new BigNumber(o.spotPrice).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(o.tokenInDecimals - o.tokenOutDecimals) : null;
                      const vsSpot = spot && !new BigNumber(spot).isZero() ? price.div(spot).minus(1).times(100) : null;
                      const status = o.status === "active" && filledPct.gt(0) ? "partial" : o.status;
                      const age = nowSec() - Math.floor(Date.parse(o.createdAt) / 1000);
                      return { o, initial, remaining, price, vsSpot, status, age };
                    });
                    type OrderView = (typeof view)[number];
                    // Active orders grouped by pair and direction: they pile up on the same
                    // token while the market falls, one line each would flood the tab.
                    const groups = new Map<string, OrderView[]>();
                    for (const v of view) {
                      if (v.o.status !== "active") continue;
                      const key = `${v.o.tokenIn}>${v.o.tokenOut}`;
                      groups.set(key, [...(groups.get(key) ?? []), v]);
                    }
                    const closed = view.filter((v) => v.o.status !== "active");
                    const amount = (v: OrderView, raw: BigNumber) => fmtShortDec(raw, v.o.tokenInDecimals);
                    const pctText = (v: OrderView) => (v.vsSpot != null ? `${signedPct(v.vsSpot)} %` : "—");
                    const chevron = (open: boolean) => (
                      <ChevronDown size={14} className="dvx:text-gray-400 dvx:shrink-0 dvx:transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} />
                    );
                    // One line per order: amount (left / initial when partly filled), price,
                    // gap to the AMM (status once closed), age. Tickers only when the rows mix pairs.
                    const head = "dvx:text-[10px] dvx:text-gray-400";
                    const table = (rows: OrderView[], mixed: boolean) => (
                      <div
                        className="dvx:grid dvx:gap-x-3 dvx:gap-y-1 dvx:text-[11px] dvx:tabular-nums dvx:text-gray-700 dvx:dark:text-gray-300"
                        style={{ gridTemplateColumns: "auto 1fr auto auto" }}
                      >
                        <span className={head}>{t("fees_orders_col_amount")}</span>
                        <span className={head}>{mixed ? t("fees_orders_col_price") : t("fees_orders_col_price_in", { token: rows[0].o.tokenOutTicker })}</span>
                        <span className={`${head} dvx:text-right`}>{mixed ? t("fees_orders_col_status") : t("fees_orders_col_vs")}</span>
                        <span className={`${head} dvx:text-right`}>{t("fees_orders_col_age")}</span>
                        {rows.map((v) => (
                          <React.Fragment key={`${v.o.pairAddr}:${v.o.orderId}`}>
                            <span className="dvx:whitespace-nowrap">
                              {v.status === "partial" ? `${amount(v, v.remaining)} / ${amount(v, v.initial)}` : amount(v, v.initial)}
                              {mixed && ` ${v.o.tokenInTicker}`}
                            </span>
                            <span className="dvx:truncate" title={`1 ${v.o.tokenInTicker} = ${v.price.toFixed()} ${v.o.tokenOutTicker}`}>
                              {fmtPrice(v.price.toFixed())}
                              {mixed && ` ${v.o.tokenOutTicker}`}
                            </span>
                            <span
                              className={`dvx:text-right dvx:whitespace-nowrap ${
                                v.status === "filled" ? "dvx:text-green-600 dvx:dark:text-green-400" : v.status === "partial" ? "dvx:text-amber-600 dvx:dark:text-amber-400" : ""
                              }`}
                            >
                              {mixed || v.o.status !== "active" ? t(`fees_orders_status_${v.status}`) : pctText(v)}
                            </span>
                            {staleIdsOf(v.o.pairAddr).includes(v.o.orderId) ? (
                              <span className="dvx:text-right dvx:whitespace-nowrap dvx:text-amber-600 dvx:dark:text-amber-400" title={t("fees_orders_stale_title")}>
                                {durationText(v.age)}
                              </span>
                            ) : (
                              <span className="dvx:text-right dvx:whitespace-nowrap dvx:text-gray-400">{durationText(v.age)}</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                    return (
                      <div className="dvx:divide-y dvx:divide-gray-200 dvx:dark:divide-[#333]">
                        {[...groups.entries()].map(([key, rows]) => {
                          const first = rows[0].o;
                          const open = openGroups.has(key);
                          const left = rows.reduce((s, v) => s.plus(v.remaining), new BigNumber(0));
                          // Lowest price = closest to the market, the first one to fill.
                          const best = rows.reduce((a, b) => (b.price.lt(a.price) ? b : a));
                          const oldest = Math.max(...rows.map((v) => v.age));
                          return (
                            <div key={key} className="dvx:py-2">
                              <button
                                type="button"
                                onClick={() => toggleGroup(key)}
                                className="dvx:w-full dvx:flex dvx:items-center dvx:gap-2.5 dvx:text-left"
                                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                              >
                                <TokenLogo url={first.tokenInLogoUrl} ticker={first.tokenInTicker} />
                                <div className="dvx:flex-1 dvx:min-w-0">
                                  <div className="dvx:flex dvx:items-baseline dvx:justify-between dvx:gap-2">
                                    <span className="dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:truncate">
                                      {first.tokenInTicker} → {first.tokenOutTicker}
                                      <span className="dvx:ml-1.5 dvx:text-[11px] dvx:font-normal dvx:text-gray-400">{t("fees_orders_group_count", { n: rows.length })}</span>
                                    </span>
                                    <span className="dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:whitespace-nowrap">
                                      {fmtShortDec(left, first.tokenInDecimals)} {first.tokenInTicker}
                                    </span>
                                  </div>
                                  <div className="dvx:text-[11px] dvx:text-gray-400 dvx:truncate">
                                    {t("fees_orders_group_summary", { pct: pctText(best), ago: durationText(oldest) })}
                                  </div>
                                </div>
                                {chevron(open)}
                              </button>
                              {open && (
                                <div className="dvx:mt-2 dvx:pl-[34px] dvx:space-y-1.5">
                                  {table(rows, false)}
                                  {state.staleOrders && (
                                    <>
                                      <p className={hint} style={{ margin: 0 }}>
                                        {t("fees_cancel_stale_hint", {
                                          age: longDuration(state.staleOrders.minAgeSeconds),
                                          pct: state.staleOrders.minSpotDeviationBps / 100,
                                        })}
                                      </p>
                                      {staleIdsOf(first.pairAddr).length > 0 &&
                                        actionBtn(
                                          "cancel_stale",
                                          t("fees_cancel_stale_btn", { n: staleIdsOf(first.pairAddr).length }),
                                          () => runCancelStale(first.pairAddr),
                                          state.paused,
                                          true,
                                        )}
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => goTo("limit", { from: first.tokenIn, to: first.tokenOut })}
                                    className="dvx:text-[11px] dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:hover:underline"
                                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                                  >
                                    {t("fees_orders_book_link")}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {closed.length > 0 && (
                          <div className="dvx:py-2">
                            <button
                              type="button"
                              onClick={() => toggleGroup("closed")}
                              className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:text-[11px] dvx:text-gray-400"
                              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                            >
                              {t("fees_orders_closed", { n: closed.length })}
                              {chevron(openGroups.has("closed"))}
                            </button>
                            {openGroups.has("closed") && <div className="dvx:mt-2 dvx:opacity-70">{table(closed, true)}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })()
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
            </>
          )}

          {txError && (
            <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
              {txError}
            </div>
          )}
          <p className={hint} style={{ margin: 0 }}>{t("fees_open_to_all")}</p>
        </div>
      </Card>
    </div>
  );
};
