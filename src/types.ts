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
}

/** Pool with liquidity data — fields required for add/remove liquidity operations */
export interface LiquidityPool extends Required<Pick<PoolInfo, 'lpToken' | 'reserveA' | 'reserveB' | 'lpSupply'>> {
  address: string;
  tokenA: string;
  tokenB: string;
  isActive: boolean;
  lpTokenPriceUsd?: string | null;
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
export type DexFilter = 'DinoVox' | 'XExchange';

/** A single hop in a multi-hop swap route */
export interface QuoteHop {
  pair: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  dexType?: 'DinoVox' | 'XExchange' | 'JExchange';
  priceImpact?: string;
}

/** On-chain transaction data returned with a quote */
export interface QuoteTx {
  scAddress: string;
  txData: string;
  gasLimit: number;
  egldValue: string;
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
