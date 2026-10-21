import { Abi, Address, ApiNetworkProvider, SmartContractController } from "@multiversx/sdk-core";
import farmsAbiJson from "../abis/farms.abi.json";

// farms ABI (swapv2/farms, multi-reward staking). Read straight from the
// contract with free view queries — no backend route for farms yet.
const farmsAbi = Abi.create(farmsAbiJson);

/** One reward stream on a staked token: (staked_token, rewarded_token) pool. */
export interface FarmRewardStream {
  rewardedToken: string;
  /** Remaining reward balance (raw). */
  balance: string;
  totalRewarded: string;
  /** Fund fee in basis points /10000 (paid by funders, not stakers). */
  feePercentage: number;
  lastFundTimestampMs: number;
  paused: boolean;
  /** Reward window: a staker captures balance × share × elapsed / msToMax (capped). */
  msToMax: number;
  /** Server-computed APR (GET /farms) — undefined when read on-chain (computed client-side then). */
  aprPct?: number | null;
  /** Reward token logo (GET /farms), null/undefined → initials fallback. */
  logoUrl?: string | null;
}

export interface Farm {
  /** Token staked in this farm (typically a DinoVox LP token). */
  stakedToken: string;
  totalStaked: string;
  stakers: number;
  streams: FarmRewardStream[];
  /** DinoVox pool address when the staked token is a known LP (GET /farms only). */
  pool?: string | null;
  /** Position MetaESDT nonce for this staked token, 0 = none yet (GET /farms only). */
  positionNonce?: number;
  /**
   * Streams one participant can follow on THIS farm (per-farm cap: default 2,
   * raised by unlockExtraFlux / the owner, bounded by the global ceiling).
   */
  maxActive?: number;
  /** Server cumulative APR (GET /farms): best `maxActive` streams by APR. */
  farmAprPct?: number | null;
  /** USD value of totalStaked (GET /farms). */
  tvlUsd?: number | null;
}

export interface FarmUserPosition {
  stake: string;
  /** Reward streams the user is enrolled in (earning). */
  activeRewards: string[];
  /** Pending rewards per rewarded token (raw), enrolled streams only. */
  pending: Record<string, string>;
  /** Per-stream checkpoints (GET /farms/positions): pending is then recomputed live client-side. */
  checkpoints?: Record<string, number>;
  /** Position MetaESDT held (≠ stake after stakeRewards) — GET /farms/positions only. */
  positionTokenBalance?: string;
}

// BigUint/u64 come back as BigNumber.js — toFixed(0) avoids scientific notation.
const str = (v: unknown) => (v != null && typeof (v as { toFixed?: unknown }).toFixed === "function" ? (v as { toFixed: (d: number) => string }).toFixed(0) : String(v ?? "0"));
const num = (v: unknown) => Number(str(v));

const controllerFor = (networkApiAddress: string, chainId: string) =>
  new SmartContractController({ chainID: chainId, networkProvider: new ApiNetworkProvider(networkApiAddress), abi: farmsAbi });

/** All farms (every staked token with its reward streams). */
export async function fetchFarms(networkApiAddress: string, chainId: string, farmsAddress: string): Promise<Farm[]> {
  const c = controllerFor(networkApiAddress, chainId);
  const contract = new Address(farmsAddress);
  const [stakedTokens] = await c.query({ contract, function: "getStakedTokens", arguments: [] });
  const tokens = ((stakedTokens ?? []) as unknown[]).map(String);
  return Promise.all(
    tokens.map(async (stakedToken) => {
      const [[views], maxActive] = await Promise.all([
        c.query({ contract, function: "getAllTokenPosition", arguments: [stakedToken] }),
        c
          .query({ contract, function: "getEffectiveMaxActiveRewardsPerPosition", arguments: [stakedToken] })
          .then(([m]) => num(m))
          .catch(() => undefined), // older contract without per-farm caps
      ]);
      const list = (views ?? []) as Array<Record<string, any>>;
      return {
        stakedToken,
        maxActive,
        totalStaked: list[0] ? str(list[0].total_staked) : "0",
        stakers: list[0] ? num(list[0].staked_addresses) : 0,
        streams: list.map((v) => ({
          rewardedToken: String(v.rewarded_token),
          balance: str(v.token_position.balance),
          totalRewarded: str(v.token_position.total_rewarded),
          feePercentage: num(v.token_position.fee_percentage),
          lastFundTimestampMs: num(v.token_position.last_fund_timestamp_ms),
          paused: !!v.token_position.paused,
          msToMax: num(v.token_position.ms_to_max),
        })),
      };
    }),
  );
}

/** The connected user's stake, enrolled streams and pending rewards on one farm. */
export async function fetchFarmUserPosition(
  networkApiAddress: string,
  chainId: string,
  farmsAddress: string,
  user: string,
  stakedToken: string,
): Promise<FarmUserPosition> {
  const c = controllerFor(networkApiAddress, chainId);
  const contract = new Address(farmsAddress);
  const userAddr = new Address(user);
  const [[stake], [active], [rewards]] = await Promise.all([
    c.query({ contract, function: "getUserStake", arguments: [userAddr, stakedToken] }),
    c.query({ contract, function: "getUserActiveRewards", arguments: [userAddr, stakedToken] }),
    c.query({ contract, function: "getAllUserRewards", arguments: [userAddr, stakedToken] }),
  ]);
  const pending: Record<string, string> = {};
  for (const r of (rewards ?? []) as Array<Record<string, any>>) pending[String(r.rewarded_token)] = str(r.rewards);
  return { stake: str(stake), activeRewards: ((active ?? []) as unknown[]).map(String), pending };
}

/** Position MetaESDT (farm token id + this staked token's nonce) — needed to unstake. */
export async function fetchFarmPositionToken(
  networkApiAddress: string,
  chainId: string,
  farmsAddress: string,
  stakedToken: string,
): Promise<{ farmTokenId: string; nonce: number }> {
  const c = controllerFor(networkApiAddress, chainId);
  const contract = new Address(farmsAddress);
  const [[farmTokenId], [nonce]] = await Promise.all([
    c.query({ contract, function: "getFarmTokenId", arguments: [] }),
    c.query({ contract, function: "getStakedTokenNonce", arguments: [stakedToken] }),
  ]);
  return { farmTokenId: String(farmTokenId), nonce: num(nonce) };
}

const YEAR_MS = 365 * 24 * 3600 * 1000;

/**
 * Indicative yearly reward emission of a stream, in reward-token raw units:
 * while everyone stays staked, the stream pays out ≈ balance / msToMax per ms
 * (cf. calculate_rewards). Uses the CURRENT balance, which decays as it pays
 * out — an upper-bound "today's pace", not a guaranteed yield.
 */
export function yearlyEmissionRaw(stream: FarmRewardStream): number {
  if (!stream.msToMax || stream.paused) return 0;
  return (Number(stream.balance) * Math.min(YEAR_MS, stream.msToMax)) / stream.msToMax;
}

/* ---- Funding (fund()) ---- */

export interface FarmsFundingConfig {
  /** Reward tokens fund() accepts (owner-curated whitelist). */
  whitelistedRewardTokens: string[];
  /** Default fund fee (basis points /10000) applied to NEW streams. */
  feePercent: number;
  /** Default reward window (ms) applied to NEW streams. */
  defaultMsToMax: number;
  /** Streams per participant a NEW farm starts with. */
  defaultMaxActive?: number;
  /** Hard ceiling of streams per participant (unlockExtraFlux can't go past it). */
  maxActiveCeiling?: number;
  /** unlockExtraFlux price (raw, paid in extraFluxToken) — +1 stream for everyone on a farm. */
  extraFluxPrice?: string;
  /** Token unlockExtraFlux is paid in (contract's extra_flux_token, ex remove_fees_token). */
  extraFluxToken?: string;
  /** Floor (raw) to open a NEW non-whitelisted stream on an existing farm (divisibility). */
  minFundAmountNonWhitelisted?: string;
}

export async function fetchFarmsFundingConfig(
  networkApiAddress: string,
  chainId: string,
  farmsAddress: string,
): Promise<FarmsFundingConfig> {
  const c = controllerFor(networkApiAddress, chainId);
  const contract = new Address(farmsAddress);
  const [[whitelisted], [feePercent], [defaultMsToMax], [defaultMax], [ceiling], [price], [extraFluxToken]] = await Promise.all([
    c.query({ contract, function: "getWhitelistedRewardTokens", arguments: [] }),
    c.query({ contract, function: "getFeePercent", arguments: [] }),
    c.query({ contract, function: "getDefaultMsToMax", arguments: [] }),
    c.query({ contract, function: "getDefaultMaxActiveRewardsPerPosition", arguments: [] }),
    c.query({ contract, function: "getMaxActiveRewardsPerPositionCeiling", arguments: [] }),
    c.query({ contract, function: "getExtraFluxPrice", arguments: [] }),
    // getExtraFluxToken (renamed 2026-10-19); getRemoveFeesToken on older contracts.
    c
      .query({ contract, function: "getExtraFluxToken", arguments: [] })
      .catch(() => c.query({ contract, function: "getRemoveFeesToken", arguments: [] }))
      .catch(() => [""]),
  ]);
  const minNonWl = await c
    .query({ contract, function: "getMinFundAmountNonWhitelisted", arguments: [] })
    .then(([m]) => str(m))
    .catch(() => undefined); // older contract without this floor
  return {
    whitelistedRewardTokens: ((whitelisted ?? []) as unknown[]).map(String),
    feePercent: num(feePercent),
    defaultMsToMax: num(defaultMsToMax),
    defaultMaxActive: num(defaultMax),
    maxActiveCeiling: num(ceiling),
    extraFluxPrice: str(price),
    extraFluxToken: String(extraFluxToken ?? ""),
    minFundAmountNonWhitelisted: minNonWl,
  };
}

/** Minimum first deposit to OPEN a new (staked, reward) stream (raw, "0" = none). Top-ups are exempt. */
export async function fetchMinFundAmount(
  networkApiAddress: string,
  chainId: string,
  farmsAddress: string,
  rewardToken: string,
): Promise<string> {
  const c = controllerFor(networkApiAddress, chainId);
  const [min] = await c.query({ contract: new Address(farmsAddress), function: "getMinFundAmount", arguments: [rewardToken] });
  return str(min);
}

/** Existing reward streams of one staked token (empty if none) — tells "new farm" from "top-up". */
export async function fetchFarmStreams(
  networkApiAddress: string,
  chainId: string,
  farmsAddress: string,
  stakedToken: string,
): Promise<FarmRewardStream[]> {
  const c = controllerFor(networkApiAddress, chainId);
  const [views] = await c.query({ contract: new Address(farmsAddress), function: "getAllTokenPosition", arguments: [stakedToken] });
  return ((views ?? []) as Array<Record<string, any>>).map((v) => ({
    rewardedToken: String(v.rewarded_token),
    balance: str(v.token_position.balance),
    totalRewarded: str(v.token_position.total_rewarded),
    feePercentage: num(v.token_position.fee_percentage),
    lastFundTimestampMs: num(v.token_position.last_fund_timestamp_ms),
    paused: !!v.token_position.paused,
    msToMax: num(v.token_position.ms_to_max),
  }));
}

/**
 * LP staked in farms by `user`, per staked token (raw). Read from the
 * position MetaESDT held in the wallet — 1:1 with the stake it was minted
 * for; the nonce's attributes carry the staked token identifier (cf.
 * ensure_farm_token_nonce). One farm-token-id query + one API call.
 */
export async function fetchUserFarmedBalances(
  networkApiAddress: string,
  chainId: string,
  farmsAddress: string,
  user: string,
): Promise<Record<string, string>> {
  const c = controllerFor(networkApiAddress, chainId);
  const [farmTokenId] = await c.query({ contract: new Address(farmsAddress), function: "getFarmTokenId", arguments: [] });
  const collection = String(farmTokenId ?? "");
  if (!collection) return {};
  const res = await fetch(
    `${networkApiAddress}/accounts/${user}/nfts?collections=${collection}&size=100&fields=identifier,balance,attributes`,
  );
  if (!res.ok) return {};
  const items = (await res.json()) as Array<{ balance?: string; attributes?: string }>;
  const out: Record<string, string> = {};
  for (const it of items) {
    if (!it.attributes || !it.balance) continue;
    let staked = "";
    try {
      staked = atob(it.attributes);
    } catch {
      continue;
    }
    if (!/^[A-Z0-9]{3,10}-[a-f0-9]{6}$/.test(staked)) continue;
    out[staked] = (BigInt(out[staked] ?? "0") + BigInt(it.balance)).toString();
  }
  return out;
}

/** Staked tokens that currently have at least one live reward stream (balance > 0, not paused). */
export async function fetchRewardedStakedTokens(networkApiAddress: string, chainId: string, farmsAddress: string): Promise<Set<string>> {
  const farms = await fetchFarms(networkApiAddress, chainId, farmsAddress);
  return new Set(
    farms.filter((f) => f.streams.some((s) => !s.paused && s.balance !== "0")).map((f) => f.stakedToken),
  );
}
