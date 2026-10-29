import { useSwapConfig } from "./context/SwapConfigContext";

/*
 * Feature flags — mostly experimental features tested on devnet first.
 *
 * The widget is a library: the network isn't known at build time, only at
 * runtime through the host's SwapConfig.chainId ('1' mainnet, 'D' devnet,
 * 'T' testnet). Flags that depend on it are therefore read with the
 * useFeatureFlags() hook, not as module constants.
 */

const MAINNET_CHAIN_ID = "1";

/**
 * JEXchange "+ Add" button on JExchange pool cards (inline JexAddLiquidity
 * form, addLiquidity on the JEXchange pair) — tested OK on mainnet.
 */
export const JEX_ADD_ENABLED = true;

export interface FeatureFlags {
  /**
   * Limit orders / order book (pair orderbook.rs): full Limit view + the
   * order-book depth on DinoVox pool cards. Off on mainnet until the pairs
   * are upgraded there (the Limit tab then shows a "coming soon" card); on
   * devnet / testnet everywhere. (Swap keeps reading the backend's order-book
   * hints — maxAmountIn, illiquidPools — on every network.)
   */
  orderBook: boolean;
}

/** Flags for a given chain ID ('1' mainnet, 'D' devnet, 'T' testnet). */
export function featureFlagsFor(chainId: string | undefined): FeatureFlags {
  const mainnet = (chainId ?? MAINNET_CHAIN_ID) === MAINNET_CHAIN_ID;
  return {
    orderBook: !mainnet,
  };
}

/** Flags for the network the widget is configured on (SwapConfig.chainId). */
export function useFeatureFlags(): FeatureFlags {
  const { chainId } = useSwapConfig();
  return featureFlagsFor(chainId);
}
