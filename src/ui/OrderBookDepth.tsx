import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";

/*
 * Order-book depth of a DinoVox pair (GET /orderbook/depth/:pairAddr),
 * shown as a Binance-style price ladder (asks above, spot in the middle,
 * bids below) rather than a cumulative-area chart — the SVG staircase this
 * replaced was hard to read and visually hid one side whenever the two
 * tokens' prices differed a lot (cf. widget conversation, 2026-10-27).
 *
 * The backend aggregates by the contract's price buckets
 * (bucket_id = log2_floor(price)): one bucket spans a factor 2 in price —
 * each row below is one bucket, not one individual on-chain order.
 *
 * One axis for both sides: price of tokenA in tokenB.
 *  - asks (tokenAToTokenB, makers sell A for B): raw price = B per A.
 *  - bids (tokenBToTokenA, makers sell B for A): raw price = A per B → inverted.
 * "Total" (cumulative) is expressed in tokenB for both sides: bids escrow B
 * directly, asks are valued at their bucket's geometric mid price (an
 * approximation — exact amounts are in tokenA, cf. `amount`). Cumulated
 * outward from the spread (closest-to-spot row first on each side) — the
 * row background bar width is that running total relative to its OWN
 * side's max, so both sides fill their space the same way regardless of
 * how the two tokens' prices compare (no shared/skewed scale).
 */

interface DepthBucket {
  bucketId: number;
  priceLowerBound: string; // raw, PRICE_SCALE = 1e18, token raw units
  totalAmountRemaining: string; // raw, in the escrowed token
  orderCount: number;
}

interface DepthResponse {
  tokenA: string;
  tokenB: string;
  tokenAToTokenB: DepthBucket[];
  tokenBToTokenA: DepthBucket[];
}

interface Band {
  side: "bid" | "ask";
  bucketId: number;
  /** Row added for the order being prepared (no existing order in that bucket). */
  previewOnly?: boolean;
  lo: number; // price of A in B (human)
  hi: number;
  amount: number; // in the escrowed token (A for asks, B for bids), human
  valueB: number; // depth contribution, in tokenB
  cum: number; // cumulative depth (tokenB) from the spread outward
  orders: number;
}

const PRICE_SCALE_DEC = 18;
const BID = "#16a34a"; // green-600
const ASK = "#dc2626"; // red-600
const ROWS_PER_SIDE = 10; // closest to spot, like a standard exchange ladder

const fmtNum = (v: number) => {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(2)}k`;
  if (a >= 1) return v.toFixed(a >= 100 ? 1 : 3);
  return v.toPrecision(3);
};

export function OrderBookDepth({
  apiUrl,
  pairAddr,
  tokenA,
  tokenB,
  decimalsA,
  decimalsB,
  tickerA,
  tickerB,
  spotAinB,
  preview,
}: {
  apiUrl: string;
  pairAddr: string;
  /** Pair's on-chain tokenA / tokenB (the depth arrays are expressed in that order). */
  tokenA: string;
  tokenB: string;
  decimalsA: number;
  decimalsB: number;
  tickerA: string;
  tickerB: string;
  /** AMM spot (1 A = x B), drawn as a reference line when known. */
  spotAinB?: number | null;
  /**
   * Order being prepared (LimitOrders): highlighted in the bucket the contract
   * will file it under. side "ask" = escrows tokenA, "bid" = escrows tokenB;
   * priceRaw = the contract's raw price for that queue,
   * ceil(min_amount_out * 1e18 / amount_in); amount = human, escrowed token.
   */
  preview?: { side: "ask" | "bid"; priceRaw: string; amount: number } | null;
}) {
  const { t } = useTranslation("swap");
  const [data, setData] = React.useState<DepthResponse | null | undefined>(undefined); // undefined = loading, null = error
  React.useEffect(() => {
    let cancelled = false;
    setData(undefined);
    axios
      .get<DepthResponse>(`${apiUrl}/orderbook/depth/${pairAddr}`)
      .then((res) => !cancelled && setData(res.data))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [apiUrl, pairAddr]);

  const bands: Band[] = React.useMemo(() => {
    if (!data) return [];
    // Defensive: the response order must match the pair's — swap if reversed.
    const flipped = data.tokenA === tokenB && data.tokenB === tokenA;
    const askRaw = flipped ? data.tokenBToTokenA : data.tokenAToTokenB;
    const bidRaw = flipped ? data.tokenAToTokenB : data.tokenBToTokenA;
    const human = (raw: string, decIn: number, decOut: number) =>
      new BigNumber(raw).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(decIn - decOut).toNumber();

    const asks = askRaw
      .map((b) => {
        const lo = human(b.priceLowerBound, decimalsA, decimalsB); // B per A
        const amount = new BigNumber(b.totalAmountRemaining).shiftedBy(-decimalsA).toNumber();
        return { side: "ask" as const, bucketId: b.bucketId, lo, hi: lo * 2, amount, valueB: amount * lo * Math.SQRT2, cum: 0, orders: b.orderCount };
      })
      .filter((b) => b.lo > 0 && b.amount > 0)
      .sort((a, b) => a.lo - b.lo);
    const bids = bidRaw
      .map((b) => {
        const aPerB = human(b.priceLowerBound, decimalsB, decimalsA); // A per B, range [x, 2x)
        const amount = new BigNumber(b.totalAmountRemaining).shiftedBy(-decimalsB).toNumber();
        // B per A range: (1/(2x), 1/x]
        return { side: "bid" as const, bucketId: b.bucketId, lo: 1 / (2 * aPerB), hi: 1 / aPerB, amount, valueB: amount, cum: 0, orders: b.orderCount };
      })
      .filter((b) => Number.isFinite(b.lo) && b.lo > 0 && b.amount > 0)
      .sort((a, b) => b.hi - a.hi);
    let c = 0;
    for (const b of asks) b.cum = c += b.valueB;
    c = 0;
    for (const b of bids) b.cum = c += b.valueB;
    return [...bids, ...asks];
  }, [data, tokenA, tokenB, decimalsA, decimalsB]);

  // Bucket of the order being prepared — same rule as the contract:
  // bucket_id = log2_floor(price) (orderbook.rs::bucket_id_for_price).
  const previewBucket = (() => {
    if (!preview) return null;
    try {
      const raw = BigInt(preview.priceRaw);
      if (raw <= 0n) return null;
      const id = raw.toString(2).length - 1;
      const lowerRaw = (1n << BigInt(id)).toString();
      const human = (decIn: number, decOut: number) =>
        new BigNumber(lowerRaw).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(decIn - decOut).toNumber();
      if (preview.side === "ask") {
        const lo = human(decimalsA, decimalsB);
        return { id, side: "ask" as const, lo, hi: lo * 2 };
      }
      const aPerB = human(decimalsB, decimalsA);
      return { id, side: "bid" as const, lo: 1 / (2 * aPerB), hi: 1 / aPerB };
    } catch {
      return null;
    }
  })();
  const isPreviewBand = (b: Band) => !!previewBucket && b.side === previewBucket.side && b.bucketId === previewBucket.id;

  const box = "dvx:mt-2 dvx:rounded-xl dvx:bg-gray-50 dvx:dark:bg-[#1a1a1a] dvx:p-3";
  if (data === undefined)
    return <div className={box} style={{ fontSize: 12 }}><span className="dvx:text-gray-400">{t("depth_loading")}</span></div>;
  if (data === null)
    return <div className={box} style={{ fontSize: 12 }}><span className="dvx:text-gray-400">{t("depth_unavailable")}</span></div>;
  if (bands.length === 0 && !previewBucket)
    return <div className={box} style={{ fontSize: 12 }}><span className="dvx:text-gray-400">{t("depth_empty")}</span></div>;

  // Closest-to-spot rows first on each side (bands is already sorted that
  // way, cf. the memo above) — cap the ladder to a fixed row count like a
  // standard exchange book.
  const allBids = bands.filter((b) => b.side === "bid");
  const allAsks = bands.filter((b) => b.side === "ask");
  // The preview's bucket always stays visible, even beyond the row cap; an
  // empty bucket gets a dedicated row.
  const keep = (list: Band[]) => list.filter((b, i) => i < ROWS_PER_SIDE || isPreviewBand(b));
  const bids = keep(allBids);
  const asks = keep(allAsks);
  if (previewBucket && !bands.some(isPreviewBand)) {
    const virt: Band = {
      side: previewBucket.side,
      bucketId: previewBucket.id,
      previewOnly: true,
      lo: previewBucket.lo,
      hi: previewBucket.hi,
      amount: 0,
      valueB: 0,
      cum: 0,
      orders: 0,
    };
    (previewBucket.side === "ask" ? asks : bids).push(virt);
  }
  // cum grows monotonically away from the spot within each (already sorted)
  // side, so the last shown row holds the largest cum among shown rows —
  // used for the overall B/S ratio below, which SHOULD reflect the true
  // (price-weighted) economic split between the two sides.
  // max (not "last row"): a preview-only row (cum 0) may be appended at the end.
  const maxCumBid = Math.max(0, ...bids.map((b) => b.cum)) || 1;
  const maxCumAsk = Math.max(0, ...asks.map((b) => b.cum)) || 1;
  const bidPct = maxCumBid + maxCumAsk > 0 ? (maxCumBid / (maxCumBid + maxCumAsk)) * 100 : 50;
  // Per-ROW bar width is based on each row's own `amount` instead — cum is
  // price-weighted and buckets span a factor 2 each, so across 10 rows the
  // cumulative total can span a 1000x+ range (dominated by the few
  // farthest-from-spot, highest-priced rows), making every other row's bar
  // imperceptible even though order sizes are actually comparable across
  // price levels. `amount` (native token, price-independent) stays within
  // a much tighter range, so bars stay legible on every row — the precise
  // cumulative total is still shown as exact text, this only changes what
  // the background bar visualizes.
  const maxAmountBid = Math.max(...bids.map((b) => b.amount), 0) || 1;
  const maxAmountAsk = Math.max(...asks.map((b) => b.amount), 0) || 1;

  const row = (b: Band, key: string) => {
    const color = b.side === "ask" ? ASK : BID;
    const maxAmount = b.side === "ask" ? maxAmountAsk : maxAmountBid;
    const pct = Math.min(100, (b.amount / maxAmount) * 100);
    const nativeTicker = b.side === "ask" ? tickerA : tickerB;
    if (isPreviewBand(b) && preview) {
      // The user's order-to-be: gold outline + "your order" line with its amount.
      return (
        <div
          key={key}
          className="dvx:relative dvx:rounded-md"
          style={{ boxShadow: "inset 0 0 0 1.5px rgba(245, 158, 11, 0.95)", background: "rgba(245, 158, 11, 0.10)", margin: "2px 0" }}
          title={t("depth_preview_tip", { lo: fmtNum(b.lo), hi: fmtNum(b.hi), b: tickerB })}
        >
          {!b.previewOnly && (
            <div className="dvx:absolute dvx:inset-y-0 dvx:right-0" style={{ width: `${pct}%`, background: color, opacity: 0.2 }} />
          )}
          <div className="dvx:relative dvx:grid dvx:items-center dvx:px-1" style={{ gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, minHeight: 20 }}>
            <span className="dvx:font-medium" style={{ color }}>{fmtNum(b.lo)}</span>
            <span className="dvx:text-right dvx:text-gray-600 dvx:dark:text-gray-300">
              {b.previewOnly ? "—" : `${fmtNum(b.amount)} ${nativeTicker}`}
            </span>
            <span className="dvx:text-right dvx:text-gray-500 dvx:dark:text-gray-400">{b.previewOnly ? "" : `${fmtNum(b.cum)} ${tickerB}`}</span>
          </div>
          <div className="dvx:relative dvx:px-1 dvx:pb-0.5 dvx:font-bold" style={{ fontSize: 10, color: "#f59e0b" }}>
            ➜ {t("depth_preview_row", { amount: `${fmtNum(preview.amount)} ${nativeTicker}` })}
          </div>
        </div>
      );
    }
    return (
      <div key={key} className="dvx:relative" style={{ height: 20 }}>
        <div
          className="dvx:absolute dvx:inset-y-0 dvx:right-0"
          style={{ width: `${pct}%`, background: color, opacity: 0.28 }}
        />
        <div
          className="dvx:relative dvx:grid dvx:items-center dvx:px-1 dvx:h-full"
          style={{ gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11 }}
        >
          <span className="dvx:font-medium" style={{ color }}>{fmtNum(b.lo)}</span>
          <span className="dvx:text-right dvx:text-gray-600 dvx:dark:text-gray-300">
            {fmtNum(b.amount)} {nativeTicker}
          </span>
          <span className="dvx:text-right dvx:text-gray-500 dvx:dark:text-gray-400">
            {fmtNum(b.cum)} {tickerB}
          </span>
        </div>
      </div>
    );
  };

  const spotRow = () => (
    <div
      key="spot"
      className="dvx:flex dvx:items-center dvx:justify-between dvx:px-1 dvx:py-1 dvx:my-0.5 dvx:border-y dvx:border-gray-200 dvx:dark:border-gray-700"
    >
      <span className="dvx:font-bold" style={{ color: "#f59e0b", fontSize: 13 }}>
        {fmtNum(spotAinB as number)}
      </span>
      <span className="dvx:text-gray-400" style={{ fontSize: 10 }}>AMM</span>
    </div>
  );

  // Single price-sorted ladder (highest first) instead of a rigid
  // asks-above/bids-below split — the book is a PASSIVE carnet whose order
  // prices were set whenever each maker created them, not live-updated
  // against the AMM, so an ask can end up priced BELOW spot (a seller
  // asking less than the market) or a bid ABOVE spot (a buyer offering
  // more) — real, visible arbitrage-style mispricings that a fixed split
  // would hide by always drawing red above and green below regardless.
  // The AMM marker is inserted at its actual rank among these prices, not
  // pinned to the middle.
  type Row = { kind: "band"; b: Band } | { kind: "spot" };
  const merged: Row[] = [...asks, ...bids].sort((a, b) => b.lo - a.lo).map((b) => ({ kind: "band", b }));
  if (spotAinB && spotAinB > 0) {
    const idx = merged.findIndex((r) => r.kind === "band" && r.b.lo < spotAinB);
    merged.splice(idx === -1 ? merged.length : idx, 0, { kind: "spot" });
  }

  return (
    <div className={box}>
      <div className="dvx:flex dvx:flex-wrap dvx:items-center dvx:justify-between dvx:gap-2" style={{ fontSize: 11 }}>
        <span className="dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-300">
          {t("depth_axis", { a: tickerA, b: tickerB })}
        </span>
        {/* Legend — identity never color-only: labels + counts */}
        <span className="dvx:flex dvx:items-center dvx:gap-3 dvx:text-gray-500 dvx:dark:text-gray-300">
          <span className="dvx:inline-flex dvx:items-center dvx:gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: BID }} />
            {t("depth_bids", { ticker: tickerA })}
          </span>
          <span className="dvx:inline-flex dvx:items-center dvx:gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: ASK }} />
            {t("depth_asks", { ticker: tickerA })}
          </span>
        </span>
      </div>

      <div
        className="dvx:mt-2 dvx:grid dvx:px-1 dvx:text-gray-400"
        style={{ gridTemplateColumns: "1fr 1fr 1fr", fontSize: 10 }}
      >
        <span>{t("depth_col_price", { b: tickerB })}</span>
        <span className="dvx:text-right">{t("depth_col_amount")}</span>
        <span className="dvx:text-right">{t("depth_col_total", { b: tickerB })}</span>
      </div>

      <div className="dvx:mt-0.5">
        {merged.map((r, i) => (r.kind === "spot" ? spotRow() : row(r.b, `row-${i}`)))}
      </div>

      {maxCumBid + maxCumAsk > 0 && (
        <div className="dvx:mt-2 dvx:px-1">
          <div className="dvx:flex dvx:h-1.5 dvx:rounded-full dvx:overflow-hidden">
            <div style={{ width: `${bidPct}%`, background: BID }} />
            <div style={{ width: `${100 - bidPct}%`, background: ASK }} />
          </div>
          <div className="dvx:flex dvx:justify-between dvx:mt-0.5" style={{ fontSize: 10 }}>
            <span style={{ color: BID }}>{bidPct.toFixed(1)}% B</span>
            <span style={{ color: ASK }}>{(100 - bidPct).toFixed(1)}% S</span>
          </div>
        </div>
      )}

      <p className="dvx:mt-1 dvx:text-gray-400" style={{ fontSize: 10 }}>
        {t("depth_note")}
      </p>
    </div>
  );
}
