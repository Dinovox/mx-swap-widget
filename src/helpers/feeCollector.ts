import { Abi, Address, ApiNetworkProvider, SmartContractController } from "@multiversx/sdk-core";
import feeCollectorAbiJson from "../abis/fee-collector.abi.json";

// fee-collector ABI (swapv2/fee-collector): protocol fees of the DinoVox
// pairs, sold for VOXEGLD on the pairs' order books (processFees), then
// deposited single-side into VOXEGLD/WEGLD (compound). Read with free view
// queries — no backend route yet.
const feeCollectorAbi = Abi.create(feeCollectorAbiJson);

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
}

export interface FeeCollectorState {
  targetToken: string;
  /** Sale premium above the reference price, in bps (1 000 = +10 %). */
  premiumBps: number;
  /** Observation time a price needs before its first sale / deposit. */
  warmupSeconds: number;
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
  const res = await fetch(`${networkApiAddress}/accounts/${collector}/tokens?size=500&fields=identifier,ticker,decimals,balance,assets`);
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
  const warmupSeconds = num((refConfig as Record<string, unknown>).warmup_seconds);
  const lp = lpConfig as Record<string, unknown> | null | undefined;

  // The warm-up runs from a price's first observation (first_seen). Still
  // WarmingUp past its end means the observed pair changed: the next call
  // starts over, as for a price never observed (null).
  const warmupEndsAt = async (token: string): Promise<number | null> => {
    const [ref] = await q("getPriceRef", [token]);
    if (ref == null) return null;
    const end = num((ref as Record<string, unknown>).first_seen) + warmupSeconds;
    return end > Date.now() / 1000 ? end : null;
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
      const warmup = o === "WarmingUp" ? await warmupEndsAt(token) : null;
      return { token, balance: balances[token], outcome: o, amount: str(amount), minAmountOut: str(minAmountOut), nextOrderAt, warmupEndsAt: warmup };
    }),
  );

  const compoundOutcome = outcomeOf(compoundParts[0]);
  const zapInterval = lp ? num(lp.min_zap_interval) : 0;
  return {
    targetToken,
    premiumBps: num(cfg.premium_bps),
    warmupSeconds,
    paused: !!paused,
    tokens,
    claimable: ((claimable ?? []) as unknown[][]).map(([pair, amount]) => ({ pair: bech32(pair), amount: str(amount) })),
    targetBalance: balances[targetToken] ?? "0",
    compound: {
      outcome: compoundOutcome,
      amount: str(compoundParts[1]),
      nextZapAt: compoundOutcome === "TooSoon" ? num(lastZapAt) + zapInterval : null,
      warmupEndsAt: compoundOutcome === "WarmingUp" ? await warmupEndsAt(targetToken) : null,
      quoteToken: lp ? String(lp.quote_token) : null,
    },
    meta,
  };
}
