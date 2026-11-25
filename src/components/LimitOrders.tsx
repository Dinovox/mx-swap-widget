import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useGoTo } from "../context/SwapViewContext";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import { ArrowUpDown } from "lucide-react";
import { getThemePalette } from "../ui/themePalette";
import { useSwapConfig } from "../context/SwapConfigContext";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { estimateGasLimit } from "../helpers/estimateGas";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import { brandedTokensVoxEgldFirst } from "../helpers/brandedTokens";
import { Card } from "../ui/Card";
import { OrderBookDepth, PRICE_SCALE_DEC } from "../ui/OrderBookDepth";
import { PriceChart, type BookLevel } from "../ui/PriceChart";
import { chartEntryForPool, fetchChartable, type ChartableEntry } from "../helpers/charts";
import { orderForQuoteDisplay } from "../helpers/quotePriority";
import { SectionTabs } from "../ui/NavTabs";
import { TokenSelect, TokenLogo, type TokenBalanceInfo } from "../ui/TokenSelect";
import type { DexToken } from "../types";

/*
 * Limit orders — passive order book living in each DinoVox pair SC
 * (swapv2/pair/src/orderbook.rs). A maker escrows token_in on THE pair of
 * (token_in, token_out) via createOrder(token_out, min_amount_out); the order
 * is consumed by swap() whenever it beats the AMM spot. cancelOrder(order_id)
 * refunds the remaining escrow (allowed even while the pair is paused).
 * No pair for these two tokens → the user deploys it in two steps:
 * factory.createPair, then factory.issueLpToken (0.05 EGLD) — the latter is
 * what activates the pair (is_active), and swap(), which fills the orders,
 * refuses an inactive pair. No liquidity deposit is needed.
 */

const MIN_ORDER_RATIO_SCALE = 100_000; // orderbook.rs
const DEFAULT_MIN_ORDER_RATIO = 100; // init()/upgrade() default: 1/1 000 of the reserve
const CREATE_ORDER_GAS_FALLBACK = 30_000_000; // first order of a price bucket activates it
const CANCEL_ORDER_GAS_FALLBACK = 15_000_000;
const CREATE_PAIR_GAS = 30_000_000; // same as CreatePool step 1
const ISSUE_LP_GAS = 150_000_000; // same as CreatePool step 2 (async issue + callback)
const ISSUE_LP_COST = 50_000_000_000_000_000n; // 0.05 EGLD, forwarded by the factory to the ESDT system SC
const BELOW_MARKET_TOLERANCE = 0.995; // warn when selling > 0.5% under the AMM spot
const DEFAULT_MAX_PRICE_DEVIATION_FACTOR = 20; // init()/upgrade() default (orderbook.rs V8)
const DEFAULT_MAX_PRICE_DISCOUNT_BPS = 5_000; // init()/upgrade() default (orderbook.rs V6): at most 50% under spot

interface PairInfo {
  address: string;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  isActive: boolean;
}

interface BookOrder {
  pairAddr: string;
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  tokenInTicker: string;
  tokenOutTicker: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  tokenInLogoUrl: string | null;
  tokenOutLogoUrl: string | null;
  price: string;
  amountInInitial: string;
  amountInRemaining: string;
  status: "active" | "filled" | "cancelled";
  createdAt: string;
}

/** GET /orderbook/orders/summary — payload léger pour construire un sélecteur
 * "par paire" sans télécharger le détail de chaque ordre (cf. conversation
 * 2026-10-31 : un wallet actif peut accumuler des milliers d'ordres toutes
 * paires confondues). */
interface PairOrderSummary {
  pairAddr: string;
  tokenA: string | null;
  tokenB: string | null;
  activeCount: number;
  pastCount: number;
}

/** GET /orderbook/orders/buckets — ordres actifs d'un utilisateur agrégés par palier (marquage du carnet). */
interface MineBucket {
  tokenIn: string;
  bucketId: number;
  orderCount: number;
  totalAmountRemaining: string;
}

/**
 * Ordres de l'utilisateur dans UN palier du carnet, chargés à l'ouverture de
 * la ligne (GET /orderbook/orders?bucketId=...) — évite de télécharger tous
 * les ordres d'une paire (milliers possibles) juste pour marquer le carnet.
 */
function DepthBucketOrders({
  apiUrl,
  address,
  pairAddr,
  tokenIn,
  bucketId,
  refreshKey,
  renderRow,
}: {
  apiUrl: string;
  address: string;
  pairAddr: string;
  tokenIn: string;
  bucketId: number;
  refreshKey: number;
  renderRow: (o: BookOrder) => React.ReactNode;
}) {
  const { t } = useTranslation("swap");
  const [res, setRes] = React.useState<{ orders: BookOrder[]; total: number } | undefined>(undefined);
  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<{ orders: BookOrder[]; total: number }>(`${apiUrl}/orderbook/orders`, {
        params: { address, pairAddr, tokenIn, bucketId, status: "active", limit: 200 },
      })
      .then((r) => !cancelled && setRes({ orders: r.data.orders ?? [], total: r.data.total ?? 0 }))
      .catch(() => !cancelled && setRes({ orders: [], total: 0 }));
    return () => {
      cancelled = true;
    };
  }, [apiUrl, address, pairAddr, tokenIn, bucketId, refreshKey]);

  const note = "dvx:px-2 dvx:py-1 dvx:text-gray-400";
  if (!res) return <div className={note} style={{ fontSize: 11 }}>{t("depth_loading")}</div>;
  if (res.orders.length === 0) return <div className={note} style={{ fontSize: 11 }}>{t("limit_no_active")}</div>;
  return (
    <>
      {[...res.orders].sort((a, b) => new BigNumber(a.price).comparedTo(b.price) ?? 0).map(renderRow)}
      {res.total > res.orders.length && (
        <div className={note} style={{ fontSize: 10 }}>
          {t("limit_orders_capped", { shown: res.orders.length, total: res.total })}
        </div>
      )}
    </>
  );
}

/** LP name/ticker the factory requires at createPair (same derivation as CreatePool). */
function lpNamesFor(tickerX: string, tickerY: string): { name: string; ticker: string } {
  const clean = (s: string) => s.split("-")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
  const split = (a: string, b: string, budget: number): [string, string] =>
    a.length + b.length <= budget ? [a, b] : [a.slice(0, budget - Math.floor(budget / 2)), b.slice(0, Math.floor(budget / 2))];
  const [nX, nY] = split(clean(tickerX), clean(tickerY), 18);
  const [tX, tY] = split(clean(tickerX), clean(tickerY), 10);
  return { name: nX + nY + "LP", ticker: tX + tY };
}

/**
 * getMinOrderRatio of a pair (API /query). Doubles as the order-book support
 * probe: a pair not yet upgraded to the order-book template answers
 * "function not found" → supported = false. Network errors keep the default
 * ratio and assume support (the tx simulation will catch a real problem).
 */
async function fetchOrderBookInfo(
  networkApiAddress: string,
  pair: string,
): Promise<{ supported: boolean; ratio: number; maxDeviationFactor: number | null; maxDiscountBps: number | null }> {
  const ratioP = (async () => {
    try {
      const { data } = await axios.post(`${networkApiAddress}/query`, { scAddress: pair, funcName: "getMinOrderRatio", args: [] });
      const b64: string | undefined = data?.returnData?.[0];
      if (b64 == null || b64 === "") return { supported: true, ratio: 0 };
      const hex = Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      return { supported: true, ratio: hex ? parseInt(hex, 16) : 0 };
    } catch (err: any) {
      const msg = String(err?.response?.data?.code ?? err?.response?.data?.message ?? "");
      if (msg.includes("function not found")) return { supported: false, ratio: DEFAULT_MIN_ORDER_RATIO };
      return { supported: true, ratio: DEFAULT_MIN_ORDER_RATIO };
    }
  })();
  // getMaxPriceDeviationFactor (orderbook.rs V8) — may not exist on a pair
  // upgraded to an earlier orderbook version: null (not 20) in that case,
  // so the client never blocks a submission the chain wouldn't actually
  // reject. Fetched alongside getMinOrderRatio (independent queries, not
  // gated on one another) so a pair stuck on an older version still gets
  // its min-order-ratio info.
  const factorP = (async () => {
    try {
      const { data } = await axios.post(`${networkApiAddress}/query`, { scAddress: pair, funcName: "getMaxPriceDeviationFactor", args: [] });
      const b64: string | undefined = data?.returnData?.[0];
      if (b64 == null || b64 === "") return null;
      const hex = Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      return hex ? parseInt(hex, 16) : null;
    } catch (err: any) {
      const msg = String(err?.response?.data?.code ?? err?.response?.data?.message ?? "");
      if (msg.includes("function not found")) return null;
      return DEFAULT_MAX_PRICE_DEVIATION_FACTOR;
    }
  })();
  // getMaxPriceDiscountBps (orderbook.rs V6) — same null-if-absent rule as the
  // factor. An empty answer is a real 0 (no order under the spot allowed).
  const discountP = (async () => {
    try {
      const { data } = await axios.post(`${networkApiAddress}/query`, { scAddress: pair, funcName: "getMaxPriceDiscountBps", args: [] });
      const b64: string | undefined = data?.returnData?.[0];
      if (b64 == null) return null;
      const hex = Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      return hex ? parseInt(hex, 16) : 0;
    } catch (err: any) {
      const msg = String(err?.response?.data?.code ?? err?.response?.data?.message ?? "");
      if (msg.includes("function not found")) return null;
      return DEFAULT_MAX_PRICE_DISCOUNT_BPS;
    }
  })();
  const [{ supported, ratio }, maxDeviationFactor, maxDiscountBps] = await Promise.all([ratioP, factorP, discountP]);
  return { supported, ratio, maxDeviationFactor, maxDiscountBps };
}

const b64ToBig = (b64: string | undefined): BigNumber => {
  if (!b64) return new BigNumber(0);
  const hex = Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  return hex ? new BigNumber(hex, 16) : new BigNumber(0);
};

interface MinOrderInfo {
  /** Smallest amount_in createOrder accepts right now (raw). */
  min: BigNumber;
  /** Anti-spam ratio, in 1/MIN_ORDER_RATIO_SCALE. */
  ratio: number;
  /** true: % of the pool's AMM reserve; false: % of what's already escrowed in this side of the book. */
  basisIsReserve: boolean;
}

/**
 * Anti-spam floor of createOrder for an order escrowing `tokenIn`:
 * min = basis × ratio / 100 000, basis = AMM reserve of tokenIn, or — pair
 * without AMM liquidity — the amount already escrowed in that side of the
 * book. Exact value from the pair's getMinOrderAmount view; pairs deployed
 * before that view: rebuilt from getMinOrderRatio + the pair's token balance
 * (escrow = balance − reserve).
 */
async function fetchMinOrder(
  networkApiAddress: string,
  pair: string,
  tokenIn: string,
  reserveIn: BigNumber,
  ratioFallback: number,
): Promise<MinOrderInfo | null> {
  try {
    const { data } = await axios.post(`${networkApiAddress}/query`, {
      scAddress: pair,
      funcName: "getMinOrderAmount",
      args: [Array.from(new TextEncoder().encode(tokenIn), (b) => b.toString(16).padStart(2, "0")).join("")],
    });
    const rd: string[] = data?.returnData ?? [];
    return { min: b64ToBig(rd[0]), ratio: b64ToBig(rd[2]).toNumber(), basisIsReserve: b64ToBig(rd[3]).eq(1) };
  } catch {
    /* view not deployed on this pair yet → rebuild it */
  }
  try {
    let basis = reserveIn;
    const basisIsReserve = reserveIn.gt(0);
    if (!basisIsReserve) {
      const { data } = await axios.get(`${networkApiAddress}/accounts/${pair}/tokens/${tokenIn}`);
      basis = BigNumber.max(0, new BigNumber(data?.balance ?? "0").minus(reserveIn));
    }
    return {
      min: basis.times(ratioFallback).idiv(MIN_ORDER_RATIO_SCALE),
      ratio: ratioFallback,
      basisIsReserve,
    };
  } catch (err: any) {
    // 404 = the pair holds none of tokenIn: empty book side, no floor yet.
    if (err?.response?.status === 404) return { min: new BigNumber(0), ratio: ratioFallback, basisIsReserve: false };
    return null;
  }
}

export const LimitOrders = () => {
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const goTo = useGoTo();
  const { apiUrl, address, networkApiAddress, chainId, factoryAddress, onSignTransactions, onConnect, theme } = useSwapConfig();
  const palette = getThemePalette(theme);

  /* ---- Tokens ----
     Mainnet only: unbranded tokens (no logo) aren't offered — same anti-scam
     rule as pool creation. Devnet/testnet test tokens are rarely branded, so
     the filter is off there. */
  const brandedOnly = chainId === "1";
  const [apiTokens, setApiTokens] = React.useState<(DexToken & { priceUsd?: string | null })[]>([]);
  const [tokensLoading, setTokensLoading] = React.useState(true);
  React.useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);
    axios
      .get(`${apiUrl}/tokens`)
      .then((res) => {
        const list = (res.data?.tokens ?? []).map((tk: any) => ({
          identifier: tk.identifier,
          ticker: tk.ticker ?? tk.identifier.split("-")[0],
          decimals: tk.decimals ?? 18,
          logoUrl: tk.logoUrl ?? null,
          priceUsd: tk.priceUsd ?? null,
        }));
        setApiTokens(brandedOnly ? brandedTokensVoxEgldFirst(list) : list);
      })
      .catch(() => setApiTokens([]))
      .finally(() => setTokensLoading(false));
  }, [apiUrl, brandedOnly]);

  const [refreshKey, setRefreshKey] = React.useState(0);
  const walletRaw = useGetUserESDT(undefined, { enabled: !!address, address, networkApiAddress, refreshKey }) as Array<{
    identifier?: string;
    ticker?: string;
    decimals?: number;
    balance?: string;
    assets?: { svgUrl?: string; pngUrl?: string };
  }>;
  // Mainnet: branded wallet tokens only (same rule as pool creation: no logo = no vetted identity).
  const walletTokens: DexToken[] = React.useMemo(
    () =>
      (walletRaw ?? [])
        .filter((w) => w.identifier && new BigNumber(w.balance ?? "0").gt(0) && (!brandedOnly || w.assets?.svgUrl || w.assets?.pngUrl))
        .map((w) => ({
          identifier: w.identifier!,
          ticker: w.ticker ?? w.identifier!.split("-")[0],
          decimals: w.decimals ?? 18,
          logoUrl: w.assets?.svgUrl ?? w.assets?.pngUrl ?? null,
        })),
    [walletRaw, brandedOnly],
  );
  const balanceOf = (id: string) => (walletRaw ?? []).find((w) => w.identifier === id)?.balance ?? "0";
  const priceOf = (id: string) => {
    const p = apiTokens.find((x) => x.identifier === id)?.priceUsd;
    return p ? parseFloat(p) : null;
  };
  const balances: Record<string, TokenBalanceInfo> = {};
  for (const tk of walletTokens) {
    const amount = new BigNumber(balanceOf(tk.identifier)).shiftedBy(-tk.decimals).toNumber();
    const price = priceOf(tk.identifier);
    balances[tk.identifier] = { amount, usd: price != null ? amount * price : null };
  }
  const tokensIn = [...walletTokens].sort((a, b) => (balances[b.identifier]?.usd ?? 0) - (balances[a.identifier]?.usd ?? 0));
  const tokensOut = React.useMemo(() => {
    const seen = new Set<string>();
    return [...apiTokens, ...walletTokens].filter((tk) => (seen.has(tk.identifier) ? false : (seen.add(tk.identifier), true)));
  }, [apiTokens, walletTokens]);

  const [tokenIn, setTokenIn] = React.useState<DexToken | null>(null);
  const [tokenOut, setTokenOut] = React.useState<DexToken | null>(null);
  const [amount, setAmount] = React.useState("");
  // The limit is typed EITHER as a unit price or as the total received
  // ("Contre" input) — whichever was edited last is the anchor, the other
  // one is derived from it (cf. priceBN / minOutRaw below).
  const [price, setPriceInput] = React.useState(""); // 1 tokenIn = price tokenOut
  const [receive, setReceive] = React.useState(""); // total tokenOut for the whole amount
  const [priceAnchor, setPriceAnchor] = React.useState<"price" | "receive">("price");
  const setPrice = (v: string) => {
    setPriceInput(v);
    setPriceAnchor("price");
  };
  const setReceiveInput = (v: string) => {
    setReceive(v);
    setPriceAnchor("receive");
  };

  /* ---- URL ?from=&to= (refresh / share), same params as Swap ---- */
  const [searchParams, setSearchParams] = useWidgetSearchParams();
  const urlInitDone = React.useRef(false);
  React.useEffect(() => {
    if (urlInitDone.current || tokensLoading) return;
    const fromId = searchParams.get("from");
    const toId = searchParams.get("to");
    const find = (id: string | null) => (id ? tokensOut.find((tk) => tk.identifier === id) ?? null : null);
    const foundIn = find(fromId);
    const foundOut = find(toId);
    // A held token may only show up once the wallet has loaded — wait for it.
    const walletPending = !!address && (walletRaw ?? []).length === 0;
    if ((fromId && !foundIn) || (toId && !foundOut)) {
      if (walletPending) return;
    }
    if (foundIn) setTokenIn(foundIn);
    if (foundOut) setTokenOut(foundOut);
    // Prefilled order, e.g. the review-and-sign link of the DEX MCP server
    // (?from=MEX-455c57&to=WEGLD-bd4d79&amount=1000&price=0.0005#limit):
    // amount of `from`, price in `to` per 1 `from`, human units.
    const isAmount = (v: string | null): v is string => !!v && /^\d+(\.\d+)?$/.test(v);
    const qAmount = searchParams.get("amount");
    const qPrice = searchParams.get("price");
    if (foundIn && isAmount(qAmount)) setAmount(qAmount);
    if (foundIn && foundOut && isAmount(qPrice)) setPrice(qPrice);
    urlInitDone.current = true;
  }, [tokensLoading, tokensOut, walletRaw, address]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    // A manual pick ends the URL init (e.g. wallet with no tokens: never "loaded").
    if (!urlInitDone.current) {
      if (!tokenIn && !tokenOut) return;
      urlInitDone.current = true;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tokenIn) next.set("from", tokenIn.identifier);
        else next.delete("from");
        if (tokenOut) next.set("to", tokenOut.identifier);
        else next.delete("to");
        // Read once at init: a copied URL must not carry a stale order.
        next.delete("amount");
        next.delete("price");
        return next;
      },
      { replace: true },
    );
  }, [tokenIn, tokenOut]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Pair of (tokenIn, tokenOut) ---- */
  const [pair, setPair] = React.useState<PairInfo | null | undefined>(undefined); // undefined = loading
  // false | "exists" (after createPair) | "active" (after issueLpToken)
  const [pairPolling, setPairPolling] = React.useState<false | "exists" | "active">(false);
  const loadPair = React.useCallback(async () => {
    if (!apiUrl || !tokenIn || !tokenOut) return setPair(undefined);
    try {
      const { data } = await axios.get(`${apiUrl}/pools/pair`, { params: { tokenA: tokenIn.identifier, tokenB: tokenOut.identifier } });
      setPair(data?.address ? data : null);
      // Stop polling once the pair exists — or, after the LP step, once it's active.
      if (data?.address && (pairPolling !== "active" || data.isActive)) setPairPolling(false);
    } catch {
      setPair(null);
    }
  }, [apiUrl, tokenIn, tokenOut, pairPolling]);
  React.useEffect(() => {
    setPair(undefined);
  }, [tokenIn, tokenOut]);
  React.useEffect(() => {
    loadPair();
  }, [loadPair]);
  // Manual base/quote flip for the depth chart below, toggled together with
  // the form's direction (invertTokens) — reset only when switching to ANOTHER
  // pair: inverting the tokens reloads the same pair (address → undefined →
  // same address), which must keep the flip (cf. orderForQuoteDisplay,
  // src/helpers/quotePriority.ts).
  const [depthInverted, setDepthInverted] = React.useState(false);
  const lastPairAddr = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!pair?.address || pair.address === lastPairAddr.current) return;
    if (lastPairAddr.current !== null) setDepthInverted(false);
    lastPairAddr.current = pair.address;
  }, [pair?.address]);
  React.useEffect(() => {
    if (!pairPolling) return;
    const i = setInterval(loadPair, 3000);
    return () => clearInterval(i);
  }, [pairPolling, loadPair]);

  // Price chart above the book: pools with indexed history (one fetch) + the
  // book's levels (1 base = price quote) to overlay on it.
  const [chartable, setChartable] = React.useState<ChartableEntry[]>([]);
  React.useEffect(() => {
    if (!apiUrl) return;
    fetchChartable(apiUrl)
      .then(setChartable)
      .catch(() => setChartable([]));
  }, [apiUrl]);
  const [depthLevels, setDepthLevels] = React.useState<{ pool: string; base: string; levels: BookLevel[] } | null>(null);

  const [minRatio, setMinRatio] = React.useState(DEFAULT_MIN_ORDER_RATIO);
  const [bookSupported, setBookSupported] = React.useState(true);
  // null = unknown (older pair without the V8 guard, or not fetched yet) —
  // the deviation check below stays silent/non-blocking in that case.
  const [maxDeviationFactor, setMaxDeviationFactor] = React.useState<number | null>(null);
  const [maxDiscountBps, setMaxDiscountBps] = React.useState<number | null>(null);
  React.useEffect(() => {
    setBookSupported(true);
    setMaxDeviationFactor(null);
    setMaxDiscountBps(null);
    if (!pair?.address || !networkApiAddress) return;
    fetchOrderBookInfo(networkApiAddress, pair.address).then(({ supported, ratio, maxDeviationFactor, maxDiscountBps }) => {
      setBookSupported(supported);
      setMinRatio(ratio);
      setMaxDeviationFactor(maxDeviationFactor);
      setMaxDiscountBps(maxDiscountBps);
    });
  }, [pair?.address, networkApiAddress]);

  /* ---- Derived amounts ---- */
  const decIn = tokenIn?.decimals ?? 18;
  const decOut = tokenOut?.decimals ?? 18;
  const inIsA = !!pair && !!tokenIn && pair.tokenA === tokenIn.identifier;
  const reserveIn = pair ? new BigNumber(inIsA ? pair.reserveA : pair.reserveB) : new BigNumber(0);
  const reserveOut = pair ? new BigNumber(inIsA ? pair.reserveB : pair.reserveA) : new BigNumber(0);
  // AMM spot: 1 tokenIn = spot tokenOut (null without AMM liquidity).
  const spot = reserveIn.gt(0) && reserveOut.gt(0) ? reserveOut.shiftedBy(-decOut).div(reserveIn.shiftedBy(-decIn)) : null;

  const amountRaw = (() => {
    const v = new BigNumber(amount);
    return v.isFinite() && v.gt(0) ? v.shiftedBy(decIn).integerValue(BigNumber.ROUND_DOWN) : null;
  })();
  const receiveRaw = (() => {
    const v = new BigNumber(receive);
    return v.isFinite() && v.gt(0) ? v.shiftedBy(decOut).integerValue(BigNumber.ROUND_DOWN) : null;
  })();
  const priceBN = (() => {
    if (priceAnchor === "receive") {
      return amountRaw && receiveRaw ? receiveRaw.shiftedBy(-decOut).div(amountRaw.shiftedBy(-decIn)) : null;
    }
    const v = new BigNumber(price);
    return v.isFinite() && v.gt(0) ? v : null;
  })();
  // min_amount_out: what the maker wants for the WHOLE amount, floored to raw units
  // (taken as typed when the total is the anchor).
  const minOutRaw =
    priceAnchor === "receive"
      ? amountRaw && receiveRaw
      : amountRaw && priceBN ? amountRaw.shiftedBy(-decIn).times(priceBN).shiftedBy(decOut).integerValue(BigNumber.ROUND_DOWN) : null;
  // Exact (unrounded) total the user asked for, in raw tokenOut units — differs
  // from minOutRaw when tokenOut's decimals can't hold it (e.g. 1 × 1.99 of a
  // 0-decimal token → 1): the order then really executes at minOut / amount.
  const idealOutRaw = !amountRaw
    ? null
    : priceAnchor === "price"
      ? priceBN && amountRaw.shiftedBy(-decIn).times(priceBN).shiftedBy(decOut)
      : (() => {
          const v = new BigNumber(receive);
          return v.isFinite() && v.gt(0) ? v.shiftedBy(decOut) : null;
        })();
  const outRounded = !!minOutRaw && !!idealOutRaw && !idealOutRaw.eq(minOutRaw);
  const effectivePrice = outRounded && amountRaw && minOutRaw ? minOutRaw.shiftedBy(-decOut).div(amountRaw.shiftedBy(-decIn)) : null;
  // What each input shows: the typed value for the anchor, the derived one otherwise.
  const priceInputValue = priceAnchor === "price" ? price : priceBN ? priceBN.precision(12, BigNumber.ROUND_DOWN).toFixed() : "";
  const receiveInputValue = priceAnchor === "receive" ? receive : minOutRaw && minOutRaw.gt(0) ? minOutRaw.shiftedBy(-decOut).toFixed() : "";
  // Changing the sold amount keeps the unit price (the total follows).
  const changeAmount = (v: string) => {
    if (priceAnchor === "receive" && priceBN) setPrice(priceInputValue);
    setAmount(v);
  };
  // Anti-spam floor (per pair, owner-adjustable ratio) — refreshed with the pair and after each tx.
  const [minOrder, setMinOrder] = React.useState<MinOrderInfo | null>(null);
  React.useEffect(() => {
    setMinOrder(null);
    if (!pair?.address || !pair.isActive || !bookSupported || !tokenIn || !networkApiAddress) return;
    let cancelled = false;
    fetchMinOrder(networkApiAddress, pair.address, tokenIn.identifier, reserveIn, minRatio).then((m) => {
      if (!cancelled) setMinOrder(m);
    });
    return () => {
      cancelled = true;
    };
  }, [pair?.address, pair?.isActive, pair?.reserveA, pair?.reserveB, bookSupported, tokenIn?.identifier, networkApiAddress, minRatio, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const minOrderRaw = minOrder && minOrder.min.gt(0) ? minOrder.min : null;
  const ratioPctLabel = (ratio: number) => {
    const pct = (ratio / MIN_ORDER_RATIO_SCALE) * 100;
    return pct >= 0.1 ? pct.toFixed(pct >= 1 ? 1 : 2).replace(/\.?0+$/, "") : pct.toPrecision(2);
  };
  const deviationPct = spot && priceBN ? priceBN.div(spot).minus(1).times(100).toNumber() : null;
  const belowMarket = spot && priceBN ? priceBN.lt(spot.times(BELOW_MARKET_TOLERANCE)) : false;
  // Mirrors orderbook.rs::order_spot_price's createOrder guard (V8) — the
  // chain rejects a price outside [spot/factor, spot*factor] outright, so
  // blocking it client-side avoids a doomed transaction. Silent (false)
  // when maxDeviationFactor is unknown (older pair, fetch not done yet) —
  // never block on a limit this client hasn't actually confirmed exists.
  // Lower bound (V6): no more than maxDiscountBps under the spot — stricter
  // than spot/factor by default (50% vs 95%), so the factor effectively only
  // caps the price from above. Both floors are checked; the message shows the
  // stricter one.
  const priceTooHigh = spot && priceBN && maxDeviationFactor != null ? priceBN.gt(spot.times(maxDeviationFactor)) : false;
  const priceTooLow =
    !!spot &&
    !!priceBN &&
    ((maxDiscountBps != null && priceBN.times(10_000).lt(spot.times(10_000 - maxDiscountBps))) ||
      (maxDeviationFactor != null && priceBN.times(maxDeviationFactor).lt(spot)));
  const maxDiscountPct = Math.min(
    maxDiscountBps != null ? maxDiscountBps / 100 : 100,
    maxDeviationFactor ? (1 - 1 / maxDeviationFactor) * 100 : 100,
  );
  const priceTooFarFromMarket = priceTooLow || priceTooHigh;

  const insufficient = !!amountRaw && amountRaw.gt(tokenIn ? balanceOf(tokenIn.identifier) : "0");
  const belowMin = !!amountRaw && !!minOrderRaw && amountRaw.lt(minOrderRaw);

  const fmt = (raw: BigNumber.Value, dec: number, dp = 6) => {
    const v = new BigNumber(raw).shiftedBy(-dec);
    return v.gte(1) ? v.decimalPlaces(dp, BigNumber.ROUND_DOWN).toFormat() : v.precision(6, BigNumber.ROUND_DOWN).toFormat();
  };
  const fmtPrice = (v: BigNumber) => (v.gte(1) ? v.decimalPlaces(6, BigNumber.ROUND_DOWN).toFormat() : v.precision(6, BigNumber.ROUND_DOWN).toFixed());

  /* ---- Invert direction (as on Swap) ----
     Sell what I was buying: the new amount is what I was asking for, and
     the limit price is inverted (1 A = p B  ⇔  1 B = 1/p A). */
  const invertTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setDepthInverted((v) => !v);
    if (priceBN && minOutRaw && minOutRaw.gt(0)) {
      setAmount(minOutRaw.shiftedBy(-decOut).toFixed());
      // Same anchor as before: a typed total becomes the new total (exact, no rounding).
      if (priceAnchor === "receive") setReceiveInput(amount);
      else setPrice(new BigNumber(1).div(priceBN).precision(12, BigNumber.ROUND_DOWN).toFixed());
    } else {
      setAmount("");
      setPrice(priceBN ? new BigNumber(1).div(priceBN).precision(12, BigNumber.ROUND_DOWN).toFixed() : "");
    }
  };

  /* ---- Transactions ---- */
  const [busy, setBusy] = React.useState<string | null>(null);
  const [txError, setTxError] = React.useState<string | null>(null);
  const sendTx = async (
    key: string,
    receiver: string,
    data: string,
    fallbackGas: number,
    labels: { processing: string; success: string; error: string },
    opts: { value?: bigint; simulate?: boolean } = {},
  ) => {
    if (!address || !chainId) return false;
    setBusy(key);
    setTxError(null);
    try {
      const gas = opts.simulate === false ? fallbackGas : await estimateGasLimit(networkApiAddress, { sender: address, receiver, data, chainId }, fallbackGas);
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [
          new Transaction({
            value: opts.value ?? 0n,
            data: new TextEncoder().encode(data),
            receiver: new Address(receiver),
            sender: new Address(address),
            gasLimit: BigInt(gas),
            gasPrice: BigInt(GAS_PRICE),
            chainID: chainId,
            version: 1,
          }),
        ],
        transactionsDisplayInfo: { processingMessage: labels.processing, successMessage: labels.success, errorMessage: labels.error },
      });
      return true;
    } catch (err) {
      console.error(err);
      setTxError(t("limit_tx_error"));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const createPair = async () => {
    if (!tokenIn || !tokenOut || !factoryAddress) return;
    const { name, ticker } = lpNamesFor(tokenIn.ticker, tokenOut.ticker);
    const ok = await sendTx(
      "pair",
      factoryAddress,
      ["createPair", strToHex(tokenIn.identifier), strToHex(tokenOut.identifier), strToHex(name), strToHex(ticker)].join("@"),
      CREATE_PAIR_GAS,
      { processing: t("create_processing_pair"), success: t("create_success_pair"), error: t("create_error_pair") },
      { simulate: false }, // factory deploy from a template: keep the proven fixed limit
    );
    if (ok) setPairPolling("exists");
  };

  // Step 2 — issue the pair's LP token: activates the pair (swap() and so
  // order fills require it). Same factory call as CreatePool step 2.
  const issueLp = async () => {
    if (!tokenIn || !tokenOut || !factoryAddress) return;
    const ok = await sendTx(
      "lp",
      factoryAddress,
      ["issueLpToken", strToHex(tokenIn.identifier), strToHex(tokenOut.identifier)].join("@"),
      ISSUE_LP_GAS,
      { processing: t("create_processing_lp"), success: t("create_success_lp"), error: t("create_error_lp") },
      { value: ISSUE_LP_COST, simulate: false },
    );
    if (ok) setPairPolling("active");
  };

  const scheduleRefresh = () => {
    for (const ms of [6_000, 15_000, 30_000]) setTimeout(() => {
      setRefreshKey((k) => k + 1);
      loadMineBuckets();
      loadOrders();
    }, ms);
  };

  const createOrder = async () => {
    if (!pair || !tokenIn || !tokenOut || !amountRaw || !minOutRaw || minOutRaw.lte(0)) return;
    const ok = await sendTx(
      "create",
      pair.address,
      [
        "ESDTTransfer",
        strToHex(tokenIn.identifier),
        bigToHex(BigInt(amountRaw.toFixed(0))),
        strToHex("createOrder"),
        strToHex(tokenOut.identifier),
        bigToHex(BigInt(minOutRaw.toFixed(0))),
      ].join("@"),
      CREATE_ORDER_GAS_FALLBACK,
      { processing: t("limit_processing_create"), success: t("limit_success_create"), error: t("limit_error_create") },
    );
    if (ok) {
      changeAmount("");
      scheduleRefresh();
    }
  };

  const cancelOrder = async (o: BookOrder) => {
    const ok = await sendTx(
      `cancel:${o.pairAddr}:${o.orderId}`,
      o.pairAddr,
      ["cancelOrder", bigToHex(BigInt(o.orderId))].join("@"),
      CANCEL_ORDER_GAS_FALLBACK,
      { processing: t("limit_processing_cancel"), success: t("limit_success_cancel"), error: t("limit_error_cancel") },
    );
    if (ok) scheduleRefresh();
  };

  /* ---- My orders ----
   * Scopé À UNE PAIRE (la paire de swap courante par défaut) plutôt que
   * toutes paires confondues — un wallet actif peut accumuler des milliers
   * d'ordres au total (constaté : 15k+ sur un wallet de test devnet), ce
   * qui rendait la liste précédente très lourde à charger et à afficher
   * (cf. conversation 2026-10-31). `pairSummaries` (payload léger, juste
   * des compteurs) permet de proposer les AUTRES paires où l'utilisateur a
   * des ordres sans jamais télécharger leur détail tant qu'elles ne sont
   * pas sélectionnées.
   */
  const [pairSummaries, setPairSummaries] = React.useState<PairOrderSummary[]>([]);
  const [ordersPairOverride, setOrdersPairOverride] = React.useState<string | null>(null);
  const ordersPairAddr = ordersPairOverride ?? pair?.address ?? null;

  // Les ordres actifs se consultent/annulent directement dans le carnet : on
  // ne charge que leurs agrégats par palier (`mineBuckets`), le détail d'un
  // palier se charge au clic sur sa ligne ● (cf. DepthBucketOrders). La liste
  // complète (`orders`) n'est plus qu'un repli quand la paire choisie n'a pas
  // pu être chargée dans le formulaire (token inconnu, cf. selectOrdersPair).
  const ordersInDepth = !!pair && ordersPairAddr === pair.address;
  const [mineBuckets, setMineBuckets] = React.useState<MineBucket[]>([]);
  const [mineTotal, setMineTotal] = React.useState(0);
  const [orders, setOrders] = React.useState<BookOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = React.useState(0);
  const [pastOrders, setPastOrders] = React.useState<BookOrder[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);

  const loadSummary = React.useCallback(() => {
    if (!apiUrl || !address) return setPairSummaries([]);
    axios
      .get<{ pairs: PairOrderSummary[] }>(`${apiUrl}/orderbook/orders/summary`, { params: { address } })
      .then((res) => setPairSummaries(res.data.pairs ?? []))
      .catch(() => setPairSummaries([]));
  }, [apiUrl, address]);
  const loadMineBuckets = React.useCallback(() => {
    if (!apiUrl || !address || !ordersPairAddr) {
      setMineBuckets([]);
      setMineTotal(0);
      return;
    }
    axios
      .get<{ buckets: MineBucket[]; total: number }>(`${apiUrl}/orderbook/orders/buckets`, {
        params: { address, pairAddr: ordersPairAddr },
      })
      .then((res) => {
        setMineBuckets(res.data.buckets ?? []);
        setMineTotal(res.data.total ?? 0);
      })
      .catch(() => {
        setMineBuckets([]);
        setMineTotal(0);
      });
  }, [apiUrl, address, ordersPairAddr]);
  const loadOrders = React.useCallback(() => {
    if (!apiUrl || !address || !ordersPairAddr || ordersInDepth) return setOrders([]);
    axios
      .get<{ orders: BookOrder[]; total: number }>(`${apiUrl}/orderbook/orders`, {
        params: { address, pairAddr: ordersPairAddr, status: "active", limit: 200 },
      })
      .then((res) => {
        setOrders(res.data.orders ?? []);
        setOrdersTotal(res.data.total ?? 0);
      })
      .catch(() => {
        setOrders([]);
        setOrdersTotal(0);
      });
  }, [apiUrl, address, ordersPairAddr, ordersInDepth]);
  const loadPastOrders = React.useCallback(() => {
    if (!apiUrl || !address || !ordersPairAddr) return setPastOrders([]);
    axios
      .get<{ orders: BookOrder[] }>(`${apiUrl}/orderbook/orders`, {
        params: { address, pairAddr: ordersPairAddr, status: "filled,cancelled", limit: 100 },
      })
      .then((res) => setPastOrders(res.data.orders ?? []))
      .catch(() => setPastOrders([]));
  }, [apiUrl, address, ordersPairAddr]);

  React.useEffect(() => {
    loadSummary();
    const i = setInterval(loadSummary, 30_000);
    return () => clearInterval(i);
  }, [loadSummary]);
  React.useEffect(() => {
    loadMineBuckets();
    const i = setInterval(loadMineBuckets, 30_000);
    return () => clearInterval(i);
  }, [loadMineBuckets]);
  React.useEffect(() => {
    loadOrders();
    const i = setInterval(loadOrders, 30_000);
    return () => clearInterval(i);
  }, [loadOrders]);
  React.useEffect(() => {
    setShowHistory(false);
    setPastOrders([]);
  }, [ordersPairAddr]);
  React.useEffect(() => {
    if (showHistory) loadPastOrders();
  }, [showHistory, loadPastOrders]);

  // Choisir une paire dans "Mes ordres" la charge aussi dans le formulaire
  // (et donc dans le carnet, où ces ordres sont marqués). L'override garde la
  // liste affichée pendant le chargement du pair, puis s'efface dès qu'un
  // pair est résolu — y compris si l'utilisateur change ensuite de tokens.
  React.useEffect(() => {
    if (pair !== undefined) setOrdersPairOverride(null);
  }, [pair]);
  const selectOrdersPair = (p: PairOrderSummary) => {
    if (p.pairAddr === pair?.address) return setOrdersPairOverride(null);
    setOrdersPairOverride(p.pairAddr);
    const find = (id: string | null) => (id ? tokensOut.find((tk) => tk.identifier === id) ?? null : null);
    const a = find(p.tokenA);
    const b = find(p.tokenB);
    // Token inconnu de la liste (ni API ni wallet) : on affiche seulement les ordres.
    if (!a || !b) return;
    setTokenIn(a);
    setTokenOut(b);
    setAmount("");
    setPrice("");
  };

  const currentPairSummary = pairSummaries.find((p) => p.pairAddr === ordersPairAddr) ?? null;
  const tickerOf = (identifier: string) => identifier.split("-")[0];
  const logoOf = (identifier: string | null) => (identifier ? tokensOut.find((tk) => tk.identifier === identifier)?.logoUrl ?? null : null);
  const [openDepthBand, setOpenDepthBand] = React.useState<string | null>(null);
  React.useEffect(() => setOpenDepthBand(null), [pair?.address, depthInverted]);

  /* ---- Form state ---- */
  const blocker = !tokenIn || !tokenOut
    ? t("limit_pick_tokens")
    : pair === undefined
      ? t("limit_loading_pair")
      : pair === null
        ? t("limit_no_pair_btn")
        : !pair.isActive
          ? t("limit_activate_first")
          : !bookSupported
          ? t("limit_not_supported_btn")
          : !amountRaw
          ? t("dca_btn_enter_amount")
          : insufficient
            ? t("btn_insufficient")
            : belowMin
              ? t("limit_below_min", { amount: `${fmt(minOrderRaw!, decIn)} ${tokenIn.ticker}` })
              : !priceBN
                ? t("limit_enter_price")
                : priceTooFarFromMarket
                  ? t("limit_price_too_far_btn")
                  : !minOutRaw || minOutRaw.lte(0)
                    ? t("limit_out_too_small")
                    : null;

  // Same look as Swap: framed sections + compact right-aligned amount inputs.
  const cardCls = "dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4";
  const fieldBorder = (state: "idle" | "active" | "error") =>
    state === "error"
      ? "dvx:border-red-400 dvx:dark:border-red-500 dvx:focus:ring-red-400"
      : state === "active"
        ? "dvx:border-amber-400 dvx:dark:border-amber-500 dvx:focus:ring-amber-500"
        : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500";
  const fieldBase =
    "dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:transition-colors";
  const amountCls = (state: "idle" | "active" | "error") => `dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:text-right ${fieldBase} ${fieldBorder(state)}`;
  const label = "dvx:block dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1.5";

  const orderRow = (o: BookOrder) => {
    const initial = new BigNumber(o.amountInInitial);
    const remaining = new BigNumber(o.amountInRemaining);
    const filledPct = initial.gt(0) ? initial.minus(remaining).div(initial).times(100).toNumber() : 0;
    // price = ceil(min_out * 1e36 / amount_in) in raw units → human "1 IN = x OUT".
    const humanPrice = new BigNumber(o.price).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(o.tokenInDecimals - o.tokenOutDecimals);
    const wantOut = initial.times(o.price).shiftedBy(-PRICE_SCALE_DEC);
    const key = `cancel:${o.pairAddr}:${o.orderId}`;
    return (
      <div
        key={`${o.pairAddr}:${o.orderId}`}
        className="dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-3 dvx:rounded-xl dvx:px-3 dvx:py-2 dvx:bg-gray-50 dvx:dark:bg-[#2a2a2a]"
      >
        <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          <TokenLogo url={o.tokenInLogoUrl} ticker={o.tokenInTicker} />
          <span style={{ marginLeft: -8, borderRadius: 9999, boxShadow: "0 0 0 2px rgba(0,0,0,0.35)", display: "inline-flex" }}>
            <TokenLogo url={o.tokenOutLogoUrl} ticker={o.tokenOutTicker} />
          </span>
        </span>
        <div style={{ flex: "1 1 160px", minWidth: 0 }}>
          <div className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white" style={{ fontSize: 13, overflowWrap: "anywhere" }}>
            {fmt(initial, o.tokenInDecimals)} {o.tokenInTicker} → {fmt(wantOut, o.tokenOutDecimals)} {o.tokenOutTicker}
          </div>
          <div className="dvx:text-gray-500 dvx:dark:text-gray-400" style={{ fontSize: 11 }}>
            1 {o.tokenInTicker} = {fmtPrice(humanPrice)} {o.tokenOutTicker}
            {o.status === "active" && filledPct > 0 && ` · ${t("limit_filled_pct", { pct: filledPct.toFixed(1) })}`}
            {o.status !== "active" && ` · ${t(o.status === "filled" ? "limit_status_filled" : "limit_status_cancelled")}`}
          </div>
        </div>
        {o.status === "active" && (
          <button
            type="button"
            onClick={() => cancelOrder(o)}
            disabled={busy !== null}
            className="dvx:px-3 dvx:py-1.5 dvx:rounded-lg dvx:font-bold dvx:border dvx:border-red-400 dvx:text-red-500 dvx:bg-transparent dvx:disabled:opacity-50"
            style={{ fontSize: 12 }}
          >
            {busy === key ? "…" : t("limit_cancel")}
          </button>
        )}
      </div>
    );
  };

  // Ligne compacte d'un ordre dans le détail d'un palier du carnet (cf. DepthBucketOrders).
  // Exprimée dans le sens du carnet affiché : quantité de `baseId`, prix en
  // token de référence — un achat (escrow du token de référence) a donc son
  // prix brut inversé et sa quantité = le minimum de base reçu.
  const depthOrderRow = (o: BookOrder, baseId: string) => {
    const initial = new BigNumber(o.amountInInitial);
    const remaining = new BigNumber(o.amountInRemaining);
    const filledPct = initial.gt(0) ? initial.minus(remaining).div(initial).times(100).toNumber() : 0;
    const humanPrice = new BigNumber(o.price).shiftedBy(-PRICE_SCALE_DEC).shiftedBy(o.tokenInDecimals - o.tokenOutDecimals);
    const isSell = o.tokenIn === baseId;
    const baseAmount = isSell
      ? fmt(remaining, o.tokenInDecimals)
      : fmt(remaining.times(o.price).shiftedBy(-PRICE_SCALE_DEC).integerValue(BigNumber.ROUND_DOWN), o.tokenOutDecimals);
    // Quote side: what a sell expects for its remaining amount, what a buy still escrows.
    const quoteAmount = isSell
      ? fmt(remaining.times(o.price).shiftedBy(-PRICE_SCALE_DEC).integerValue(BigNumber.ROUND_DOWN), o.tokenOutDecimals)
      : fmt(remaining, o.tokenInDecimals);
    const baseTicker = isSell ? o.tokenInTicker : o.tokenOutTicker;
    const quoteTicker = isSell ? o.tokenOutTicker : o.tokenInTicker;
    const priceInQuote = isSell ? humanPrice : new BigNumber(1).div(humanPrice);
    const key = `cancel:${o.pairAddr}:${o.orderId}`;
    return (
      <div
        key={o.orderId}
        className="dvx:flex dvx:items-center dvx:gap-2 dvx:px-2 dvx:py-1 dvx:border-b dvx:border-gray-100 dvx:dark:border-[#333] dvx:last:border-b-0"
        style={{ fontSize: 11 }}
      >
        <span className="dvx:flex-1 dvx:min-w-0 dvx:text-gray-700 dvx:dark:text-gray-200" style={{ overflowWrap: "anywhere" }}>
          <span className="dvx:font-bold" style={{ color: isSell ? "#dc2626" : "#16a34a" }}>
            {t(isSell ? "depth_order_sell" : "depth_order_buy")}
          </span>{" "}
          <span className="dvx:font-semibold">
            {baseAmount} {baseTicker}
          </span>
          <span className="dvx:text-gray-400"> {t("depth_order_for")} </span>
          <span className="dvx:font-semibold">
            {quoteAmount} {quoteTicker}
          </span>
          <span className="dvx:text-gray-400">
            {" "}@ {fmtPrice(priceInQuote)}
            {filledPct > 0 && ` · ${t("limit_filled_pct", { pct: filledPct.toFixed(1) })}`}
          </span>
        </span>
        <button
          type="button"
          onClick={() => cancelOrder(o)}
          disabled={busy !== null}
          className="dvx:bg-transparent dvx:p-0 dvx:font-bold dvx:text-red-500 dvx:hover:text-red-400 dvx:disabled:opacity-50"
          style={{ fontSize: 11 }}
        >
          {busy === key ? "…" : t("limit_cancel")}
        </button>
      </div>
    );
  };

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
            <SectionTabs active="limit" />
          </div>
        }
        description={t("limit_desc")}
      >
        <div className="dvx:flex dvx:flex-col dvx:gap-4 dvx:mt-4">
          <div className="dvx:space-y-2">
          {/* Sell */}
          <div style={palette.inner} className={cardCls}>
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-2">
              <p className={label} style={{ marginBottom: 0 }}>{t("limit_sell")}</p>
            </div>
            {tokenIn && address && (
              <div className="dvx:flex dvx:justify-end dvx:mb-3">
                <button
                  type="button"
                  onClick={() => changeAmount(new BigNumber(balanceOf(tokenIn.identifier)).shiftedBy(-decIn).toFixed())}
                  className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition-colors"
                >
                  <span className="dvx:text-gray-400">{t("balance")} :</span>
                  {fmt(balanceOf(tokenIn.identifier), decIn)}
                  <span className="dvx:bg-amber-100 dvx:dark:bg-amber-900/30 dvx:text-amber-600 dvx:dark:text-amber-400 dvx:px-1.5 dvx:py-0.5 dvx:rounded dvx:text-[9px] dvx:font-bold">
                    MAX
                  </span>
                </button>
              </div>
            )}
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <TokenSelect value={tokenIn} onChange={setTokenIn} tokens={tokensIn} balances={balances} exclude={tokenOut?.identifier} loading={tokensLoading} />
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => changeAmount(e.target.value)}
                style={palette.input}
                className={amountCls(insufficient ? "error" : "idle")}
              />
            </div>
            {/* Anti-spam floor of this pair (ratio adjustable per pair by the owner) —
                shown only when it actually constrains the order (min ≥ 1 raw unit). */}
            {minOrder && minOrder.min.gt(0) && tokenIn && (
              <p
                className={belowMin ? "dvx:text-red-500 dvx:font-semibold" : "dvx:text-gray-500 dvx:dark:text-gray-400"}
                style={{ fontSize: 11, marginTop: 6 }}
                title={t("limit_min_tooltip")}
              >
                {t(minOrder.basisIsReserve ? "limit_min_reserve" : "limit_min_book", {
                  amount: `${fmt(minOrder.min, decIn)} ${tokenIn.ticker}`,
                  pct: ratioPctLabel(minOrder.ratio),
                })}
              </p>
            )}
          </div>

          {/* Invert direction */}
          <div className="dvx:flex dvx:justify-center dvx:-my-0.5 dvx:relative dvx:z-10">
            <button
              type="button"
              onClick={invertTokens}
              title={t("limit_invert")}
              aria-label={t("limit_invert")}
              style={palette.invertBtn}
              className="dvx:rounded-full dvx:p-2 dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:shadow-sm dvx:hover:bg-amber-50 dvx:dark:hover:bg-amber-900/20 dvx:transition-colors"
            >
              <ArrowUpDown className="dvx:h-4 dvx:w-4 dvx:text-amber-500" />
            </button>
          </div>

          {/* Buy */}
          <div style={palette.inner} className={cardCls}>
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-2">
              <p className={label} style={{ marginBottom: 0 }}>{t("limit_buy")}</p>
            </div>
            {tokenOut && address && (
              <div className="dvx:flex dvx:justify-end dvx:mb-3">
                <span className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                  {t("balance")} : <span className="dvx:text-amber-500">{fmt(balanceOf(tokenOut.identifier), decOut)}</span>
                </span>
              </div>
            )}
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <TokenSelect value={tokenOut} onChange={setTokenOut} tokens={tokensOut} exclude={tokenIn?.identifier} loading={tokensLoading} />
              {/* Total received for the whole amount — editing it recomputes the unit price. */}
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={receiveInputValue}
                onChange={(e) => setReceiveInput(e.target.value)}
                title={t("limit_receive_input_tip")}
                style={palette.input}
                className={amountCls(priceAnchor === "receive" ? "active" : "idle")}
              />
            </div>
          </div>
          </div>

          {/* No pair → deploy it (createPair only, no LP steps) */}
          {tokenIn && tokenOut && pair === null && (
            <div className="dvx:rounded-xl dvx:p-3 dvx:bg-amber-50 dvx:dark:bg-amber-900/10" style={{ boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.45)" }}>
              <p className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400" style={{ fontSize: 13 }}>
                {t("limit_no_pair_title", { a: tokenIn.ticker, b: tokenOut.ticker })}
              </p>
              <p className="dvx:mt-1 dvx:text-gray-600 dvx:dark:text-gray-300" style={{ fontSize: 12 }}>
                {t("limit_no_pair_desc")}
              </p>
              <button
                type="button"
                onClick={address ? createPair : onConnect}
                disabled={busy !== null || pairPolling !== false || !factoryAddress}
                className="dinoButton orange dvx:mt-3 dvx:w-full dvx:text-sm dvx:disabled:opacity-50"
              >
                {pairPolling === "exists" ? t("create_tx_waiting") : busy === "pair" ? t("create_tx_pending") : t("limit_deploy_pair")}
              </button>
            </div>
          )}

          {pair && !bookSupported && (
            <p className="dvx:rounded-xl dvx:px-3 dvx:py-2 dvx:text-orange-600 dvx:dark:text-orange-400 dvx:bg-orange-50 dvx:dark:bg-orange-900/10" style={{ fontSize: 12 }}>
              {t("limit_not_supported")}
            </p>
          )}

          {/* Step 2 — pair deployed but not activated (no LP issued): swap() is closed, orders couldn't fill */}
          {pair && !pair.isActive && (
            <div className="dvx:rounded-xl dvx:p-3 dvx:bg-amber-50 dvx:dark:bg-amber-900/10" style={{ boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.45)" }}>
              <p className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400" style={{ fontSize: 13 }}>
                {t("limit_activate_title")}
              </p>
              <p className="dvx:mt-1 dvx:text-gray-600 dvx:dark:text-gray-300" style={{ fontSize: 12 }}>
                {t("limit_activate_desc")}
              </p>
              <button
                type="button"
                onClick={address ? issueLp : onConnect}
                disabled={busy !== null || pairPolling !== false || !factoryAddress}
                className="dinoButton orange dvx:mt-3 dvx:w-full dvx:text-sm dvx:disabled:opacity-50"
              >
                {pairPolling === "active" ? t("create_tx_waiting") : busy === "lp" ? t("create_tx_pending") : t("limit_activate_btn")}
              </button>
            </div>
          )}

          {/* Limit price */}
          {pair && (
            <div style={palette.inner} className={cardCls}>
              <div className="dvx:flex dvx:flex-wrap dvx:justify-between dvx:items-center dvx:gap-2 dvx:mb-3">
                <p className={label} style={{ marginBottom: 0 }}>{t("limit_price", { a: tokenIn?.ticker ?? "", b: tokenOut?.ticker ?? "" })}</p>
                {spot && (
                  <div className="dvx:flex dvx:items-center dvx:gap-2">
                    {[-1, 1].map((dir) => {
                      // ±1% from the current price, or from the spot when none is set yet.
                      const nudge = () => setPrice((priceBN ?? spot).times(1 + dir / 100).precision(8, BigNumber.ROUND_HALF_UP).toFixed());
                      return (
                        <button
                          key={dir}
                          type="button"
                          onClick={nudge}
                          className="dvx:font-semibold dvx:text-amber-500"
                          style={{ fontSize: 11, order: dir < 0 ? 0 : 2, padding: "1px 6px", borderRadius: 6, border: "1px solid rgba(245,158,11,0.5)", background: "transparent", lineHeight: 1.4 }}
                        >
                          {dir < 0 ? "-1%" : "+1%"}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPrice(fmtPrice(spot).replace(/,/g, ""))}
                      className="dvx:bg-transparent dvx:p-0 dvx:font-semibold dvx:text-amber-500"
                      style={{ fontSize: 11, order: 1 }}
                    >
                      {t("limit_market")} : {fmtPrice(spot)}
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={priceInputValue}
                onChange={(e) => setPrice(e.target.value)}
                style={palette.input}
                className={`dvx:w-full ${fieldBase} ${fieldBorder(priceTooFarFromMarket ? "error" : priceAnchor === "price" && priceBN ? "active" : "idle")}`}
              />
              <div className="dvx:mt-1.5 dvx:flex dvx:flex-wrap dvx:justify-between dvx:gap-2" style={{ fontSize: 12 }}>
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {minOutRaw && minOutRaw.gt(0) && tokenOut
                    ? t("limit_receive", { amount: fmt(minOutRaw, decOut), ticker: tokenOut.ticker })
                    : !spot && t("limit_no_market_hint")}
                </span>
                {deviationPct != null && Number.isFinite(deviationPct) && (
                  <span className={`dvx:font-bold ${deviationPct >= 0 ? "dvx:text-green-600 dvx:dark:text-green-400" : "dvx:text-red-500"}`}>
                    {deviationPct >= 0 ? "+" : ""}
                    {deviationPct.toFixed(2)}% {t("limit_vs_market")}
                  </span>
                )}
              </div>
              {outRounded && idealOutRaw && minOutRaw && tokenIn && tokenOut && (
                <div className="dvx:mt-1 dvx:text-amber-600 dvx:dark:text-amber-400" style={{ fontSize: 11 }}>
                  {t("limit_rounded_warn", {
                    ideal: `${fmt(idealOutRaw, decOut)} ${tokenOut.ticker}`,
                    rounded: `${fmt(minOutRaw, decOut)} ${tokenOut.ticker}`,
                    decimals: decOut,
                    a: tokenIn.ticker,
                    price: `${fmtPrice(effectivePrice ?? new BigNumber(0))} ${tokenOut.ticker}`,
                  })}{" "}
                  <button
                    type="button"
                    onClick={() => setReceiveInput(idealOutRaw.integerValue(BigNumber.ROUND_CEIL).shiftedBy(-decOut).toFixed())}
                    className="dvx:bg-transparent dvx:p-0 dvx:font-bold dvx:underline dvx:text-amber-600 dvx:dark:text-amber-400"
                    style={{ fontSize: 11 }}
                  >
                    {t("limit_round_up", { amount: `${fmt(idealOutRaw.integerValue(BigNumber.ROUND_CEIL), decOut)} ${tokenOut.ticker}` })}
                  </button>
                </div>
              )}
              {priceTooFarFromMarket ? (
                <p className="dvx:mt-1 dvx:font-semibold dvx:text-red-500" style={{ fontSize: 11 }}>
                  {priceTooLow
                    ? t("limit_price_too_low", { pct: +maxDiscountPct.toFixed(2) })
                    : t("limit_price_too_far", { factor: maxDeviationFactor })}
                </p>
              ) : (
                belowMarket && (
                  <p className="dvx:mt-1 dvx:text-red-500" style={{ fontSize: 11 }}>
                    {t("limit_below_market_warn")}
                  </p>
                )
              )}
            </div>
          )}

          {/* Optional step 3 — active pair with no AMM liquidity: orders work (book only),
              but swaps can only consume a few orders at a time; liquidity smooths it out.
              Placed after the inputs so it doesn't split the order form. */}
          {pair && pair.isActive && !spot && tokenIn && tokenOut && (
            <div className="dvx:rounded-xl dvx:p-3 dvx:bg-gray-50 dvx:dark:bg-[#1f1f1f]" style={{ boxShadow: "0 0 0 1px rgba(156, 163, 175, 0.35)" }}>
              <p className="dvx:font-bold dvx:text-gray-800 dvx:dark:text-gray-100" style={{ fontSize: 13 }}>
                {t("limit_liquidity_title")}
              </p>
              <p className="dvx:mt-1 dvx:text-gray-600 dvx:dark:text-gray-300" style={{ fontSize: 12 }}>
                {t("limit_liquidity_desc")}
              </p>
              <button
                type="button"
                onClick={() => goTo("add-liquidity", { tokenA: pair.tokenA, tokenB: pair.tokenB })}
                className="dvx:mt-2 dvx:px-3 dvx:py-1.5 dvx:rounded-lg dvx:font-bold dvx:border dvx:border-amber-500 dvx:text-amber-600 dvx:dark:text-amber-400 dvx:bg-transparent"
                style={{ fontSize: 12 }}
              >
                {t("limit_liquidity_btn", { pair: `${tokenIn.ticker} / ${tokenOut.ticker}` })}
              </button>
            </div>
          )}

          {/* Current book of the pair: where the other orders sit. */}
          {pair &&
            pair.isActive &&
            bookSupported &&
            apiUrl &&
            (() => {
              // Souche (USDC/WEGLD/VOXEGLD...) toujours affichée en référence
              // (quote) par défaut ; paire arbitraire (OLV/BOD...) : ordre
              // on-chain inchangé. Inversable manuellement (cf. bouton ci-dessous).
              const realA = { identifier: pair.tokenA, ticker: (inIsA ? tokenIn : tokenOut)?.ticker ?? pair.tokenA.split("-")[0], decimals: inIsA ? decIn : decOut };
              const realB = { identifier: pair.tokenB, ticker: (inIsA ? tokenOut : tokenIn)?.ticker ?? pair.tokenB.split("-")[0], decimals: inIsA ? decOut : decIn };
              const { base, quote } = orderForQuoteDisplay(realA, realB, depthInverted);
              const baseIsRealA = base.identifier === pair.tokenA;
              const spotRealAinRealB = spot ? (inIsA ? spot.toNumber() : 1 / spot.toNumber()) : null;
              const spotBaseInQuote = spotRealAinRealB == null ? null : baseIsRealA ? spotRealAinRealB : 1 / spotRealAinRealB;
              // Chart in the form's direction (1 tokenIn = ? tokenOut, like the limit
              // price field) — the book may be shown the other way (⇅ / quote priority).
              // Order being typed: effective price once rounded.
              const typedPrice = effectivePrice ?? priceBN;
              const previewPrice = typedPrice && typedPrice.gt(0) ? typedPrice.toNumber() : null;
              const bookToChart = (p: number) => (tokenIn?.identifier === base.identifier ? p : 1 / p);
              // Same pool (pool history only, cf. chartEntryForPool).
              const listed = chartEntryForPool(chartable, pair, { anyPair: true });
              const chartEntry: ChartableEntry | null =
                listed && tokenIn && tokenOut
                  ? {
                      token: tokenIn.identifier,
                      quote: tokenOut.identifier,
                      poolAddress: pair.address,
                      tvlUsd: listed.tvlUsd,
                      invertPrice: tokenIn.identifier !== pair.tokenA,
                    }
                  : null;
              return (
                <div>
                  {chartEntry && (
                    <div className="dvx:mb-3">
                      <PriceChart
                        apiUrl={apiUrl}
                        entries={[chartEntry]}
                        tickerOf={(id) => (id === base.identifier ? base.ticker : id === quote.identifier ? quote.ticker : id.split("-")[0])}
                        bookLevels={[
                          // Book levels re-expressed per chart token: a buy of the book's base
                          // is a sell of the chart token when the chart is the other way.
                          ...(depthLevels?.pool === pair.address && depthLevels.base === base.identifier
                            ? depthLevels.levels.map((l) => ({
                                side: tokenIn?.identifier === base.identifier ? l.side : l.side === "ask" ? ("bid" as const) : ("ask" as const),
                                price: bookToChart(l.price),
                              }))
                            : []),
                          // The form always sells the chart token.
                          ...(previewPrice != null && Number.isFinite(previewPrice) ? [{ side: "ask" as const, price: previewPrice, preview: true }] : []),
                        ]}
                      />
                    </div>
                  )}
                  <div className="dvx:flex dvx:justify-end dvx:mb-1">
                    <button
                      type="button"
                      onClick={invertTokens}
                      className="dvx:flex dvx:items-center dvx:gap-1 dvx:bg-transparent dvx:p-0 dvx:text-[11px] dvx:font-semibold dvx:text-gray-400 dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200"
                      title={t("depth_invert")}
                    >
                      <ArrowUpDown className="dvx:h-3 dvx:w-3" />
                      {base.ticker}/{quote.ticker}
                    </button>
                  </div>
                  <OrderBookDepth
                    apiUrl={apiUrl}
                    pairAddr={pair.address}
                    tokenA={base.identifier}
                    tokenB={quote.identifier}
                    decimalsA={base.decimals}
                    decimalsB={quote.decimals}
                    tickerA={base.ticker}
                    tickerB={quote.ticker}
                    spotAinB={spotBaseInQuote}
                    onLevels={(levels) => setDepthLevels({ pool: pair.address, base: base.identifier, levels })}
                    // Bucket the order being typed will land in (same raw price as createOrder).
                    // "ask" = escrows the depth chart's component-A token — which real token
                    // that is depends on both the swap direction (inIsA) AND whether the
                    // quote-priority/invert logic above swapped A away from the real tokenA.
                    preview={
                      amountRaw && minOutRaw && minOutRaw.gt(0)
                        ? {
                            side: inIsA === baseIsRealA ? "ask" : "bid",
                            priceRaw: minOutRaw.shiftedBy(PRICE_SCALE_DEC).plus(amountRaw).minus(1).idiv(amountRaw).toFixed(0),
                            amount: amountRaw.shiftedBy(-decIn).toNumber(),
                          }
                        : null
                    }
                    // Same direction as the form (sell tokenIn for tokenOut).
                    onSwap={tokenIn && tokenOut ? () => goTo("swap", { from: tokenIn.identifier, to: tokenOut.identifier }) : undefined}
                    // Book price is 1 base = x quote; the form's is 1 tokenIn = ? tokenOut.
                    onPickPrice={
                      tokenIn
                        ? (p) => {
                            const bp = new BigNumber(p);
                            if (!bp.isFinite() || bp.lte(0)) return;
                            const formPrice = tokenIn.identifier === base.identifier ? bp : new BigNumber(1).div(bp);
                            setPrice(formPrice.precision(8, BigNumber.ROUND_HALF_UP).toFixed());
                          }
                        : undefined
                    }
                    // User's active orders on this pair, aggregated per bucket.
                    // Same side convention as preview: escrowing base = "ask".
                    mine={
                      ordersInDepth
                        ? mineBuckets.map((m) => {
                            const isAsk = m.tokenIn === base.identifier;
                            return {
                              side: isAsk ? ("ask" as const) : ("bid" as const),
                              bucketId: m.bucketId,
                              count: m.orderCount,
                              amount: new BigNumber(m.totalAmountRemaining).shiftedBy(-(isAsk ? base : quote).decimals).toNumber(),
                            };
                          })
                        : []
                    }
                    renderMineOrders={(band) =>
                      address && (
                        <DepthBucketOrders
                          apiUrl={apiUrl}
                          address={address}
                          pairAddr={pair.address}
                          tokenIn={band.side === "ask" ? base.identifier : quote.identifier}
                          bucketId={band.bucketId}
                          refreshKey={refreshKey}
                          renderRow={(o) => depthOrderRow(o, base.identifier)}
                        />
                      )
                    }
                    openBand={openDepthBand}
                    onToggleBand={(k) => setOpenDepthBand((cur) => (cur === k ? null : k))}
                    key={`${pair.address}:${refreshKey}:${depthInverted}`}
                  />
                </div>
              );
            })()}

          {txError && <p className="dvx:text-red-500" style={{ fontSize: 12 }}>{txError}</p>}

          <button
            type="button"
            onClick={!address ? onConnect : createOrder}
            disabled={!address ? !onConnect : !!blocker || busy !== null}
            style={{ minHeight: 36 }}
            className={`dinoButton orange dvx:w-full dvx:text-base ${address ? "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed" : ""}`}
          >
            {!address ? t("btn_connect") : busy === "create" ? t("dca_btn_signing") : (blocker ?? t("limit_submit"))}
          </button>
        </div>
      </Card>

      {address && pairSummaries.length > 0 && (
        <Card
          className="dvx:border-2 dvx:border-cyan-500/20"
          title={<span className="dvx:text-lg dvx:font-black dvx:tracking-tight">{t("limit_my_orders")}</span>}
        >
          <div className="dvx:flex dvx:flex-col dvx:gap-3 dvx:mt-3">
            {/* Sélecteur par paire — uniquement les paires où l'utilisateur a des
                ordres (cf. pairSummaries, payload léger : compteurs seuls). Affiché
                dès qu'il permet d'atteindre une paire autre que celle affichée. */}
            {pairSummaries.some((p) => p.pairAddr !== ordersPairAddr) && (
              // Styles clés en inline : le CSS des pages hôtes écrase les
              // bordures/tailles des <button> (cf. palette.invertBtn).
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
                {[...pairSummaries]
                  .sort((x, y) => y.activeCount - x.activeCount)
                  .map((p) => {
                    const isActive = p.pairAddr === ordersPairAddr;
                    const tickerA = p.tokenA ? tickerOf(p.tokenA) : "?";
                    const tickerB = p.tokenB ? tickerOf(p.tokenB) : "?";
                    return (
                      <button
                        key={p.pairAddr}
                        type="button"
                        onClick={() => selectOrdersPair(p)}
                        aria-pressed={isActive}
                        className="dvx:transition-colors dvx:hover:bg-amber-500/5"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 12,
                          textAlign: "left",
                          cursor: "pointer",
                          border: `1px solid ${isActive ? "rgba(245, 158, 11, 0.9)" : "rgba(156, 163, 175, 0.25)"}`,
                          background: isActive ? "rgba(245, 158, 11, 0.10)" : "rgba(156, 163, 175, 0.06)",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                          <TokenLogo url={logoOf(p.tokenA)} ticker={tickerA} />
                          <span style={{ marginLeft: -8, borderRadius: 9999, boxShadow: "0 0 0 2px rgba(0,0,0,0.35)", display: "inline-flex" }}>
                            <TokenLogo url={logoOf(p.tokenB)} ticker={tickerB} />
                          </span>
                        </span>
                        <span
                          className={isActive ? "dvx:text-amber-500" : "dvx:text-gray-900 dvx:dark:text-white"}
                          style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={`${tickerA} / ${tickerB}`}
                        >
                          {tickerA} / {tickerB}
                        </span>
                        <span
                          className={isActive ? "dvx:text-amber-500" : "dvx:text-gray-500 dvx:dark:text-gray-300"}
                          style={{
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: isActive ? "rgba(245, 158, 11, 0.18)" : "rgba(156, 163, 175, 0.15)",
                          }}
                        >
                          {t("limit_pair_active_count", { count: p.activeCount })}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}

            {!ordersPairAddr ? (
              <p className="dvx:text-gray-400" style={{ fontSize: 12 }}>{t("limit_pick_orders_pair")}</p>
            ) : ordersInDepth ? (
              <p className="dvx:text-gray-400" style={{ fontSize: 12 }}>
                {mineTotal === 0 ? t("limit_no_active") : t("limit_orders_in_depth", { count: mineTotal })}
              </p>
            ) : orders.length === 0 ? (
              <p className="dvx:text-gray-400" style={{ fontSize: 12 }}>{t("limit_no_active")}</p>
            ) : (
              <div className="dvx:flex dvx:flex-col dvx:gap-2">{orders.map(orderRow)}</div>
            )}
            {!ordersInDepth && ordersTotal > orders.length && (
              <p className="dvx:text-gray-400" style={{ fontSize: 11 }}>
                {t("limit_orders_capped", { shown: orders.length, total: ordersTotal })}
              </p>
            )}

            {(currentPairSummary?.pastCount ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="dvx:mt-1 dvx:bg-transparent dvx:font-semibold dvx:text-gray-400 dvx:hover:text-amber-500"
                style={{ fontSize: 12 }}
              >
                {showHistory ? t("limit_hide_history") : t("limit_show_history", { count: currentPairSummary?.pastCount ?? 0 })}
              </button>
            )}
            {showHistory && pastOrders.map(orderRow)}
          </div>
        </Card>
      )}
    </div>
  );
};

/** Limit tab while the order book is off (mainnet, cf. useFeatureFlags): same header, "coming soon" body. */
export const LimitComingSoon = () => {
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
            <SectionTabs active="limit" />
          </div>
        }
        description={t("limit_desc")}
      >
        <div className="dvx:flex dvx:flex-col dvx:items-center dvx:text-center dvx:gap-2 dvx:py-8">
          <span style={{ fontSize: 32, lineHeight: 1 }} aria-hidden>
            🎯
          </span>
          <p className="dvx:font-black dvx:text-amber-500" style={{ fontSize: 18 }}>
            {t("limit_coming_soon")}
          </p>
          <p className="dvx:text-gray-500 dvx:dark:text-gray-400" style={{ fontSize: 13, maxWidth: 420 }}>
            {t("limit_coming_soon_desc")}
          </p>
        </div>
      </Card>
    </div>
  );
};
