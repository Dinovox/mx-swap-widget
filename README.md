# @dinovox/mx-swap-widget

Plug-and-play swap & liquidity widget for [MultiversX](https://multiversx.com) dApps, built by [DinoVox](https://dinovox.com).

- **Swap** with multi-hop routing across DinoVox, xExchange, OneDex and JExchange pools, bidirectional amount input (type what you want to receive), gas measured by network simulation for the connected wallet, price chart (candles) of the bought token
- EGLD ↔ WEGLD wrap / unwrap
- **DCA** — recurring buys through the `dca-escrow` contract (create / cancel orders, optional receiver, limits)
- **Liquidity** — one merged view of all pools and the wallet's positions (value, pool share, estimated fees), TVL / price history, recent swaps, APR (LP fees + farm); add (two tokens, or one token auto-split via `addLiquiditySingle`), remove, create pools
- **Farms** — stake / unstake DinoVox LP tokens, follow reward streams, claim, unlock extra stream slots; `#farms-rewards` view lets anyone fund a farm with rewards
- **Limit orders** — passive order book inside each DinoVox pair: place / cancel orders at your price, order-book depth, one-click pair deployment, see [Limit orders](#limit-orders)
- JEXchange shutdown helper: badge on the JExchange tab when the wallet still holds JEXchange LP tokens
- **Referral program** — integrators can earn a share of the aggregator fees on swaps made from their dApp, see [Referral](#referral-earn-a-share-of-the-aggregator-fees)
- Internal SPA routing via URL anchors — no page reloads, no host router dependency
- Built-in translations (English & French), works without `react-i18next` in the host app

---

## Installation

```bash
# from npm
npm install @dinovox/mx-swap-widget

# from GitHub
npm install github:Dinovox/mx-swap-widget
```

Import the stylesheet once in your app entry:

```ts
import "@dinovox/mx-swap-widget/styles.css";
```

---

## Quick start

```tsx
import { SwapWidget } from "@dinovox/mx-swap-widget";
import "@dinovox/mx-swap-widget/styles.css";

export const SwapPage = () => <SwapWidget />;
```

No configuration required on mainnet: every contract address and the DinoVox DEX API default to mainnet, and the widget handles all its views (Swap, DCA, Liquidity, Farms…) internally.

> **Devnet / testnet**: the defaults are mainnet-only. Pass `apiUrl`, every contract address, `wegldIdentifier`, `networkApiAddress`, `chainId` and `explorerAddress` for the target network, and `""` for `dcaEscrowAddress` / `farmsAddress` if those contracts aren't deployed there.

---

## Configuration

Wrap with `SwapConfigProvider` to override any default:

```tsx
import { SwapWidget, SwapConfigProvider } from "@dinovox/mx-swap-widget";

export const SwapPage = () => (
  <SwapConfigProvider
    config={{
      language: "fr",
      onConnect: () => navigate("/unlock"),
    }}
  >
    <SwapWidget />
  </SwapConfigProvider>
);
```

### `SwapConfig` reference

| Prop                 | Type                              | Default                           | Description                                                                                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrl`             | `string`                          | DinoVox mainnet API               | Base URL of the DEX API                                                                                                                                                                                                                                                                                         |
| `routerAddress`      | `string`                          | DinoVox router                    | Router smart contract address                                                                                                                                                                                                                                                                                   |
| `aggregatorAddress`  | `string`                          | DinoVox aggregator                | Aggregator smart contract address                                                                                                                                                                                                                                                                               |
| `voxEgldAddress`     | `string`                          | DinoVox VOX-EGLD                  | VOX-EGLD (liquid staking) smart contract address                                                                                                                                                                                                                                                                |
| `factoryAddress`     | `string`                          | DinoVox factory                   | Factory smart contract address                                                                                                                                                                                                                                                                                  |
| `wrapContract`       | `string`                          | DinoVox wrap contract             | EGLD ↔ WEGLD wrap contract address                                                                                                                                                                                                                                                                              |
| `dcaEscrowAddress`   | `string`                          | DinoVox DCA escrow (mainnet)      | `dca-escrow` contract — entry point of DCA orders. Pass `""` to disable the DCA tab (shows a "not available" state).                                                                                                                                                                                            |
| `farmsAddress`       | `string`                          | DinoVox farms (mainnet)           | Farms contract (multi-reward LP staking). Pass `""` to disable the Farms tab (shows a "not available" state).                                                                                                                                                                                                   |
| `wegldIdentifier`    | `string`                          | `WEGLD-bd4d79`                    | WEGLD token identifier                                                                                                                                                                                                                                                                                          |
| `onConnect`          | `() => void`                      | —                                 | Called when the user clicks "Connect wallet" while unauthenticated. Pass your app's unlock handler. When omitted the button is disabled.                                                                                                                                                                        |
| `onSignTransactions` | `(txs, info) => Promise<unknown>` | _(internal signing)_              | Called when the widget needs to sign & broadcast a transaction. Pass your app's own `signAndSendTransactions` (from sdk-dapp) so the widget never touches the signing provider directly — avoids module-scope issues in production Vite bundles. Falls back to the widget's internal signing flow when omitted. |
| `address`            | `string`                          | _(auto-detected)_                 | Wallet address. Pass from the host app's own account hook (e.g. `useGetAccount()`) to guarantee wallet detection in production. Falls back to the widget's own detection when omitted.                                                                                                                          |
| `networkApiAddress`  | `string`                          | `https://api.multiversx.com`      | MultiversX API base URL. Pass from the host app's own `useGetNetworkConfig()` for the same reason as `address`.                                                                                                                                                                                                 |
| `chainId`            | `string`                          | `'1'`                             | MultiversX chain ID. Use `'D'` for devnet, `'T'` for testnet.                                                                                                                                                                                                                                                   |
| `explorerAddress`    | `string`                          | `https://explorer.multiversx.com` | MultiversX explorer base URL — used for on-chain links (pool contracts, transactions).                                                                                                                                                                                                                          |
| `language`           | `string`                          | `navigator.language`              | Language code (`'en'`, `'fr'`)                                                                                                                                                                                                                                                                                  |
| `theme`              | `'light' \| 'dark' \| 'mid'`      | _(inherit)_                       | Pin the widget theme independently of the host app. When omitted the widget follows the host app's `dark` class on `<html>`.                                                                                                                                                                                    |

---

## Navigation

The widget manages its own view switching via URL hash fragments — no host router required, no page reloads.

| View              | Hash                            | Query params                                   |
| ----------------- | ------------------------------- | ---------------------------------------------- |
| Swap              | `#swap` _(or no hash)_          | `from`, `to`                                   |
| Limit orders      | `#limit`                        | `from`, `to`                                   |
| DCA               | `#dca`                          | `tokenIn`, `tokenOut`                          |
| Liquidity / Pools | `#liquidity` _(alias `#pools`)_ | `filter` (token search)                        |
| Add Liquidity     | `#add-liquidity`                | `tokenA`, `tokenB`, `mode=single`              |
| Remove Liquidity  | `#remove-liquidity`             | `pool` (pair address)                          |
| Create Pool       | `#create-pool`                  | `tokenX`, `tokenY`                             |
| Farms             | `#farms`                        | `pool` (pair address), `filter` (token search) |
| Fund a farm       | `#farms-rewards` _(not linked)_ | `staked` (LP token identifier)                 |

The top-level tabs are Swap · Limit · DCA · Liquidity · Farms; the other views are reached from inside them. Token selections are written back to the URL, so every view can be refreshed or shared as-is.

The browser's back/forward buttons work out of the box.

### Deep-linking

Navigate directly to any view by setting the hash in the URL, with any params as a regular query string before it:

```
/your-page?tokenA=EGLD&tokenB=WEGLD-bd4d79#add-liquidity
/your-page?filter=VOXEGLD#liquidity
/your-page?pool=erd1qqq…#farms
```

On Add Liquidity, add `mode=single` to land directly on the single-token deposit tab (falls back to the two-token tab if the pool doesn't exist yet or has no liquidity):

```
/your-page?tokenA=EGLD&tokenB=WEGLD-bd4d79&mode=single#add-liquidity
```

### Programmatic navigation

Use the exported `useSwapView` hook to read the current view or navigate from outside the widget:

```tsx
import { useSwapView } from "@dinovox/mx-swap-widget";

const { view, goTo } = useSwapView();

goTo("add-liquidity", { tokenA: "EGLD", tokenB: "WEGLD-bd4d79" });
```

---

## SwapWidget props

Beyond `SwapConfigProvider`, `SwapWidget` accepts a set of props that override the config for token pre-selection and filtering.

### Default tokens

Pre-select tokens in the Swap view. These are used as fallback when no `from` / `to` URL param is present.

```tsx
<SwapWidget defaultFrom="EGLD" defaultTo="USDC-c76f1f" />
```

URL params always take precedence over these defaults:

```
/your-page?from=WEGLD-bd4d79   ← this wins over defaultFrom
```

### Token whitelist / blacklist

Control which tokens appear in the Swap and DCA selectors.

```tsx
<SwapWidget whitelist={["EGLD", "WEGLD-bd4d79", "USDC-c76f1f"]} />
```

```tsx
<SwapWidget blacklist={["SPAM-123456", "SCAM-abcdef"]} />
```

Both can be combined. Whitelist is applied first, blacklist is applied after.

| Prop          | Type       | Behaviour when omitted |
| ------------- | ---------- | ---------------------- |
| `defaultFrom` | `string`   | No token pre-selected  |
| `defaultTo`   | `string`   | No token pre-selected  |
| `whitelist`   | `string[]` | All tokens shown       |
| `blacklist`   | `string[]` | No token hidden        |

---

## Token pre-selection via URL

Pass `from` and `to` query params to pre-select tokens in the Swap (and Limit) view:

```
/your-page?from=EGLD&to=WEGLD-bd4d79
```

These params are also written to the URL when the user picks a token, enabling shareable links.

> On mainnet, the pickers that create pools, fund farms or place limit orders only offer **branded** tokens (with an official logo), as an anti-scam measure.

---

## Referral: earn a share of the aggregator fees

Integrators can get their **wallet whitelisted as a referrer**: every swap made through the widget on their dApp then sends a share of the aggregator fee directly to that wallet, on-chain, in the same transaction.

How it works:

- **Identified by your domain** — the DinoVox API recognises the dApp from the request's `Origin` (or `Referer`) and embeds the matching `referrer_id` in the swap transaction it builds. Nothing to configure in the widget: install it on your domain and the share is applied automatically.
- **Paid by the aggregator contract** — `multiPairSwap(referrer_id, …)` splits the aggregator fee between your wallet (your agreed share, in basis points) and the DinoVox treasury, and transfers your part immediately. The fee paid by the user doesn't change.
- **Scope** — only swaps routed through the aggregator (multi-DEX / external routes) carry an aggregator fee; a route going 100% through DinoVox pools uses the router directly and has no aggregator fee to share. DCA, liquidity and farms aren't concerned.

To join: contact [DinoVox](https://dinovox.com) with your domain(s) and the wallet that should receive the fees. Once registered (domain mapping on the API + `setReferrer(id, wallet, bps)` on the aggregator contract), every `GET /quote` from your domain returns a `referrer` block (`id`, `feesWallet`, `bps`) you can use to check it's active.

---

## Limit orders

Limit orders live **inside each DinoVox pair contract** (passive order book, no keeper): a maker escrows `tokenIn` on the pair of `(tokenIn, tokenOut)` with a minimum amount out, and the order is filled by regular swaps on that pair whenever it beats the AMM price.

What the Limit view does:

- **Place an order** — sell amount + unit limit price (`1 tokenIn = ? tokenOut`), with the AMM market price as a one-click reference, the deviation vs market and a warning when selling below it. Sent as `createOrder(tokenOut, minAmountOut)` with the ESDT payment, on the pair contract.
- **Anti-spam minimum** — an order must be at least a share of the pair's AMM reserve (or, on a pair without AMM liquidity, of the orders already waiting on that side). The rate is set per pair by its owner; the widget reads the exact minimum from the pair (`getMinOrderAmount`) and blocks smaller orders.
- **No pair yet?** — the view deploys it without any liquidity deposit: 1. `createPair` (~0.05 EGLD deployment fee), 2. activation by issuing its LP token (0.05 EGLD) — an inactive pair can't fill orders. 3. Optional: add AMM liquidity to smooth out trading (without it, one swap can only consume a limited number of orders; the Swap view then suggests the largest amount that fits).
- **Order-book depth** — price ladder aggregated by the contract's price buckets (×2 per bucket), with the AMM price and a preview of the bucket the order being typed will land in.
- **My orders** — active orders with their filled percentage and a **Cancel** button (`cancelOrder`, refunds the remaining escrow — allowed even while a pair is paused), plus history.

---

## Standalone components

Individual views are also exported if you manage rendering yourself:

```tsx
import {
  Swap,
  LimitOrders,
  Dca,
  Liquidity,
  AddLiquidity,
  RemoveLiquidity,
  CreatePool,
  Pools,
  Farms,
} from "@dinovox/mx-swap-widget";
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

| Export                                                                                                        | Description                                         |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `SwapWidget`                                                                                                  | All-in-one widget with internal routing             |
| `Swap`, `LimitOrders`, `Dca`, `Liquidity` / `Pools`, `AddLiquidity`, `RemoveLiquidity`, `CreatePool`, `Farms` | Standalone views                                    |
| `SwapConfigProvider`                                                                                          | Configuration context provider                      |
| `useSwapConfig`                                                                                               | Hook to read the resolved config                    |
| `useSwapView`                                                                                                 | Hook to read the current view and navigate (`goTo`) |
| `FormatAmount`                                                                                                | Token amount formatter component                    |
| `signAndSendTransactions`                                                                                     | Helper to sign & send MultiversX transactions       |
| `bigToHex`                                                                                                    | BigInt → hex string helper                          |
| `useGetUserESDT`                                                                                              | Hook to fetch user ESDT token balances              |
| `Card`                                                                                                        | Card UI primitive                                   |
| `TokenSelect`                                                                                                 | Token selector dropdown UI primitive                |

---

## License

MIT — [DinoVox](https://dinovox.com)
