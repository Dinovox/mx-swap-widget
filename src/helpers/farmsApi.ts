import axios from "axios";
import type { Farm, FarmRewardStream, FarmUserPosition } from "./farms";

/*
 * Backend farms routes (GET /farms, /farms/config, /farms/positions) — replace
 * the per-farm VM queries. Callers fall back to the on-chain reads in
 * ./farms when these fail (route not deployed yet, 503 when farms isn't
 * configured on the environment, …).
 */

interface ApiReward {
  token: string;
  balance: string;
  totalRewarded: string;
  msToMax: number;
  paused: boolean;
  feeBps: number;
  aprPct: string | null;
}

export interface ApiFarm {
  stakedToken: string;
  pool: string | null;
  totalStaked: string;
  stakers: number;
  positionNonce: number;
  /** Per-farm cap of streams per participant (effective value). */
  maxActiveRewardsPerPosition?: number;
  /** Best N streams' APR summed, N = maxActiveRewardsPerPosition (null = none priced). */
  farmAprPct?: string | null;
  /** USD value of totalStaked (null when the staked token isn't priced). */
  tvlUsd?: string | null;
  rewards: ApiReward[];
}

export interface FarmsApiConfig {
  farmsAddress: string;
  farmTokenId: string;
  /** Streams per participant a new farm starts with (cap is per farm, see ApiFarm). */
  defaultMaxActiveRewardsPerPosition?: number;
  maxActiveRewardsPerPositionCeiling?: number;
  /** unlockExtraFlux price (raw), paid in removeFeesToken. */
  extraFluxPrice?: string;
  removeFeesToken?: string;
  removeFeesPrice?: string;
  /** Floor (raw) to open a new non-whitelisted stream on an existing farm. */
  minFundAmountNonWhitelisted?: string;
  feePercent: number;
  defaultMsToMax: number;
  whitelistedRewardTokens: Array<{ token: string; minFundAmount: string }>;
}

/** Same shape as the on-chain `Farm` (farm block of /pools and items of /farms). */
export function farmFromApi(f: ApiFarm): Farm {
  return {
    stakedToken: f.stakedToken,
    totalStaked: f.totalStaked,
    stakers: f.stakers,
    pool: f.pool,
    positionNonce: f.positionNonce,
    maxActive: f.maxActiveRewardsPerPosition,
    tvlUsd: f.tvlUsd === undefined ? undefined : f.tvlUsd != null ? parseFloat(f.tvlUsd) : null,
    farmAprPct: f.farmAprPct === undefined ? undefined : f.farmAprPct != null ? parseFloat(f.farmAprPct) : null,
    streams: f.rewards.map(
      (r): FarmRewardStream => ({
        rewardedToken: r.token,
        balance: r.balance,
        totalRewarded: r.totalRewarded,
        feePercentage: r.feeBps,
        lastFundTimestampMs: 0, // not exposed — unused by the widget
        paused: r.paused,
        msToMax: r.msToMax,
        aprPct: r.aprPct != null ? parseFloat(r.aprPct) : null,
      }),
    ),
  };
}

export type FarmsSortBy = "tvlUsd" | "farmAprPct" | "stakers";

/** GET /farms — server-side sort (nulls last) and exact `pool` / `stakedToken` filters. */
export async function fetchFarmsApi(
  apiUrl: string,
  params: { sortBy?: FarmsSortBy; sortDir?: "asc" | "desc"; pool?: string; stakedToken?: string } = {},
): Promise<Farm[]> {
  const { data } = await axios.get<{ farms: ApiFarm[] }>(`${apiUrl}/farms`, { params });
  return (data.farms ?? []).map(farmFromApi);
}

export async function fetchFarmsConfigApi(apiUrl: string): Promise<FarmsApiConfig> {
  const { data } = await axios.get<FarmsApiConfig>(`${apiUrl}/farms/config`);
  return data;
}

/** User positions keyed by staked token; `pending` left empty — computed live via pendingRewardRaw. */
export async function fetchFarmPositionsApi(apiUrl: string, address: string): Promise<Record<string, FarmUserPosition>> {
  const { data } = await axios.get<{
    positions: Array<{ stakedToken: string; stake: string; positionTokenBalance: string; rewards: Array<{ token: string; checkpointMs: number }> }>;
  }>(`${apiUrl}/farms/positions`, { params: { address } });
  const out: Record<string, FarmUserPosition> = {};
  for (const p of data.positions ?? []) {
    out[p.stakedToken] = {
      stake: p.stake,
      activeRewards: p.rewards.map((r) => r.token),
      pending: {},
      checkpoints: Object.fromEntries(p.rewards.map((r) => [r.token, r.checkpointMs])),
      positionTokenBalance: p.positionTokenBalance,
    };
  }
  return out;
}

const MAX_PERCENTAGE = 10_000n;

/**
 * Exact client-side replica of the contract's calculate_rewards (same
 * left-to-right integer operations, so it matches what a claim would pay at
 * `nowMs`): stake * 10000 / total * balance / 10000 * min(elapsed, msToMax) / msToMax.
 */
export function pendingRewardRaw(
  stakeRaw: string,
  totalStakedRaw: string,
  balanceRaw: string,
  checkpointMs: number,
  msToMax: number,
  nowMs: number,
): bigint {
  const total = BigInt(totalStakedRaw || "0");
  if (total === 0n || !msToMax || nowMs <= checkpointMs) return 0n;
  const diff = BigInt(Math.min(nowMs - checkpointMs, msToMax));
  return (((((BigInt(stakeRaw) * MAX_PERCENTAGE) / total) * BigInt(balanceRaw)) / MAX_PERCENTAGE) * diff) / BigInt(msToMax);
}
