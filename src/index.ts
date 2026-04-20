// Styles — extracted to dist/style.css during lib build
import './widget.css';

// Components
export { SwapWidget } from "./components/SwapWidget";
export { Swap } from "./components/Swap";
export { Liquidity } from "./components/Liquidity";
export { AddLiquidity } from "./components/AddLiquidity";
export { RemoveLiquidity } from "./components/RemoveLiquidity";
export { CreatePool } from "./components/CreatePool";
export { Pools } from "./components/Pools";

// Context / Config
export { SwapConfigProvider, useSwapConfig } from "./context/SwapConfigContext";
export type { SwapConfig, ResolvedSwapConfig } from "./context/SwapConfigContext";

// Types
export type {
  DexToken,
  SwapToken,
  PoolInfo,
  UserPosition,
  TokenMeta,
  DexFilter,
  QuoteHop,
  QuoteTx,
  QuoteResponse,
  ArbResponse,
} from "./types";

// Helpers
export { FormatAmount } from "./helpers/FormatAmount";
export { signAndSendTransactions } from "./helpers/signAndSendTransactions";
export { default as bigToHex } from "./helpers/bigToHex";

// Hooks
export { useGetUserESDT } from "./hooks/useGetUserEsdt";
export { useSwapView } from "./hooks/useSwapView";
export type { SwapView } from "./hooks/useSwapView";

// UI primitives
export { Card } from "./ui/Card";
export { TokenSelect } from "./ui/TokenSelect";
