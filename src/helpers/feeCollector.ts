import { Abi, Address, ApiNetworkProvider, SmartContractController } from "@multiversx/sdk-core";
import BigNumber from "bignumber.js";
import feeCollectorAbiJson from "../abis/fee-collector.abi.json";
import pairAbiJson from "../abis/pair.abi.json";

// fee-collector ABI (swapv2/fee-collector): protocol fees of the DinoVox
// pairs, sold for VOXEGLD on the pairs' order books (processFees), then
// deposited single-side into VOXEGLD/WEGLD (compound). Read with free view
// queries — no backend route yet.
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
  | "PriceOutOfBounds";

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
  paused: boolean;
  tokens: FeeTokenPreview[];
  /** Target token (VOXEGLD) waiting in filled orders, per pair (raw). */
  claimable: Array<{ pair: string; amount: string }>;
  /** Target token held by the collector itself (raw). */
  targetBalance: string;
  compound: CompoundPreview;
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
  const [[target], [orderConfig], [refConfig], [paused], [claimable], compoundParts, [lpConfig], [lastZapAt], { balances, meta }] = await Promise.all([
    q("getTargetToken"),
    q("getOrderConfig"),
    q("getRefConfig"),
    q("isPaused"),
    q("getClaimableProceeds"),
    q("previewCompound"),
    q("getLpConfig"),
    q("getLastZapAt"),
    fetchCollectorBalances(networkApiAddress, collector),
  ]);
  const targetToken = String(target);
  const cfg = orderConfig as Record<string, unknown>;
  const minOrderInterval = num(cfg.min_order_interval);
  const refCfg = refConfig as Record<string, unknown>;
  const warmupSeconds = num(refCfg.warmup_seconds);
  const decayBpsPerDay = num(refCfg.decay_bps_per_day);
  const maxDecaySeconds = num(refCfg.max_decay_seconds);
  const maxOrderReserveBps = num(cfg.max_order_reserve_bps);
  const lp = lpConfig as Record<string, unknown> | null | undefined;

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

  // Raw target per raw token → human "target per 1 token".
  const decimalsOf = (id: string) => meta[id]?.decimals ?? 18;
  const toHuman = (rawRatio: BigNumber, token: string) =>
    rawRatio.shiftedBy(decimalsOf(token) - decimalsOf(targetToken)).toFixed();

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
      let nextOrderAt: number | null = null;
      if (o === "TooSoon") {
        const [last] = await q("getLastOrderAt", [token]);
        nextOrderAt = num(last) + minOrderInterval;
      }
      const [storedRef, reserves] = await Promise.all([priceRef(token), reservesOf(token)]);
      // A reference recorded on another pair is in another unit: the contract starts over.
      const ref = storedRef != null && reserves != null && bech32(storedRef.pair) !== reserves.pair ? null : storedRef;
      const spotRaw = reserves ? reserves.reserveTarget.times(PRICE_SCALE).idiv(reserves.reserveToken) : null;
      const refPrice = ref != null ? toHuman(new BigNumber(str(ref.price)).div(PRICE_SCALE), token) : null;
      const warmup = o === "WarmingUp" ? warmupEndOf(ref) : null;
      const balance = new BigNumber(balances[token]);
      const cap = reserves ? reserves.reserveToken.times(maxOrderReserveBps).idiv(10_000) : null;
      return {
        token,
        balance: balances[token],
        outcome: o,
        amount: str(amount),
        minAmountOut: str(minAmountOut),
        nextOrderAt,
        warmupEndsAt: warmup,
        spotPrice: spotRaw ? toHuman(spotRaw.div(PRICE_SCALE), token) : null,
        refPrice,
        refUpdatedAt: ref != null ? num(ref.updated_at) : null,
        refNext: spotRaw ? toHuman(nextRefRaw(ref, spotRaw).div(PRICE_SCALE), token) : null,
        orderCap: cap ? BigNumber.min(balance, cap).toFixed(0) : null,
      };
    }),
  );

  const compoundOutcome = outcomeOf(compoundParts[0]);
  const zapInterval = lp ? num(lp.min_zap_interval) : 0;
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
  return {
    targetToken,
    premiumBps: num(cfg.premium_bps),
    warmupSeconds,
    decayBpsPerDay,
    maxDecaySeconds,
    maxOrderReserveBps,
    paused: !!paused,
    tokens,
    claimable: ((claimable ?? []) as unknown[][]).map(([pair, amount]) => ({ pair: bech32(pair), amount: str(amount) })),
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
    meta,
  };
}
