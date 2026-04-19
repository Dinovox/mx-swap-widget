import { default as default_2 } from 'react';
import { default as default_3 } from 'bignumber.js';
import { JSX as JSX_2 } from 'react/jsx-runtime';
import { PropsWithChildren } from 'react';
import { Transaction } from '@multiversx/sdk-core';
import { TransactionsDisplayInfoType } from '@multiversx/sdk-dapp/out/types/transactions.types';

export declare const AddLiquidity: () => JSX_2.Element;

/** Arbitrage opportunity response */
export declare interface ArbResponse {
    amountIn: string;
    amountOut: string;
    profit: string;
    profitBps: number;
    hops?: number;
    route?: QuoteHop[];
    tx: QuoteTx;
}

export declare const bigToHex: (bn: bigint) => string;

export declare const Card: ({ id, title, children, description, reference, className, onClick }: CardProps) => JSX_2.Element;

declare interface CardProps extends PropsWithChildren {
    id?: string;
    title?: default_2.ReactNode;
    description?: default_2.ReactNode;
    reference?: string;
    className?: string;
    onClick?: () => void;
}

export declare const CreatePool: () => JSX_2.Element;

/** DEX filter for the Pools page */
export declare type DexFilter = 'DinoVox' | 'XExchange';

/** Token from the DEX API */
export declare interface DexToken {
    identifier: string;
    ticker: string;
    poolCount?: number;
    decimals: number;
    logoUrl?: string | null;
}

export declare const FormatAmount: default_2.FC<FormatAmountProps>;

declare interface FormatAmountProps {
    amount: string | number | default_3 | null | undefined;
    identifier: string;
    decimals?: number;
    displayDecimals?: number;
    showIdentifier?: boolean;
    nonce?: number;
}

export declare const Liquidity: () => JSX_2.Element;

/** Pool with liquidity data — fields required for add/remove liquidity operations */
declare interface LiquidityPool extends Required<Pick<PoolInfo, 'lpToken' | 'reserveA' | 'reserveB' | 'lpSupply'>> {
    address: string;
    tokenA: string;
    tokenB: string;
    isActive: boolean;
}

/** Full pool info returned by the DEX API */
export declare interface PoolInfo {
    address: string;
    tokenA: string;
    tokenB: string;
    lpToken?: string;
    reserveA?: string;
    reserveB?: string;
    lpSupply?: string;
    isActive: boolean;
}

export declare const Pools: () => JSX_2.Element;

/** A single hop in a multi-hop swap route */
export declare interface QuoteHop {
    pair: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    dexType?: 'DinoVox' | 'XExchange' | 'JExchange';
    priceImpact?: string;
}

/** Full swap quote response */
export declare interface QuoteResponse {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    priceImpact: string;
    hops: number;
    route: QuoteHop[];
    tx: QuoteTx;
}

/** On-chain transaction data returned with a quote */
export declare interface QuoteTx {
    scAddress: string;
    txData: string;
    gasLimit: number;
    egldValue: string;
}

export declare const RemoveLiquidity: () => JSX_2.Element;

/** Resolved config available inside components */
export declare interface ResolvedSwapConfig extends SwapConfig {
    routes: SwapRoutes;
    navigate?: (path: string) => void;
}

export declare const signAndSendTransactions: ({ transactions, transactionsDisplayInfo, }: SignAndSendTransactionsProps) => Promise<string>;

declare type SignAndSendTransactionsProps = {
    transactions: Transaction[];
    transactionsDisplayInfo?: TransactionsDisplayInfoType;
};

export declare const Swap: () => JSX_2.Element;

export declare interface SwapConfig {
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
     * Called when the user clicks "Connect wallet" inside the widget.
     * Pass your app's connect/unlock handler here (e.g. navigate to the unlock route).
     * When omitted the button is disabled for unauthenticated users.
     */
    onConnect?: () => void;
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
}

export declare const SwapConfigProvider: default_2.FC<{
    config?: Partial<SwapConfig>;
    children: default_2.ReactNode;
}>;

export declare interface SwapRoutes {
    swap: string;
    liquidity: string;
    addLiquidity: string;
    removeLiquidity: string;
    createPool: string;
    pools: string;
}

/** Alias used by the swap interface */
export declare type SwapToken = DexToken;

export declare const SwapWidget: default_2.FC<SwapWidgetProps>;

declare interface SwapWidgetProps {
    initialView?: View;
}

/** Token metadata (used in Pools for display) */
export declare interface TokenMeta {
    identifier: string;
    ticker: string;
    decimals: number;
}

export declare function TokenSelect<T extends TokenSelectToken>({ value, onChange, tokens, exclude, loading, className, }: TokenSelectProps<T>): JSX_2.Element;

declare interface TokenSelectProps<T extends TokenSelectToken> {
    value: T | null;
    onChange: (t: T | null) => void;
    tokens: T[];
    exclude?: string;
    loading: boolean;
    className?: string;
}

declare interface TokenSelectToken {
    identifier: string;
    ticker: string;
    logoUrl?: string | null;
}

export declare const useGetUserESDT: (identifier?: string, options?: {
    enabled?: boolean;
}) => any[];

/** User's LP position for a specific pool */
export declare interface UserPosition {
    pool: LiquidityPool;
    balance: string;
    lpTotalSupply: string;
    decimalsA: number;
    decimalsB: number;
}

export declare const useSwapConfig: () => ResolvedSwapConfig;

declare type View = keyof SwapRoutes;

export { }
