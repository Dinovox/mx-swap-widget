import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import type { BookLevel } from "./PriceChart";

/*
 * Order-book depth of a DinoVox pair (GET /orderbook/depth/:pairAddr),
 * shown as a Binance-style price ladder (asks above, spot in the middle,
 * bids below) rather than a cumulative-area chart — the SVG staircase this
 * replaced was hard to read and visually hid one side whenever the two
 * tokens' prices differed a lot (cf. widget conversation, 2026-10-27).
 *
 * The backend aggregates by the contract's price buckets — each one N=4
 * sub-buckets per factor-2 octave as of 2026-10-30 (worst-case spread ~25%
 * within one bucket, down from 100% with N=1) — each row below is one
 * bucket, not one individual on-chain order. See bucketIdForPriceRaw/
 * bucketLowerBoundRaw below, which mirror orderbook.rs::bucket_id_for_price
 * bit for bit (exponent+mantissa split, no fractional root).
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
  priceLowerBound: string; // raw, PRICE_SCALE = 1e36, token raw units
  totalAmountRemaining: string; // raw, in the escrowed token
  orderCount: number;
  /** Lowest / highest raw price among the bucket's active orders (absent on an older backend). */
  minPrice?: string;
  maxPrice?: string;
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
  lo: number; // bucket bounds, price of A in B (human)
  hi: number;
  /**
   * Shown price: the bucket's BEST real order price (lowest ask / highest
   * bid, from minPrice) — falls back to `lo` without it. Bucket bounds alone
   * mislead: two 1:1 orders showed as 0.991 (bid) vs 0.865 (ask).
   */
  price: number;
  /**
   * Price a crossing test can rely on: the real best price when known,
   * otherwise the bucket bound that keeps the test certain (ask: hi, bid: lo).
   */
  sure: number;
  amount: number; // in the escrowed token (A for asks, B for bids), human
  valueB: number; // depth contribution, in tokenB
  cum: number; // cumulative depth (tokenB) from the spread outward
  orders: number;
}

/** Order price scale, 10^PRICE_SCALE_DEC — must match pair/src/orderbook.rs::price_scale() (10^36 since pair V6). */
export const PRICE_SCALE_DEC = 36;
const BID = "#16a34a"; // green-600
const ASK = "#dc2626"; // red-600
const MINE = "#f59e0b"; // amber-500, same as the preview / spot highlight
const ROWS_PER_SIDE = 10; // closest to spot, like a standard exchange ladder

// Mirrors pair/src/orderbook.rs::bucket_id_for_price / bucket_lower_bound
// (revision 2026-10-30) bit for bit — N=2^BUCKET_SUBDIVISION_BITS
// sub-buckets per octave, split as exponent+mantissa (shifts/masks only,
// no fractional root) so this always agrees with the contract's own
// bucket boundaries exactly, never an approximation.
const BUCKET_SUBDIVISION_BITS = 2n;
const BUCKET_SUBDIVISIONS = 1n << BUCKET_SUBDIVISION_BITS; // 4n

function bucketIdForPriceRaw(price: bigint): number {
  if (price <= 0n) return 0;
  const exponent = BigInt(price.toString(2).length - 1); // floor(log2(price))
  if (exponent < BUCKET_SUBDIVISION_BITS) return Number(exponent * BUCKET_SUBDIVISIONS);
  const shift = exponent - BUCKET_SUBDIVISION_BITS;
  const mantissa = (price >> shift) & (BUCKET_SUBDIVISIONS - 1n);
  return Number(exponent * BUCKET_SUBDIVISIONS + mantissa);
}

function bucketLowerBoundRaw(bucketId: number): bigint {
  const bid = BigInt(bucketId);
  const exponent = bid / BUCKET_SUBDIVISIONS;
  const base = 1n << exponent;
  if (exponent < BUCKET_SUBDIVISION_BITS) return base;
  const mantissa = bid % BUCKET_SUBDIVISIONS;
  const shift = exponent - BUCKET_SUBDIVISION_BITS;
  return base + (mantissa << shift);
}

/**
 * Book levels of a pair as prices of `token` in `quote` (best real price per
 * bucket, bucket bound on an older backend) — for overlays outside the depth
 * card (Swap's price chart).
 */
export async function fetchBookLevels(
  apiUrl: string,
  pairAddr: string,
  token: string,
  quote: string,
  decToken: number,
  decQuote: number,
): Promise<BookLevel[]> {
  const { data } = await axios.get<DepthResponse>(`${apiUrl}/orderbook/depth/${pairAddr}`);
  const tokenIsA = data.tokenA === token;
  if ((tokenIsA ? data.tokenB : data.tokenA) !== quote || (!tokenIsA && data.tokenB !== token)) return [];
  const sells = tokenIsA ? data.tokenAToTokenB : data.tokenBToTokenA; // escrow token
  const buys = tokenIsA ? data.tokenBToTokenA : data.tokenAToTokenB; // escrow quote
  const human = (raw: string, decIn: number, decOut: number) =>
    new BigNumber(raw).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(decIn - decOut).toNumber();
  const live = (b: DepthBucket) => new BigNumber(b.totalAmountRemaining).gt(0);
  return [
    ...sells.filter(live).map((b) => ({ side: "ask" as const, price: human(b.minPrice ?? b.priceLowerBound, decToken, decQuote) })),
    ...buys.filter(live).map((b) => ({ side: "bid" as const, price: 1 / human(b.minPrice ?? b.priceLowerBound, decQuote, decToken) })),
  ].filter((l) => Number.isFinite(l.price) && l.price > 0);
}

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
  onSwap,
  onPickPrice,
  onLevels,
  mine,
  renderMineOrders,
  openBand,
  onToggleBand,
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
   * ceil(min_amount_out * 1e36 / amount_in); amount = human, escrowed token.
   */
  preview?: { side: "ask" | "bid"; priceRaw: string; amount: number } | null;
  /** Opens the swap in the preview order's direction — offered when that order crosses the book. */
  onSwap?: () => void;
  /** Click on a row's price: hands it (1 A = x B, best real price of the row) to the parent's form. */
  onPickPrice?: (priceAinB: number) => void;
  /** Receives the book's levels (1 A = price B, best real price per row) whenever they load — e.g. to draw them on a price chart. */
  onLevels?: (levels: { side: "ask" | "bid"; price: number }[]) => void;
  /**
   * The connected user's active orders on this pair, already aggregated per
   * bucket (GET /orderbook/orders/buckets) — same side convention as preview,
   * amount = human, escrowed token.
   */
  mine?: { side: "ask" | "bid"; bucketId: number; count: number; amount: number }[];
  /**
   * Detail of the user's orders in one bucket, rendered under that row when
   * it is clicked — lets the parent fetch and show each order with its cancel
   * button right in the ladder instead of a separate list.
   */
  renderMineOrders?: (band: { side: "ask" | "bid"; bucketId: number }) => React.ReactNode;
  /** Expanded row (`${side}:${bucketId}`), owned by the parent so it survives the remounts on refresh. */
  openBand?: string | null;
  onToggleBand?: (band: string) => void;
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
        const hi = human(bucketLowerBoundRaw(b.bucketId + 1).toString(), decimalsA, decimalsB);
        const amount = new BigNumber(b.totalAmountRemaining).shiftedBy(-decimalsA).toNumber();
        const best = b.minPrice ? human(b.minPrice, decimalsA, decimalsB) : null; // lowest ask
        const worst = b.maxPrice ? human(b.maxPrice, decimalsA, decimalsB) : null; // highest ask
        // Value in B: exact for a single price (best == worst), otherwise the
        // middle of the real orders' range — the bucket's middle only as a fallback.
        const mid = best != null && worst != null ? Math.sqrt(best * worst) : Math.sqrt(lo * hi);
        return {
          side: "ask" as const,
          bucketId: b.bucketId,
          lo,
          hi,
          price: best ?? lo,
          sure: best ?? hi,
          amount,
          valueB: amount * mid,
          cum: 0,
          orders: b.orderCount,
        };
      })
      .filter((b) => b.lo > 0 && b.amount > 0)
      .sort((a, b) => a.price - b.price);
    const bids = bidRaw
      .map((b) => {
        const aPerBLo = human(b.priceLowerBound, decimalsB, decimalsA); // A per B, raw bucket's lower bound
        const aPerBHi = human(bucketLowerBoundRaw(b.bucketId + 1).toString(), decimalsB, decimalsA); // raw bucket's upper bound
        const amount = new BigNumber(b.totalAmountRemaining).shiftedBy(-decimalsB).toNumber();
        // Displayed in B per A (inverse of the raw A-per-B bucket) — aPerB increasing means display decreasing,
        // so the lowest raw price (minPrice) is the highest bid.
        const lo = 1 / aPerBHi;
        const best = b.minPrice ? 1 / human(b.minPrice, decimalsB, decimalsA) : null;
        return {
          side: "bid" as const,
          bucketId: b.bucketId,
          lo,
          hi: 1 / aPerBLo,
          price: best ?? lo,
          sure: best ?? lo,
          amount,
          valueB: amount,
          cum: 0,
          orders: b.orderCount,
        };
      })
      .filter((b) => Number.isFinite(b.lo) && b.lo > 0 && b.amount > 0)
      .sort((a, b) => b.price - a.price);
    let c = 0;
    for (const b of asks) b.cum = c += b.valueB;
    c = 0;
    for (const b of bids) b.cum = c += b.valueB;
    return [...bids, ...asks];
  }, [data, tokenA, tokenB, decimalsA, decimalsB]);

  // Ref: the parent's callback is usually an inline arrow — only new bands notify.
  const onLevelsRef = React.useRef(onLevels);
  onLevelsRef.current = onLevels;
  React.useEffect(() => {
    onLevelsRef.current?.(bands.map((b) => ({ side: b.side, price: b.price })));
  }, [bands]);

  // Bucket of the order being prepared — same rule as the contract:
  // bucket_id = log2_floor(price) (orderbook.rs::bucket_id_for_price).
  const previewBucket = (() => {
    if (!preview) return null;
    try {
      const raw = BigInt(preview.priceRaw);
      if (raw <= 0n) return null;
      const id = bucketIdForPriceRaw(raw);
      const lowerRaw = bucketLowerBoundRaw(id).toString();
      const upperRaw = bucketLowerBoundRaw(id + 1).toString();
      const human = (rawStr: string, decIn: number, decOut: number) =>
        new BigNumber(rawStr).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(decIn - decOut).toNumber();
      // `price`: the order's exact price, B per A like the ladder.
      if (preview.side === "ask") {
        const lo = human(lowerRaw, decimalsA, decimalsB);
        const hi = human(upperRaw, decimalsA, decimalsB);
        return { id, side: "ask" as const, lo, hi, price: human(preview.priceRaw, decimalsA, decimalsB) };
      }
      const aPerBLo = human(lowerRaw, decimalsB, decimalsA);
      const aPerBHi = human(upperRaw, decimalsB, decimalsA);
      return { id, side: "bid" as const, lo: 1 / aPerBHi, hi: 1 / aPerBLo, price: 1 / human(preview.priceRaw, decimalsB, decimalsA) };
    } catch {
      return null;
    }
  })();
  const isPreviewBand = (b: Band) => !!previewBucket && b.side === previewBucket.side && b.bucketId === previewBucket.id;

  // User's own orders per (side, bucket) — the backend uses the contract's bucket rule, like the depth itself.
  const mineByBand = new Map<string, { count: number; amount: number }>();
  for (const m of mine ?? []) mineByBand.set(`${m.side}:${m.bucketId}`, { count: m.count, amount: m.amount });
  const mineOf = (b: Band) => mineByBand.get(`${b.side}:${b.bucketId}`);

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

  // Crossings, on `sure` prices (real best prices, or the bucket bound that
  // keeps the test certain on an older backend — cf. Band.sure):
  //  - the order being prepared: a sell below the best bid / a buy above the
  //    best ask — a market swap would then get the user a better price;
  //  - the book itself: best bid above best ask.
  const bestBidLo = allBids.length ? Math.max(...allBids.map((b) => b.sure)) : null;
  const bestAskHi = allAsks.length ? Math.min(...allAsks.map((b) => b.sure)) : null;
  const previewCross =
    !previewBucket || !Number.isFinite(previewBucket.price)
      ? null
      : previewBucket.side === "ask" && bestBidLo != null && previewBucket.price < bestBidLo
        ? t("depth_cross_sell", { price: fmtNum(bestBidLo), b: tickerB })
        : previewBucket.side === "bid" && bestAskHi != null && previewBucket.price > bestAskHi
          ? t("depth_cross_buy", { price: fmtNum(bestAskHi), b: tickerB })
          : null;
  const bookCrossed = bestBidLo != null && bestAskHi != null && bestBidLo > bestAskHi;
  const swapLink = onSwap && (
    <>
      {" "}
      <button
        type="button"
        onClick={onSwap}
        className="dvx:bg-transparent dvx:p-0 dvx:font-bold dvx:underline dvx:text-amber-600 dvx:dark:text-amber-400"
        style={{ fontSize: 11 }}
      >
        {t("depth_cross_swap")} →
      </button>
    </>
  );
  // The preview's bucket and the user's own buckets always stay visible, even
  // beyond the row cap; an empty preview bucket gets a dedicated row.
  const keep = (list: Band[]) => list.filter((b, i) => i < ROWS_PER_SIDE || isPreviewBand(b) || !!mineOf(b));
  const bids = keep(allBids);
  const asks = keep(allAsks);
  if (previewBucket && !bands.some(isPreviewBand)) {
    const virt: Band = {
      side: previewBucket.side,
      bucketId: previewBucket.id,
      previewOnly: true,
      lo: previewBucket.lo,
      hi: previewBucket.hi,
      price: Number.isFinite(previewBucket.price) ? previewBucket.price : previewBucket.lo,
      sure: previewBucket.price,
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

  // Rows holding the user's orders expand on click into their detail (cf. renderMineOrders).
  const row = (b: Band, key: string) => {
    const own = mineOf(b);
    const bandKey = `${b.side}:${b.bucketId}`;
    const expandable = !!own && !!renderMineOrders && !!onToggleBand;
    const open = expandable && openBand === bandKey;
    return (
      <div
        key={key}
        onClick={expandable ? () => onToggleBand!(bandKey) : undefined}
        style={{ cursor: expandable ? "pointer" : undefined }}
      >
        {rowBody(b)}
        {open && (
          <div
            className="dvx:rounded-md dvx:bg-white dvx:dark:bg-[#242424]"
            style={{ boxShadow: `inset 3px 0 0 ${MINE}`, margin: "2px 0 4px", cursor: "default" }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderMineOrders!({ side: b.side, bucketId: b.bucketId })}
          </div>
        )}
      </div>
    );
  };

  // Price + its deviation from the AMM spot; the price is clickable when the
  // parent can use it (stopPropagation: the row click expands own orders).
  const priceCell = (b: Band, color: string, ownBadge: React.ReactNode) => {
    const dev = spotAinB && spotAinB > 0 && Number.isFinite(b.price) ? (b.price / spotAinB - 1) * 100 : null;
    const devLabel = dev == null ? null : Math.abs(dev) < 0.05 ? "0%" : `${dev > 0 ? "+" : ""}${Math.abs(dev) >= 100 ? dev.toFixed(0) : dev.toFixed(1)}%`;
    return (
      <span className="dvx:font-medium dvx:whitespace-nowrap" style={{ color }}>
        {onPickPrice ? (
          <span
            role="button"
            tabIndex={0}
            title={t("depth_use_price")}
            onClick={(e) => {
              e.stopPropagation();
              onPickPrice(b.price);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onPickPrice(b.price);
              }
            }}
            style={{ cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 2 }}
          >
            {fmtNum(b.price)}
          </span>
        ) : (
          fmtNum(b.price)
        )}
        {devLabel && (
          <span className="dvx:text-gray-400" style={{ fontSize: 9, marginLeft: 4 }}>
            {devLabel}
          </span>
        )}
        {ownBadge}
      </span>
    );
  };

  const rowBody = (b: Band) => {
    const color = b.side === "ask" ? ASK : BID;
    const maxAmount = b.side === "ask" ? maxAmountAsk : maxAmountBid;
    const pct = Math.min(100, (b.amount / maxAmount) * 100);
    const nativeTicker = b.side === "ask" ? tickerA : tickerB;
    const own = mineOf(b);
    const ownBadge = own && (
      <span className="dvx:font-bold" style={{ color: MINE, fontSize: 10, marginLeft: 6 }}>
        ● {fmtNum(own.amount)}
        {renderMineOrders && onToggleBand && (openBand === `${b.side}:${b.bucketId}` ? " ▴" : " ▾")}
      </span>
    );
    const ownTip = own ? t("depth_mine_tip", { count: own.count, amount: `${fmtNum(own.amount)} ${nativeTicker}` }) : undefined;
    if (isPreviewBand(b) && preview) {
      // The user's order-to-be: gold outline + "your order" line with its amount.
      return (
        <div
          className="dvx:relative dvx:rounded-md"
          style={{ boxShadow: "inset 0 0 0 1.5px rgba(245, 158, 11, 0.95)", background: "rgba(245, 158, 11, 0.10)", margin: "2px 0" }}
          title={t("depth_preview_tip", { lo: fmtNum(b.lo), hi: fmtNum(b.hi), b: tickerB })}
        >
          {!b.previewOnly && (
            <div className="dvx:absolute dvx:inset-y-0 dvx:right-0" style={{ width: `${pct}%`, background: color, opacity: 0.2 }} />
          )}
          <div className="dvx:relative dvx:grid dvx:items-center dvx:px-1" style={{ gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, minHeight: 20 }}>
            {priceCell(b, color, ownBadge)}
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
      <div
        className="dvx:relative"
        style={{ height: 20, boxShadow: own ? `inset 3px 0 0 ${MINE}` : undefined }}
        title={ownTip}
      >
        <div
          className="dvx:absolute dvx:inset-y-0 dvx:right-0"
          style={{ width: `${pct}%`, background: color, opacity: 0.28 }}
        />
        <div
          className="dvx:relative dvx:grid dvx:items-center dvx:px-1 dvx:h-full"
          style={{ gridTemplateColumns: "1fr 1fr 1fr", fontSize: 11, paddingLeft: own ? 7 : undefined }}
        >
          {priceCell(b, color, ownBadge)}
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
  // Sorted on the shown (best real) price; on a tie the sell row stays above.
  const merged: Row[] = [...asks, ...bids]
    .sort((a, b) => b.price - a.price || (a.side === b.side ? 0 : a.side === "ask" ? -1 : 1))
    .map((b) => ({ kind: "band", b }));
  if (spotAinB && spotAinB > 0) {
    const idx = merged.findIndex((r) => r.kind === "band" && r.b.price < spotAinB);
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
          {mineByBand.size > 0 && (
            <span className="dvx:inline-flex dvx:items-center dvx:gap-1" style={{ color: MINE }}>
              ● {t("depth_mine_legend")}
            </span>
          )}
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

      {/* One alert at a time: the order being prepared crossing the book is the
          actionable one (→ swap link); the general "crossed book" note otherwise. */}
      {previewCross ? (
        <p className="dvx:mt-2 dvx:px-1 dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400" style={{ fontSize: 11 }}>
          ⚠ {previewCross}
          {swapLink}
        </p>
      ) : bookCrossed && (
        <p className="dvx:mt-2 dvx:px-1 dvx:text-amber-600 dvx:dark:text-amber-400" style={{ fontSize: 11 }}>
          ⚠ {t("depth_crossed", { bid: fmtNum(bestBidLo!), ask: fmtNum(bestAskHi!), a: tickerA, b: tickerB })}
          {swapLink}
        </p>
      )}

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
