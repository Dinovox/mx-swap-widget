import { useEffect, useState } from "react";
import axios from "axios";
import type { LiquidityPool } from "../types";

/**
 * OneDex runs every pair in one contract (mainnet only): the backend names
 * its pools "onedex-<pairId>", liquidity calls go to this address.
 */
export const ONEDEX_SC = "erd1qqqqqqqqqqqqqpgqqz6vp9y50ep867vnr296mqf3dduh6guvmvlsu3sujc";
const ONEDEX_POOL_PREFIX = "onedex-";

/** Contract that receives a pool's addLiquidity / removeLiquidity. */
export const liquidityReceiver = (pool: Pick<LiquidityPool, "address">) =>
  pool.address.startsWith(ONEDEX_POOL_PREFIX) ? ONEDEX_SC : pool.address;

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
/** Length-prefixed (u32) token identifiers from `from`, as many as asked. */
const readTokens = (b: Uint8Array, from: number, count: number) => {
  const tokens: string[] = [];
  let i = from;
  for (let k = 0; k < count && i + 4 <= b.length; k++) {
    const len = u32(b, i);
    tokens.push(new TextDecoder().decode(b.subarray(i + 4, i + 4 + len)));
    i += 4 + len;
  }
  return tokens;
};

/**
 * The pair's token order in its contract — the order of the payments and of
 * the min amounts. The backend stores OneDex and AshSwap pools sorted
 * (tokenA < tokenB), which can be the reverse: read it on-chain there
 * (OneDex viewPair: pair_id u32, state u8, enabled bool, owner 32 bytes,
 * then first / second token; AshSwap getTokens). Other DEXes keep the
 * contract order.
 */
export async function fetchContractTokenOrder(
  networkApiAddress: string,
  pool: Pick<LiquidityPool, "address" | "tokenA" | "tokenB" | "dexType">,
): Promise<[string, string]> {
  let tokens: string[] | null = null;
  if (pool.address.startsWith(ONEDEX_POOL_PREFIX)) {
    const pairId = parseInt(pool.address.slice(ONEDEX_POOL_PREFIX.length), 10);
    const hex = pairId.toString(16);
    const { data } = await axios.post(`${networkApiAddress}/query`, {
      scAddress: ONEDEX_SC,
      funcName: "viewPair",
      args: [hex.length % 2 ? "0" + hex : hex],
    });
    tokens = readTokens(b64ToBytes(data.returnData[0]), 4 + 1 + 1 + 32, 2);
  } else if (pool.dexType === "AshSwapStable") {
    const { data } = await axios.post(`${networkApiAddress}/query`, { scAddress: pool.address, funcName: "getTokens", args: [] });
    tokens = readTokens(b64ToBytes(data.returnData[0]), 0, 2);
  }
  if (!tokens) return [pool.tokenA, pool.tokenB];
  // Guard: the same two tokens, else the stored order rather than a wrong call.
  const [first, second] = tokens;
  if (first === pool.tokenB && second === pool.tokenA) return [pool.tokenB, pool.tokenA];
  if (first === pool.tokenA && second === pool.tokenB) return [pool.tokenA, pool.tokenB];
  throw new Error(`Unexpected contract tokens for ${pool.address}: ${tokens.join(", ")}`);
}

/** Read once per pool (an order never changes). */
export function useContractTokenOrder(
  networkApiAddress: string | undefined,
  pool: Pick<LiquidityPool, "address" | "tokenA" | "tokenB" | "dexType"> | undefined,
): [string, string] | null {
  const [order, setOrder] = useState<{ address: string; tokens: [string, string] } | null>(null);
  const needsRead = !!pool && (pool.address.startsWith(ONEDEX_POOL_PREFIX) || pool.dexType === "AshSwapStable");
  useEffect(() => {
    if (!pool || !needsRead || !networkApiAddress) return;
    let cancelled = false;
    fetchContractTokenOrder(networkApiAddress, pool)
      .then((tokens) => !cancelled && setOrder({ address: pool.address, tokens }))
      .catch((err) => console.error("[liquidity] token order:", err));
    return () => {
      cancelled = true;
    };
  }, [networkApiAddress, pool?.address]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pool) return null;
  if (!needsRead) return [pool.tokenA, pool.tokenB];
  return order?.address === pool.address ? order.tokens : null;
}
