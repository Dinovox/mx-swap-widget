# @dinovox/mx-swap-widget

Plug-and-play swap & liquidity widget for [MultiversX](https://multiversx.com) dApps, built by [DinoVox](https://dinovox.com).

- Token swap with multi-hop routing across DinoVox and XExchange pools
- Arbitrage detection (same-token circular swap)
- EGLD ↔ WEGLD wrap / unwrap
- Liquidity management: add, remove, create pools, browse pools
- Bidirectional amount input (type what you want to receive, get the required input)
- Internal SPA routing via URL anchors — no page reloads, no host router dependency
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
    language: 'fr',
    onConnect: () => navigate('/unlock'),
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
| `onConnect` | `() => void` | — | Called when the user clicks "Connect wallet" while unauthenticated. Pass your app's unlock handler. When omitted the button is disabled. |
| `language` | `string` | `navigator.language` | Language code (`'en'`, `'fr'`) |
| `theme` | `'light' \| 'dark' \| 'mid'` | *(inherit)* | Pin the widget theme independently of the host app. When omitted the widget follows the host app's `dark` class on `<html>`. |

---

## Navigation

The widget manages its own view switching via URL hash fragments — no host router required, no page reloads.

| View | Hash |
|---|---|
| Swap | `#swap` *(or no hash)* |
| Liquidity | `#liquidity` |
| Add Liquidity | `#add-liquidity` |
| Remove Liquidity | `#remove-liquidity` |
| Create Pool | `#create-pool` |
| Pools | `#pools` |

The browser's back/forward buttons work out of the box.

### Deep-linking

Navigate directly to any view by setting the hash in the URL:

```
/your-page#add-liquidity?tokenA=EGLD&tokenB=WEGLD-bd4d79
```

### Programmatic navigation

Use the exported `useSwapView` hook to read the current view or navigate from outside the widget:

```tsx
import { useSwapView } from '@dinovox/mx-swap-widget';

const { view, goTo } = useSwapView();

goTo('add-liquidity', { tokenA: 'EGLD', tokenB: 'WEGLD-bd4d79' });
```

---

## SwapWidget props

Beyond `SwapConfigProvider`, `SwapWidget` accepts a set of props that override the config for token pre-selection and filtering.

### Default tokens

Pre-select tokens in the Swap view. These are used as fallback when no `from` / `to` URL param is present.

```tsx
<SwapWidget
  defaultFrom="EGLD"
  defaultTo="USDC-c76f1f"
/>
```

URL params always take precedence over these defaults:
```
/your-page?from=WEGLD-bd4d79   ← this wins over defaultFrom
```

### Token whitelist / blacklist

Control which tokens appear in the selector.

```tsx
<SwapWidget
  whitelist={['EGLD', 'WEGLD-bd4d79', 'USDC-c76f1f']}
/>
```

```tsx
<SwapWidget
  blacklist={['SPAM-123456', 'SCAM-abcdef']}
/>
```

Both can be combined. Whitelist is applied first, blacklist is applied after.

| Prop | Type | Behaviour when omitted |
|---|---|---|
| `defaultFrom` | `string` | No token pre-selected |
| `defaultTo` | `string` | No token pre-selected |
| `whitelist` | `string[]` | All tokens shown |
| `blacklist` | `string[]` | No token hidden |

---

## Token pre-selection via URL

Pass `from` and `to` query params to pre-select tokens in the Swap view:

```
/your-page?from=EGLD&to=WEGLD-bd4d79
```

These params are also written to the URL when the user picks a token, enabling shareable links.

---

## Standalone components

Individual views are also exported if you manage rendering yourself:

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

When using standalone components, wrap them with `SwapConfigProvider`. The `SwapWidget` wrapper handles i18n internally; standalone components require a `react-i18next` instance via `initReactI18next` in the host app.

---

## Peer dependencies

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

## Exported API

| Export | Description |
|---|---|
| `SwapWidget` | All-in-one widget with internal routing |
| `SwapConfigProvider` | Configuration context provider |
| `useSwapConfig` | Hook to read the resolved config |
| `useSwapView` | Hook to read the current view and navigate (`goTo`) |
| `FormatAmount` | Token amount formatter component |
| `signAndSendTransactions` | Helper to sign & send MultiversX transactions |
| `bigToHex` | BigInt → hex string helper |
| `useGetUserESDT` | Hook to fetch user ESDT token balances |
| `Card` | Card UI primitive |
| `TokenSelect` | Token selector dropdown UI primitive |

---

## License

MIT — [DinoVox](https://dinovox.com)
