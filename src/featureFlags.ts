import { useSwapConfig } from "./context/SwapConfigContext";

/*
 * Feature flags — mostly experimental features tested on devnet first.
 *
 * The widget is a library: the network isn't known at build time, only at
 * runtime through the host's SwapConfig.chainId ('1' mainnet, 'D' devnet,
 * 'T' testnet). Flags that depend on it are therefore read with the
 * useFeatureFlags() hook, not as module constants.
 */

/**
 * JEXchange "+ Add" button on JExchange pool cards (inline JexAddLiquidity
 * form, addLiquidity on the JEXchange pair) — tested OK on mainnet.
 */
export const JEX_ADD_ENABLED = true;

export interface FeatureFlags {
  /**
   * Limit orders / order book (pair orderbook.rs): full Limit view + the
   * order-book depth and its share of the TVL on DinoVox pool cards and the
   * pools header. Live on mainnet.
   */
  orderBook: boolean;
  /**
   * "Dex Fees" tab: anyone can trigger the fee collector (processFees,
   * claimProceeds, compound…). Live on mainnet; without a
   * feeCollectorAddress the tab shows a "not available" state.
   */
  dexFees: boolean;
}

/** Flags for a given chain ID ('1' mainnet, 'D' devnet, 'T' testnet). */
export function featureFlagsFor(_chainId: string | undefined): FeatureFlags {
  return {
    orderBook: true,
    dexFees: true,
  };
}

/** Flags for the network the widget is configured on (SwapConfig.chainId). */
export function useFeatureFlags(): FeatureFlags {
  const { chainId } = useSwapConfig();
  return featureFlagsFor(chainId);
}
