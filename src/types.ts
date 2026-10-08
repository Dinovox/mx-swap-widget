/* ------------------------------------------------------------------ */
/*  Shared types for the Swap widget                                    */
/* ------------------------------------------------------------------ */

/** Token from the DEX API */
export interface DexToken {
  identifier: string;
  ticker: string;
  poolCount?: number;
  decimals: number;
  logoUrl?: string | null;
  priceUsd?: string | null;
}

/** Alias used by the swap interface */
export type SwapToken = DexToken;

/** Full pool info returned by the DEX API */
/** Trailing-window swap-fee APR estimate — see /pools and /pools/{address}. */
export interface PoolApr {
  aprPct: string;
  windowDays: number;
  /** Fees earned by LPs (USD) over the same `windowDays` window as aprPct. */
  feesUsdLp?: string | null;
}

export interface PoolInfo {
  address: string;
  tokenA: string;
  tokenB: string;
  lpToken?: string;
  reserveA?: string;
  reserveB?: string;
  lpSupply?: string;
  isActive: boolean;
  lpTokenPriceUsd?: string | null;
  apr?: PoolApr | null;
  /** Swaps over the last 24h (/pools list, independent of price). */
  volume24h?: { swapCount: number };
}

/** Pool with liquidity data — fields required for add/remove liquidity operations */
export interface LiquidityPool extends Required<Pick<PoolInfo, 'lpToken' | 'reserveA' | 'reserveB' | 'lpSupply'>> {
  address: string;
  tokenA: string;
  tokenB: string;
  isActive: boolean;
  lpTokenPriceUsd?: string | null;
  apr?: PoolApr | null;
  /** Swaps over the last 24h (/pools list, independent of price). */
  volume24h?: { swapCount: number };
  tvlUsd?: string | null;
  /** TVL change vs. the snapshot 24h / 7d ago (DinoVox pools). null = no snapshot in that window yet. */
  tvlChange24hPct?: string | null;
  tvlChange7dPct?: string | null;
  /** Pair is whitelisted on the dca-router — a DCA order can be created on it. */
  dcaReady?: boolean;
}

/** User's LP position for a specific pool */
export interface UserPosition {
  pool: LiquidityPool;
  balance: string;
  lpTotalSupply: string;
  decimalsA: number;
  decimalsB: number;
  priceA: number | null;
  priceB: number | null;
}

/** Token metadata (used in Pools for display) */
export interface TokenMeta {
  identifier: string;
  ticker: string;
  decimals: number;
  priceUsd?: string | null;
}

/** DEX filter for the Pools page */
export type DexFilter = 'DinoVox' | 'XExchange' | 'JExchange' | 'OneDex';

/** A single hop in a multi-hop swap route */
export interface QuoteHop {
  pair: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  dexType?: 'DinoVox' | 'XExchange' | 'JExchange' | 'OneDex' | 'LiquidStaking';
  priceImpact?: string;
}

/** On-chain transaction data returned with a quote */
export interface QuoteTx {
  scAddress: string;
  txData: string;
  gasLimit: number;
  egldValue: string;
}

/**
 * One leg of a multiroute split — `hops` uses the same shape as the top-level
 * `route`, plus the amounts/impact aggregated for that leg alone.
 */
export interface SplitRouteLeg {
  hops: QuoteHop[];
  amountIn: string;
  amountOut: string;
  priceImpact: string;
}

/** Single vs. split verdict returned alongside a `multiroute=true` quote. */
export interface SplitComparison {
  amountOutSingle: string;
  amountOutSplit: string;
  /** Positive = split is better. Null when amountOutSingle is 0. */
  improvementBps: string | null;
  better: "single" | "split" | "equal";
}

/** Full swap quote response */
export interface QuoteResponse {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  hops: number;
  route: QuoteHop[];
  tx: QuoteTx;
  /**
   * Set to 'stake' when the backend found that direct EGLD → liquid-staking is more
   * profitable than routing through a swap. Only ever occurs for EGLD → voxEGLD.
   * When set, amountOut is deterministic (no slippage should be applied to it).
   */
  source?: string;
  /**
   * Present only when the quote was requested with `multiroute=true` (exact-input
   * only). Test feature — no on-chain atomicity, each `txs[]` entry is an
   * independent `multiPairSwap`. See SplitRouteLeg / SplitComparison.
   */
  routes?: SplitRouteLeg[];
  /** One TxMeta per `routes[]` entry, same order — signable as-is. */
  txs?: QuoteTx[];
  splitComparison?: SplitComparison;
}

/** A DCA order as returned by GET /dca/orders (dca-escrow's on-chain Order mirrored in the backend DB). */
export interface DcaOrder {
  orderId: string; // u64 on-chain, string-encoded for JSON precision
  owner: string;
  tokenIn: string;
  tokenOut: string;
  tokenInTicker: string;
  tokenOutTicker: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  tokenInLogoUrl?: string | null;
  tokenOutLogoUrl?: string | null;
  amountPerExecution: string;
  intervalSeconds: number;
  remainingExecutions: number;
  minAmountOut: string;
  maxAmountOut: string;
  /** EGLD (attoEGLD) locked per execution, frozen at creation — "0" if waived (dca-escrow V5). */
  gasFeePerExecution: string;
  nextExecutionAt: string; // ISO date
  lastExecutedAt: string | null;
  status: "active" | "completed" | "cancelled";
}

/** One successful execution of a DCA order, as returned by GET /dca/orders/:orderId/executions. */
export interface DcaExecution {
  txHash: string;
  amountIn: string;
  amountOut: string;
  /** EGLD paid to the executor for this specific execution — "0" if waived. */
  gasFeePaid: string;
  timestamp: string; // ISO date
}

/** Arbitrage opportunity response */
export interface ArbResponse {
  amountIn: string;
  amountOut: string;
  profit: string;
  profitBps: number;
  hops?: number;
  route?: QuoteHop[];
  tx: QuoteTx;
}
