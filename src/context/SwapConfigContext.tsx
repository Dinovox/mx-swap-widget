import React, { createContext, useContext } from 'react';

export interface SwapRoutes {
  swap: string;
  liquidity: string;
  addLiquidity: string;
  removeLiquidity: string;
  createPool: string;
  pools: string;
}

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
  /** App route paths (defaults work out-of-the-box with dinotool routing) */
  routes?: Partial<SwapRoutes>;
  /**
   * Navigation function provided by the host app.
   * When omitted the widget falls back to window.location.assign().
   * Pass your router's navigate() here to get SPA-style navigation.
   */
  navigate?: (path: string) => void;
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
  theme?: 'light' | 'dark';
}

const DEFAULT_ROUTES: SwapRoutes = {
  swap: '/swap',
  liquidity: '/liquidity',
  addLiquidity: '/liquidity/add',
  removeLiquidity: '/liquidity/remove',
  createPool: '/liquidity/create',
  pools: '/liquidity/pools',
};

/** Resolved config available inside components */
export interface ResolvedSwapConfig extends SwapConfig {
  routes: SwapRoutes;
  navigate?: (path: string) => void;
}

const DEFAULT_CONFIG: ResolvedSwapConfig = {
  apiUrl: 'https://dex.dinovox.com/api/v1',
  routerAddress: 'erd1qqqqqqqqqqqqqpgq67xp5hv48n5vy5d8990uq8kpx99h7rfkfm8s2zqqxn',
  aggregatorAddress: 'erd1qqqqqqqqqqqqqpgqly98mw70swxc403a7r63mr7pkzh9uhazfm8suv22ak',
  factoryAddress: 'erd1qqqqqqqqqqqqqpgqq5852gnes6xxka35lw42prqwtv6a0znhfm8sn3h9n3',
  wrapContract: 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
  wegldIdentifier: 'WEGLD-bd4d79',
  routes: DEFAULT_ROUTES,
};

const SwapConfigContext = createContext<ResolvedSwapConfig>(DEFAULT_CONFIG);

export const SwapConfigProvider: React.FC<{
  config?: Partial<SwapConfig>;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const merged: ResolvedSwapConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    routes: { ...DEFAULT_ROUTES, ...config?.routes },
  };
  return (
    <SwapConfigContext.Provider value={merged}>
      {children}
    </SwapConfigContext.Provider>
  );
};

export const useSwapConfig = (): ResolvedSwapConfig => useContext(SwapConfigContext);
