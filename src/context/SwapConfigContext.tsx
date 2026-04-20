import React, { createContext, useContext } from 'react';

export interface SwapConfig {
  /** Base URL of the DEX API  e.g. 'https://dex.dinovox.com/api/v1' */
  apiUrl: string;
  /** Router smart contract address */
  routerAddress: string;
  /** Aggregator smart contract address */
  aggregatorAddress: string;
  /** Factory smart contract address */
  factoryAddress: string;
  /** Wrap/unwrap contract address (EGLD ↔ WEGLD) */
  wrapContract: string;
  /** WEGLD token identifier  e.g. 'WEGLD-bd4d79' */
  wegldIdentifier: string;
  /**
   * Called when the user clicks "Connect wallet" inside the widget.
   * Pass your app's connect/unlock handler here (e.g. navigate to the unlock route).
   * When omitted the button is disabled for unauthenticated users.
   */
  onConnect?: () => void;
  /**
   * Called when the widget needs to sign and broadcast a transaction.
   * Pass your app's signAndSendTransactions from sdk-dapp so the widget
   * never touches the signing provider directly (avoids module-scope issues
   * in production Vite bundles).
   *
   * Example:
   *   import { signAndSendTransactions } from '@multiversx/sdk-dapp/...';
   *   <SwapWidget onSignTransactions={(txs, info) =>
   *     signAndSendTransactions({ transactions: txs, transactionsDisplayInfo: info })
   *   } />
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSignTransactions?: (
    transactions: any[],
    displayInfo: { processingMessage: string; errorMessage: string; successMessage: string },
  ) => Promise<unknown>;
  /**
   * Language code for widget UI (e.g. 'en', 'fr').
   * Defaults to navigator.language. Pass your app's current language here
   * to keep the widget in sync without requiring initReactI18next.
   */
  language?: string;
  /**
   * Color theme for the widget.
   * When omitted the widget inherits the host app's Tailwind dark mode
   * (i.e. reacts to the `dark` class on `<html>`).
   * Pass `'dark'` or `'light'` to pin the widget theme independently
   * of the host app — useful for apps without their own theme toggle.
   */
  theme?: 'light' | 'dark' | 'mid';
  /** Default "from" token identifier loaded when no `from` URL param is present. */
  defaultFrom?: string;
  /** Default "to" token identifier loaded when no `to` URL param is present. */
  defaultTo?: string;
  /**
   * When set, only tokens whose identifier is in this list are shown.
   * EGLD is always included regardless of this list.
   */
  whitelist?: string[];
  /**
   * Tokens whose identifier is in this list are hidden from the selector.
   * Takes effect after whitelist filtering.
   */
  blacklist?: string[];
  /**
   * Wallet address. Pass from the host app's own useGetAccount() call to
   * guarantee wallet detection in production (avoids Zustand/bundle-boundary
   * edge cases in Vite prod builds). Falls back to the widget's internal
   * useGetAccount() when omitted.
   */
  address?: string;
  /**
   * MultiversX API base URL (e.g. 'https://api.multiversx.com').
   * Pass from the host app's own useGetNetworkConfig() call for the same
   * reason as `address` — avoids Zustand hydration issues in prod bundles.
   * Defaults to 'https://api.multiversx.com' (mainnet).
   */
  networkApiAddress?: string;
  /**
   * MultiversX chain ID. Pass from the host app's useGetNetworkConfig().
   * Defaults to '1' (mainnet). Use 'D' for devnet, 'T' for testnet.
   */
  chainId?: string;
  /**
   * MultiversX explorer base URL.
   * Defaults to 'https://explorer.multiversx.com' (mainnet).
   */
  explorerAddress?: string;
}

/** Resolved config available inside components */
export type ResolvedSwapConfig = SwapConfig;

const DEFAULT_CONFIG: ResolvedSwapConfig = {
  apiUrl: 'https://dex.dinovox.com/api/v1',
  routerAddress: 'erd1qqqqqqqqqqqqqpgq67xp5hv48n5vy5d8990uq8kpx99h7rfkfm8s2zqqxn',
  aggregatorAddress: 'erd1qqqqqqqqqqqqqpgqly98mw70swxc403a7r63mr7pkzh9uhazfm8suv22ak',
  factoryAddress: 'erd1qqqqqqqqqqqqqpgqq5852gnes6xxka35lw42prqwtv6a0znhfm8sn3h9n3',
  wrapContract: 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
  wegldIdentifier: 'WEGLD-bd4d79',
  networkApiAddress: 'https://api.multiversx.com',
  chainId: '1',
  explorerAddress: 'https://explorer.multiversx.com',
};

const SwapConfigContext = createContext<ResolvedSwapConfig>(DEFAULT_CONFIG);

export const SwapConfigProvider: React.FC<{
  config?: Partial<SwapConfig>;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const merged: ResolvedSwapConfig = { ...DEFAULT_CONFIG, ...config };
  return (
    <SwapConfigContext.Provider value={merged}>
      {children}
    </SwapConfigContext.Provider>
  );
};

export const useSwapConfig = (): ResolvedSwapConfig => useContext(SwapConfigContext);
