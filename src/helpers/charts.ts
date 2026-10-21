import axios from "axios";

/** One chartable (token, quote) pair: a DinoVox pool paired directly with VOXEGLD or USDC. */
export interface ChartableEntry {
  token: string;
  quote: string;
  poolAddress: string;
  tvlUsd: string | null;
  /** /ohlc prices are tokenA-in-tokenB (pool order): invert to get token-in-quote. */
  invertPrice: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  trades: number;
}

export type ChartInterval = "1h" | "4h" | "1d";

// The list changes rarely (new pools) — one request per API base per page load.
const chartableCache = new Map<string, Promise<ChartableEntry[]>>();

/** GET /pools/chartable — every eligible (token, quote), TVL desc. */
export function fetchChartable(apiUrl: string): Promise<ChartableEntry[]> {
  let p = chartableCache.get(apiUrl);
  if (!p) {
    p = axios
      .get<{ tokens: ChartableEntry[] }>(`${apiUrl}/pools/chartable`)
      .then((res) => res.data.tokens ?? []);
    p.catch(() => chartableCache.delete(apiUrl)); // don't cache a failure
    chartableCache.set(apiUrl, p);
  }
  return p;
}

/**
 * GET /pools/{pool}/ohlc — candles of `token` priced in `quote`, i.e. with
 * invertPrice applied: every price becomes 1/x and high/low swap (1/low is the
 * new high). Empty array = no indexed history yet (not an error).
 */
export async function fetchCandles(
  apiUrl: string,
  entry: ChartableEntry,
  interval: ChartInterval,
  days: number,
): Promise<Candle[]> {
  const { data } = await axios.get<{
    candles: Array<{ timestamp: string; open: string; high: string; low: string; close: string; trades: number }>;
  }>(`${apiUrl}/pools/${entry.poolAddress}/ohlc`, { params: { interval, days } });
  const inv = (v: string) => {
    const n = parseFloat(v);
    return entry.invertPrice ? (n > 0 ? 1 / n : NaN) : n;
  };
  return (data.candles ?? [])
    .map((c) => {
      const open = inv(c.open);
      const close = inv(c.close);
      const hi = inv(c.high);
      const lo = inv(c.low);
      return {
        time: new Date(c.timestamp).getTime(),
        open,
        close,
        high: entry.invertPrice ? lo : hi,
        low: entry.invertPrice ? hi : lo,
        trades: c.trades,
      };
    })
    .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite));
}

// Quote currencies a REFERENCE token (VOXEGLD) is charted against, in display order.
const REFERENCE_QUOTES = ["USDC", "WEGLD"];
const referenceCache = new Map<string, Promise<ChartableEntry[]>>();

/**
 * Charts for a token that is itself a quote currency (VOXEGLD): /pools/chartable
 * lists it only as `quote`, never as `token`. Built from its direct DinoVox
 * pools against USDC / WEGLD (GET /pools?token=…). /ohlc prices tokenA in
 * tokenB, so the price must be inverted whenever our token is tokenB.
 */
export function fetchReferenceTokenCharts(apiUrl: string, tokenId: string): Promise<ChartableEntry[]> {
  const key = `${apiUrl}|${tokenId}`;
  let p = referenceCache.get(key);
  if (!p) {
    p = axios
      .get<{ pools: Array<{ address: string; tokenA: string; tokenB: string; isActive: boolean; tvlUsd?: string | null }> }>(
        `${apiUrl}/pools`,
        { params: { dexType: "DinoVox", token: tokenId, limit: 200 } },
      )
      .then((res) =>
        (res.data.pools ?? [])
          .filter((pool) => pool.isActive)
          .map((pool) => {
            const quote = pool.tokenA === tokenId ? pool.tokenB : pool.tokenA;
            return {
              token: tokenId,
              quote,
              poolAddress: pool.address,
              tvlUsd: pool.tvlUsd ?? null,
              invertPrice: pool.tokenA !== tokenId,
            };
          })
          .filter((e) => REFERENCE_QUOTES.includes(e.quote.split("-")[0]))
          .sort((a, b) => REFERENCE_QUOTES.indexOf(a.quote.split("-")[0]) - REFERENCE_QUOTES.indexOf(b.quote.split("-")[0])),
      );
    p.catch(() => referenceCache.delete(key));
    referenceCache.set(key, p);
  }
  return p;
}

/**
 * Chart entry of ONE pool card: the /pools/chartable entry of that pool, else
 * — for VOXEGLD vs USDC / WEGLD, which chartable never lists as a token —
 * an entry built from the pool itself (price of VOXEGLD in the other token).
 */
export function chartEntryForPool(
  chartable: ChartableEntry[],
  pool: { address: string; tokenA: string; tokenB: string; tvlUsd?: string | null },
): ChartableEntry | null {
  const listed = chartable.find((e) => e.poolAddress === pool.address);
  if (listed) return listed;
  const ticker = (id: string) => id.split("-")[0];
  const vox = [pool.tokenA, pool.tokenB].find((id) => ticker(id) === "VOXEGLD");
  const other = vox && (pool.tokenA === vox ? pool.tokenB : pool.tokenA);
  if (!vox || !other || !REFERENCE_QUOTES.includes(ticker(other))) return null;
  return { token: vox, quote: other, poolAddress: pool.address, tvlUsd: pool.tvlUsd ?? null, invertPrice: pool.tokenA !== vox };
}
