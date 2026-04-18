# @dinovox/mx-swap-widget

Plug-and-play swap & liquidity widget for [MultiversX](https://multiversx.com) dApps, built by [DinoVox](https://dinovox.com).

- Token swap with multi-hop routing across DinoVox and XExchange pools
- Arbitrage detection (same-token circular swap)
- EGLD ↔ WEGLD wrap / unwrap
- Liquidity management: add, remove, create pools, browse pools
- Bidirectional amount input (type what you want to receive, get the required input)
- Internal SPA routing via URL anchors — no page reloads
- Built-in translations (English & French), works without `react-i18next` in the host app

---

## Installation

```bash
# npm
npm install @dinovox/mx-swap-widget

# from GitHub
npm install github:Dinovox/mx-swap-widget
```

Import the stylesheet once in your app entry:

```ts
import '@dinovox/mx-swap-widget/styles.css';
```

---

## Quick start

The simplest integration — drop `<SwapWidget />` anywhere in your app:

```tsx
import { SwapWidget } from '@dinovox/mx-swap-widget';
import '@dinovox/mx-swap-widget/styles.css';

export const SwapPage = () => (
  <SwapWidget />
);
```

No configuration required. The widget connects to the DinoVox DEX API and handles all views (Swap, Liquidity, Pools…) internally.

---

## Configuration

Wrap with `SwapConfigProvider` to override any default:

```tsx
import { SwapWidget, SwapConfigProvider } from '@dinovox/mx-swap-widget';

export const SwapPage = () => (
  <SwapConfigProvider config={{
    language: 'fr',              // 'en' | 'fr' — defaults to navigator.language
    navigate: useNavigate(),     // pass your router's navigate for SPA navigation
  }}>
    <SwapWidget />
  </SwapConfigProvider>
);
```

### `SwapConfig` reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | DinoVox mainnet API | Base URL of the DEX API |
| `routerAddress` | `string` | DinoVox router | Router smart contract address |
| `aggregatorAddress` | `string` | DinoVox aggregator | Aggregator smart contract address |
| `factoryAddress` | `string` | DinoVox factory | Factory smart contract address |
| `wrapContract` | `string` | DinoVox wrap contract | EGLD ↔ WEGLD wrap contract address |
| `wegldIdentifier` | `string` | `WEGLD-bd4d79` | WEGLD token identifier |
| `routes` | `Partial<SwapRoutes>` | See below | URL paths for each view |
| `navigate` | `(path: string) => void` | `window.location.assign` | Navigation function from the host router |
| `language` | `string` | `navigator.language` | Language code (`'en'`, `'fr'`) |
| `theme` | `'light' \| 'dark'` | *(inherit)* | Pin the widget theme independently of the host app. When omitted the widget follows the host app's `dark` class on `<html>`. |

### Default routes

```ts
{
  swap:            '/swap',
  liquidity:       '/liquidity',
  addLiquidity:    '/liquidity/add',
  removeLiquidity: '/liquidity/remove',
  createPool:      '/liquidity/create',
  pools:           '/liquidity/pools',
}
```

---

## URL anchors & deep-linking

`SwapWidget` manages view navigation via URL hash fragments — no full page reloads, no host router dependency.

| View | Hash |
|---|---|
| Swap | *(none)* |
| Liquidity | `#liquidity` |
| Add Liquidity | `#add-liquidity` |
| Remove Liquidity | `#remove-liquidity` |
| Create Pool | `#create-pool` |
| Pools | `#pools` |

Deep-linking works out of the box: `/swap#add-liquidity?tokenA=EGLD&tokenB=WEGLD-bd4d79` opens directly on the Add Liquidity view with tokens pre-selected.

Browser back/forward navigation is supported.

---

## Token pre-selection via URL

Pass `from` and `to` query params to pre-select tokens in the Swap view:

```
/swap?from=EGLD&to=WEGLD-bd4d79
```

---

## Standalone components

Individual views are also exported if you manage routing yourself:

```tsx
import {
  Swap,
  Liquidity,
  AddLiquidity,
  RemoveLiquidity,
  CreatePool,
  Pools,
} from '@dinovox/mx-swap-widget';
```

When using standalone components, wrap them with `SwapConfigProvider` and ensure the host app provides a `react-i18next` instance via `initReactI18next`, or use `SwapWidget` which handles i18n internally.

---

## Peer dependencies

These must be installed in the host app:

```json
{
  "@multiversx/sdk-core": ">=15",
  "@multiversx/sdk-dapp": ">=5",
  "axios": ">=1",
  "bignumber.js": ">=9",
  "lucide-react": ">=0.400",
  "react": ">=18",
  "react-dom": ">=18",
  "react-i18next": ">=15"
}
```

---

## Exported utilities

| Export | Description |
|---|---|
| `SwapWidget` | All-in-one widget with internal routing |
| `SwapConfigProvider` | Configuration context provider |
| `useSwapConfig` | Hook to read the resolved config |
| `FormatAmount` | Token amount formatter component |
| `signAndSendTransactions` | Helper to sign & send MultiversX transactions |
| `bigToHex` | BigInt → hex string helper |
| `useGetUserESDT` | Hook to fetch user ESDT token balances |
| `Card` | Card UI primitive |
| `TokenSelect` | Token selector dropdown UI primitive |

---

## License

MIT — [DinoVox](https://dinovox.com)
