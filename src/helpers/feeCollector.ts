import { Abi, Address, ApiNetworkProvider, SmartContractController } from "@multiversx/sdk-core";
import BigNumber from "bignumber.js";
import feeCollectorAbiJson from "../abis/fee-collector.abi.json";
import pairAbiJson from "../abis/pair.abi.json";

// fee-collector ABI (swapv2/fee-collector): protocol fees of the DinoVox
// pairs, sold for VOXEGLD on the pairs' order books (processFees) — or, for
// the tokens the owner routed (setLpRoute), deposited single-side into a
// chosen pool instead — then deposited single-side into VOXEGLD/WEGLD
// (compound); WEGLD is not sold but deposited on the other side of that pair
// (compoundQuote); EGLD it receives is staked into VOXEGLD (stake). Read from
// the backend (fetchFeeCollectorStateFromApi), or with free view queries when
// it can't.
const feeCollectorAbi = Abi.create(feeCollectorAbiJson);
const pairAbi = Abi.create(pairAbiJson);

/** PriceRef.price scale (fee-collector price_ref.rs: raw target per raw token × 10^36). */
const PRICE_SCALE = new BigNumber(10).pow(36);

/** fee-collector::Outcome — what processFees / compound would do (or did) for a token. */
export type FeeOutcome =
  | "Done"
  | "TargetToken"
  | "Disabled"
  | "NoPair"
  | "NoAmm"
  | "PoolTooSmall"
  | "WarmingUp"
  | "PairUnavailable"
  | "TooSoon"
  | "BelowMinimum"
  | "PriceOutOfBounds"
  /** processFees: the LP pair's quote token (WEGLD), deposited by compoundQuote instead of sold. */
  | "QuoteToken";

/**
 * LP route of a token (fee-collector setLpRoute): processFees deposits it
 * single-side into `pair` instead of selling it. Its prices (spotPrice,
 * refPrice, refNext) are then in `otherToken` per token, orderCap is the
 * deposit cap and nextOrderAt the next deposit.
 */
export interface FeeTokenRoute {
  pair: string;
  /** The pair's other token. */
  otherToken: string;
  /** Deposit floor (raw). */
  minAmount: string;
}

export interface FeeTokenPreview {
  token: string;
  /** Collector balance (raw). */
  balance: string;
  outcome: FeeOutcome;
  /** Amount processFees would put on sale (raw), 0 unless Done. */
  amount: string;
  /** min_amount_out of that order, in the target token (raw). */
  minAmountOut: string;
  /** Unix seconds after which a new order is allowed (TooSoon), else null. */
  nextOrderAt: number | null;
  /**
   * WarmingUp only: Unix seconds when the price warm-up ends, or null while
   * the price has never been observed — any processFees call starts it.
   */
  warmupEndsAt: number | null;
  /** Current AMM price on the pair the collector sells on: target token per token (human), null without pair/reserves. */
  spotPrice: string | null;
  /** Contract's ratcheted reference price, same unit; null while never observed. Orders sit at this + premium. */
  refPrice: string | null;
  /** Unix seconds of the reference's last observation (PriceRef.updated_at), null while never observed. */
  refUpdatedAt: number | null;
  /** Reference an observation right now would store (price_ref.rs next_price_ref), same unit; null without spot. */
  refNext: string | null;
  /** Size of the next sell order (raw): balance capped at max_order_reserve_bps of the pair's token reserve. */
  orderCap: string | null;
  /** null: sold on the order book (the default). */
  route: FeeTokenRoute | null;
}

export interface CompoundPreview {
  outcome: FeeOutcome;
  /** VOXEGLD compound would deposit (raw). */
  amount: string;
  /** Unix seconds after which a new deposit is allowed (TooSoon), else null. */
  nextZapAt: number | null;
  /** WarmingUp only: same as FeeTokenPreview.warmupEndsAt, for the target token's price (any compound call starts it). */
  warmupEndsAt: number | null;
  /** Token the LP pair quotes VOXEGLD in (WEGLD), null when compound is disabled. */
  quoteToken: string | null;
  /** Same as FeeTokenPreview, for the target token's price in quoteToken (human), on the LP pair. */
  spotPrice: string | null;
  refPrice: string | null;
  refUpdatedAt: number | null;
  refNext: string | null;
  /** Max gap of the spot under the reference before deposits are put off (PriceOutOfBounds), in bps. */
  maxPriceDeviationBps: number;
}

/**
 * fee-collector previewCompoundQuote: the quote token (WEGLD) deposited on the
 * other side of the LP pair, which buys VOXEGLD — only while VOXEGLD trades
 * under its liquid staking rate, and up to that rate at most.
 */
export interface CompoundQuotePreview {
  outcome: FeeOutcome;
  /** Quote token compoundQuote would deposit (raw), 0 unless Done. */
  amount: string;
  /** Unix seconds after which a new deposit is allowed (TooSoon), else null. */
  nextZapAt: number | null;
  /** VOXEGLD price in the quote token on the LP pair (human), null when unread. */
  spotPrice: string | null;
  /** Liquid staking rate, EGLD per VOXEGLD (human), null when unread. */
  stakingRate: string | null;
}

/** fee-collector previewStake: EGLD → VOXEGLD through the liquid staking contract, the whole balance when Done. */
export interface StakePreview {
  outcome: FeeOutcome;
  /** Collector EGLD balance (raw). */
  egldBalance: string;
}

export interface FeeCollectorState {
  targetToken: string;
  /** Sale premium above the reference price, in bps (1 000 = +10 %). */
  premiumBps: number;
  /** Observation time a price needs before its first sale / deposit. */
  warmupSeconds: number;
  /** Max fall of a reference per day, in bps (500 = 5 %/day). */
  decayBpsPerDay: number;
  /** Elapsed time a single observation counts at most for the decay (RefConfig.max_decay_seconds). */
  maxDecaySeconds: number;
  /** Cap of one sell order, in bps of the pair's token reserve (500 = 5 %). */
  maxOrderReserveBps: number;
  /** Cap of one LP deposit (compound, compoundQuote, routed tokens), in bps of the deposited token's reserve; 0 without LP config. */
  maxZapReserveBps: number;
  paused: boolean;
  tokens: FeeTokenPreview[];
  /** Target token (VOXEGLD) waiting in filled orders, per pair (raw). */
  claimable: Array<{ pair: string; amount: string }>;
  /** Target token held by the collector itself (raw). */
  targetBalance: string;
  compound: CompoundPreview;
  /** null on a collector not upgraded yet (no previewCompoundQuote view) or from an older backend. */
  compoundQuote: CompoundQuotePreview | null;
  /** null on a collector not upgraded yet (no previewStake view) or from an older backend. */
  stake: StakePreview | null;
  /**
   * Public cancellation of stale orders (cancelStaleOrders), null until the
   * owner enables it: an order qualifies once older than minAgeSeconds and
   * priced at least minSpotDeviationBps above the AMM price.
   */
  staleOrders: { minAgeSeconds: number; minSpotDeviationBps: number } | null;
  /** Ids of the orders cancelStaleOrders would cancel right now, per pair (getStaleOrders view, same check). */
  staleOrderIds: Record<string, string[]>;
  /** Metadata of every token the collector holds. */
  meta: Record<string, CollectorTokenMeta>;
}

// BigUint/u64 come back as BigNumber.js — toFixed(0) avoids scientific notation.
const str = (v: unknown) => (v != null && typeof (v as { toFixed?: unknown }).toFixed === "function" ? (v as { toFixed: (d: number) => string }).toFixed(0) : String(v ?? "0"));
const num = (v: unknown) => Number(str(v));
// Field-less enum: native value is { name, fields } (or the bare name).
const outcomeOf = (v: unknown) => (typeof v === "object" && v != null && "name" in v ? String((v as { name: unknown }).name) : String(v)) as FeeOutcome;
const bech32 = (v: unknown) => (v instanceof Address ? v.toBech32() : String(v));

const controllerFor = (networkApiAddress: string, chainId: string) =>
  new SmartContractController({ chainID: chainId, networkProvider: new ApiNetworkProvider(networkApiAddress), abi: feeCollectorAbi });

/** fee-collector MAX_PAGE_SIZE: largest page of its registry views. */
const REGISTRY_PAGE = 100;

/**
 * The whole registry as (pair, pending target) from getClaimableProceeds,
 * page after page until a short one. The first page is asked without
 * arguments: a collector not upgraded yet (no pagination) returns it all.
 */
async function readClaimable(q: (fn: string, args?: unknown[]) => Promise<unknown[]>): Promise<unknown[][]> {
  const [first] = await q("getClaimableProceeds");
  const items = [...((first ?? []) as unknown[][])];
  for (let last = items.length; last === REGISTRY_PAGE; ) {
    const [page] = await q("getClaimableProceeds", [items.length, REGISTRY_PAGE]);
    const list = (page ?? []) as unknown[][];
    items.push(...list);
    last = list.length;
  }
  return items;
}

export interface CollectorTokenMeta {
  ticker: string;
  decimals: number;
  logoUrl: string | null;
}

/** Fungible ESDTs held by the collector (raw balances + metadata), from the network API. */
async function fetchCollectorBalances(
  networkApiAddress: string,
  collector: string,
): Promise<{ balances: Record<string, string>; meta: Record<string, CollectorTokenMeta> }> {
  const res = await fetch(`${networkApiAddress}/accounts/${collector}/tokens?size=500&fields=identifier,ticker,decimals,balance,assets`, { cache: "no-store" });
  const balances: Record<string, string> = {};
  const meta: Record<string, CollectorTokenMeta> = {};
  if (!res.ok) return { balances, meta };
  const items = (await res.json()) as Array<{ identifier?: string; ticker?: string; decimals?: number; balance?: string; assets?: { svgUrl?: string; pngUrl?: string } }>;
  for (const it of items) {
    if (!it.identifier || !it.balance || it.balance === "0") continue;
    balances[it.identifier] = it.balance;
    meta[it.identifier] = {
      ticker: it.ticker ?? it.identifier.split("-")[0],
      decimals: it.decimals ?? 18,
      logoUrl: it.assets?.svgUrl ?? it.assets?.pngUrl ?? null,
    };
  }
  return { balances, meta };
}

/**
 * Same state from the DEX backend (GET /fee-collector/state): one call, read
 * once for every client behind a short cache, instead of ~5 view queries per
 * token held. null when the backend can't serve it (older version, collector
 * not configured there or a different one) — the caller then reads the chain.
 * `fresh` asks for a re-read, right after one of our transactions.
 */
export async function fetchFeeCollectorStateFromApi(apiUrl: string, collector: string, fresh = false): Promise<FeeCollectorState | null> {
  try {
    const res = await fetch(`${apiUrl}/fee-collector/state${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as FeeCollectorState & { collector?: string };
    // An older backend has no `stake` / `compoundQuote` / `route` / `maxZapReserveBps` field.
    return body.collector === collector
      ? {
          ...body,
          tokens: body.tokens.map((tk) => ({ ...tk, route: tk.route ?? null })),
          maxZapReserveBps: body.maxZapReserveBps ?? 0,
          stake: body.stake ?? null,
          compoundQuote: body.compoundQuote ?? null,
        }
      : null;
  } catch {
    return null;
  }
}

/** Everything the Dex Fees view shows: per-token previews, claimable proceeds, compound preview. */
export async function fetchFeeCollectorState(
  networkApiAddress: string,
  chainId: string,
  collector: string,
): Promise<FeeCollectorState> {
  const c = controllerFor(networkApiAddress, chainId);
  const contract = new Address(collector);
  const q = (fn: string, args: unknown[] = []) => c.query({ contract, function: fn, arguments: args });

  // Multi-value outputs (previewCompound, previewProcess) come back spread, one item per value.
  const [[target], [orderConfig], [refConfig], [paused], claimable, compoundParts, [lpConfig], [lastZapAt], [staleConfig], stakeParts, quoteParts, [lpRoutes], { balances, meta }] =
    await Promise.all([
      q("getTargetToken"),
      q("getOrderConfig"),
      q("getRefConfig"),
      q("isPaused"),
      readClaimable(q),
      q("previewCompound"),
      q("getLpConfig"),
      q("getLastZapAt"),
      // Missing views on a collector not upgraded yet: treated as disabled.
      q("getStaleOrderConfig").catch(() => [null]),
      q("previewStake").catch(() => null),
      q("previewCompoundQuote").catch(() => null),
      q("getLpRoutes").catch(() => [[]]),
      fetchCollectorBalances(networkApiAddress, collector),
    ]);
  // The registry (pairs with an active order or proceeds to claim), as listed by getClaimableProceeds.
  const orderPairs = claimable.map(([pair]) => pair);
  const targetToken = String(target);
  const cfg = orderConfig as Record<string, unknown>;
  const minOrderInterval = num(cfg.min_order_interval);
  const refCfg = refConfig as Record<string, unknown>;
  const warmupSeconds = num(refCfg.warmup_seconds);
  const decayBpsPerDay = num(refCfg.decay_bps_per_day);
  const maxDecaySeconds = num(refCfg.max_decay_seconds);
  const maxOrderReserveBps = num(cfg.max_order_reserve_bps);
  const lp = lpConfig as Record<string, unknown> | null | undefined;
  const zapInterval = lp ? num(lp.min_zap_interval) : 0;
  const maxZapReserveBps = lp ? num(lp.max_zap_reserve_bps) : 0;
  // Tokens routed to liquidity (setLpRoute): token → deposit pair.
  const routes = new Map<string, { pair: string; minAmount: string }>();
  for (const [token, route] of (lpRoutes ?? []) as unknown[][]) {
    const r = route as Record<string, unknown>;
    routes.set(String(token), { pair: bech32(r.pair), minAmount: str(r.min_amount) });
  }

  // The warm-up runs from a price's first observation (first_seen). Still
  // WarmingUp past its end means the observed pair changed: the next call
  // starts over, as for a price never observed (null).
  const priceRef = async (token: string) => {
    const [ref] = await q("getPriceRef", [token]);
    return (ref ?? null) as Record<string, unknown> | null;
  };
  const warmupEndOf = (ref: Record<string, unknown> | null): number | null => {
    if (ref == null) return null;
    const end = num(ref.first_seen) + warmupSeconds;
    return end > Date.now() / 1000 ? end : null;
  };
  const warmupEndsAt = async (token: string) => warmupEndOf(await priceRef(token));

  const decimalsOf = (id: string) => meta[id]?.decimals ?? 18;

  // Same spot as the contract (lib.rs plan_order): reserve_target / reserve_token
  // of the pair it would sell on (getPairFor).
  const pairCtl = new SmartContractController({ chainID: chainId, networkProvider: new ApiNetworkProvider(networkApiAddress), abi: pairAbi });
  const reservesOf = async (token: string): Promise<{ pair: string; reserveToken: BigNumber; reserveTarget: BigNumber } | null> => {
    try {
      const [pairAddr] = await q("getPairFor", [token]);
      if (pairAddr == null) return null;
      const pair = bech32(pairAddr);
      const contract = new Address(pair);
      const [[tA], [rA, rB]] = await Promise.all([
        pairCtl.query({ contract, function: "getTokens", arguments: [] }),
        pairCtl.query({ contract, function: "getReserves", arguments: [] }),
      ]);
      const [rToken, rTarget] = String(tA) === token ? [rA, rB] : [rB, rA];
      const reserveToken = new BigNumber(str(rToken));
      if (reserveToken.isZero()) return null;
      return { pair, reserveToken, reserveTarget: new BigNumber(str(rTarget)) };
    } catch {
      return null;
    }
  };
  // A routed token's pair (lib.rs plan_route): prices in its other token.
  const routeReservesOf = async (token: string, pair: string): Promise<{ otherToken: string; reserveToken: BigNumber; reserveOther: BigNumber } | null> => {
    try {
      const contract = new Address(pair);
      const [[tA, tB], [rA, rB]] = await Promise.all([
        pairCtl.query({ contract, function: "getTokens", arguments: [] }),
        pairCtl.query({ contract, function: "getReserves", arguments: [] }),
      ]);
      const [rToken, rOther, other] = String(tA) === token ? [rA, rB, String(tB)] : [rB, rA, String(tA)];
      const reserveToken = new BigNumber(str(rToken));
      return reserveToken.isZero() ? null : { otherToken: other, reserveToken, reserveOther: new BigNumber(str(rOther)) };
    } catch {
      return null;
    }
  };
  const routeReserves = new Map(
    await Promise.all([...routes].filter(([token]) => balances[token] != null).map(async ([token, r]) => [token, await routeReservesOf(token, r.pair)] as const)),
  );
  // The other token of a route may not be held: its decimals still price the token.
  await Promise.all(
    [...new Set([...routeReserves.values()].flatMap((r) => (r && !meta[r.otherToken] ? [r.otherToken] : [])))].map(async (id) => {
      try {
        const res = await fetch(`${networkApiAddress}/tokens/${id}?fields=identifier,ticker,decimals,assets`);
        if (!res.ok) return;
        const it = (await res.json()) as { ticker?: string; decimals?: number; assets?: { svgUrl?: string; pngUrl?: string } };
        meta[id] = { ticker: it.ticker ?? id.split("-")[0], decimals: it.decimals ?? 18, logoUrl: it.assets?.svgUrl ?? it.assets?.pngUrl ?? null };
      } catch {
        // decimals default to 18
      }
    }),
  );
  const now = Math.floor(Date.now() / 1000);
  // price_ref.rs next_price_ref, integer math included: the stored reference
  // loses at most decay_bps_per_day per day (elapsed capped at
  // max_decay_seconds) and jumps straight to the spot when it is higher.
  const nextRefRaw = (ref: Record<string, unknown> | null, spotRaw: BigNumber): BigNumber => {
    if (ref == null) return spotRaw;
    const prev = new BigNumber(str(ref.price));
    const elapsed = Math.min(Math.max(0, now - num(ref.updated_at)), maxDecaySeconds);
    const decay = prev.times(decayBpsPerDay).times(elapsed).idiv(10_000 * 86_400);
    const floor = decay.gte(prev) ? new BigNumber(0) : prev.minus(decay);
    return BigNumber.max(spotRaw, floor);
  };

  const tokenIds = Object.keys(balances).filter((id) => id !== targetToken);
  const tokens = await Promise.all(
    tokenIds.map(async (token): Promise<FeeTokenPreview> => {
      const [outcome, amount, minAmountOut] = await q("previewProcess", [token]);
      const o = outcomeOf(outcome);
      // Routed token (lib.rs plan_route): prices in the other token of its
      // route's pair, LP deposit cap and interval; otherwise the sale pair.
      const routed = routes.get(token);
      let nextOrderAt: number | null = null;
      if (o === "TooSoon") {
        const [last] = await q(routed ? "getLastRouteZapAt" : "getLastOrderAt", [token]);
        nextOrderAt = num(last) + (routed ? zapInterval : minOrderInterval);
      }
      const routeRes = routed ? (routeReserves.get(token) ?? null) : null;
      const [storedRef, orderRes] = await Promise.all([priceRef(token), routed ? Promise.resolve(null) : reservesOf(token)]);
      const res =
        routed && routeRes
          ? { pair: routed.pair, quote: routeRes.otherToken, reserveToken: routeRes.reserveToken, reserveQuote: routeRes.reserveOther }
          : orderRes
            ? { pair: orderRes.pair, quote: targetToken, reserveToken: orderRes.reserveToken, reserveQuote: orderRes.reserveTarget }
            : null;
      // A reference recorded on another pair is in another unit: the contract starts over.
      const ref = storedRef != null && res != null && bech32(storedRef.pair) !== res.pair ? null : storedRef;
      // Raw quote per raw token → human "quote per 1 token".
      const human = (rawRatio: BigNumber) => rawRatio.shiftedBy(decimalsOf(token) - decimalsOf(res?.quote ?? targetToken)).toFixed();
      const spotRaw = res ? res.reserveQuote.times(PRICE_SCALE).idiv(res.reserveToken) : null;
      const refPrice = ref != null ? human(new BigNumber(str(ref.price)).div(PRICE_SCALE)) : null;
      const warmup = o === "WarmingUp" ? warmupEndOf(ref) : null;
      const balance = new BigNumber(balances[token]);
      const cap = res ? res.reserveToken.times(routed ? maxZapReserveBps : maxOrderReserveBps).idiv(10_000) : null;
      return {
        token,
        balance: balances[token],
        outcome: o,
        amount: str(amount),
        minAmountOut: str(minAmountOut),
        nextOrderAt,
        warmupEndsAt: warmup,
        spotPrice: spotRaw ? human(spotRaw.div(PRICE_SCALE)) : null,
        refPrice,
        refUpdatedAt: ref != null ? num(ref.updated_at) : null,
        refNext: spotRaw ? human(nextRefRaw(ref, spotRaw).div(PRICE_SCALE)) : null,
        orderCap: cap ? BigNumber.min(balance, cap).toFixed(0) : null,
        route: routed ? { pair: routed.pair, otherToken: routeRes ? routeRes.otherToken : "", minAmount: routed.minAmount } : null,
      };
    }),
  );

  // Orders anyone may cancel now, asked to the contract itself (getStaleOrders)
  // rather than recomputed here: a boundary disagreement would cost a no-op tx.
  // First page only (the collector's first 100 active orders of each pair):
  // the backend, which knows how many there are, reads the following ones.
  const staleCfg = staleConfig as Record<string, unknown> | null | undefined;
  const staleOrderIds: Record<string, string[]> = {};
  if (staleCfg) {
    await Promise.all(
      orderPairs.map(async (pair) => {
        const [ids] = await q("getStaleOrders", [pair]);
        const list = ((ids ?? []) as unknown[]).map(str);
        if (list.length > 0) staleOrderIds[bech32(pair)] = list;
      }),
    );
  }

  const compoundOutcome = outcomeOf(compoundParts[0]);
  // compound observes the target's price on the target/quote pair, the other
  // way round (lib.rs plan_compound): reserve_quote / reserve_target.
  const quoteToken = lp ? String(lp.quote_token) : null;
  let compoundPrices: Pick<CompoundPreview, "spotPrice" | "refPrice" | "refUpdatedAt" | "refNext"> = { spotPrice: null, refPrice: null, refUpdatedAt: null, refNext: null };
  if (quoteToken) {
    const [storedRef, reserves] = await Promise.all([priceRef(targetToken), reservesOf(quoteToken)]);
    const ref = storedRef != null && reserves != null && bech32(storedRef.pair) !== reserves.pair ? null : storedRef;
    const toQuote = (raw: BigNumber) => raw.div(PRICE_SCALE).shiftedBy(decimalsOf(targetToken) - decimalsOf(quoteToken)).toFixed();
    const spotRaw = reserves && !reserves.reserveTarget.isZero() ? reserves.reserveToken.times(PRICE_SCALE).idiv(reserves.reserveTarget) : null;
    compoundPrices = {
      spotPrice: spotRaw ? toQuote(spotRaw) : null,
      refPrice: ref != null ? toQuote(new BigNumber(str(ref.price))) : null,
      refUpdatedAt: ref != null ? num(ref.updated_at) : null,
      refNext: spotRaw ? toQuote(nextRefRaw(ref, spotRaw)) : null,
    };
  }
  // previewCompoundQuote: (outcome, amount, price, rate), the last two raw × 10^18
  // (0 = unread); the rate is EGLD (18 decimals) per target token.
  let compoundQuote: CompoundQuotePreview | null = null;
  if (quoteParts) {
    const outcome = outcomeOf(quoteParts[0]);
    const nextZapAt = outcome === "TooSoon" ? num((await q("getLastQuoteZapAt"))[0]) + zapInterval : null;
    const spotRaw = new BigNumber(str(quoteParts[2]));
    const rateRaw = new BigNumber(str(quoteParts[3]));
    compoundQuote = {
      outcome,
      amount: str(quoteParts[1]),
      nextZapAt,
      spotPrice: !spotRaw.isZero() && quoteToken ? spotRaw.shiftedBy(decimalsOf(targetToken) - decimalsOf(quoteToken) - 18).toFixed() : null,
      stakingRate: !rateRaw.isZero() ? rateRaw.shiftedBy(decimalsOf(targetToken) - 36).toFixed() : null,
    };
  }
  return {
    targetToken,
    premiumBps: num(cfg.premium_bps),
    warmupSeconds,
    decayBpsPerDay,
    maxDecaySeconds,
    maxOrderReserveBps,
    maxZapReserveBps,
    paused: !!paused,
    tokens,
    claimable: claimable.map(([pair, amount]) => ({ pair: bech32(pair), amount: str(amount) })),
    targetBalance: balances[targetToken] ?? "0",
    compound: {
      outcome: compoundOutcome,
      amount: str(compoundParts[1]),
      nextZapAt: compoundOutcome === "TooSoon" ? num(lastZapAt) + zapInterval : null,
      warmupEndsAt: compoundOutcome === "WarmingUp" ? await warmupEndsAt(targetToken) : null,
      quoteToken,
      ...compoundPrices,
      maxPriceDeviationBps: lp ? num(lp.max_price_deviation_bps) : 0,
    },
    compoundQuote,
    stake: stakeParts ? { outcome: outcomeOf(stakeParts[0]), egldBalance: str(stakeParts[1]) } : null,
    staleOrders: staleCfg ? { minAgeSeconds: num(staleCfg.min_age_seconds), minSpotDeviationBps: num(staleCfg.min_spot_deviation_bps) } : null,
    staleOrderIds,
    meta,
  };
}
