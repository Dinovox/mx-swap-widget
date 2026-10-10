import axios from "axios";
import type { LiquidityPool } from "../types";

const PAGE_SIZE = 200; // API max

export interface PoolsPage {
  pools: LiquidityPool[];
  summary?: { poolCount: number; poolCountPriced: number; tvlUsd: string | null; volume24hSwapCount: number } | null;
  pagination?: { limit: number; offset: number; total: number };
}

/**
 * GET /pools, every page. The endpoint is paginated (default limit 50, max 200)
 * — callers that need the whole set (LP-token lookups, user positions, pool by
 * address) must not rely on a single call. Falls back to one call against an
 * older API without `pagination`.
 */
export async function fetchAllPools(
  apiUrl: string,
  params: Record<string, string | number> = {},
): Promise<LiquidityPool[]> {
  const all: LiquidityPool[] = [];
  let offset = 0;
  for (;;) {
    const { data } = await axios.get<PoolsPage>(`${apiUrl}/pools`, {
      params: { ...params, limit: PAGE_SIZE, offset },
    });
    all.push(...(data.pools || []));
    const total = data.pagination?.total;
    offset += PAGE_SIZE;
    if (total == null || offset >= total || (data.pools || []).length === 0) break;
  }
  return all;
}
