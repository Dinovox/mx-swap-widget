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
import { OrderBookDepth } from "../ui/OrderBookDepth";
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
): Promise<{ supported: boolean; ratio: number; maxDeviationFactor: number | null }> {
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
  const [{ supported, ratio }, maxDeviationFactor] = await Promise.all([ratioP, factorP]);
  return { supported, ratio, maxDeviationFactor };
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
  const [price, setPrice] = React.useState(""); // 1 tokenIn = price tokenOut

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
  // Manual base/quote flip for the depth chart below — reset whenever the
  // selected pair changes (cf. orderForQuoteDisplay, src/helpers/quotePriority.ts).
  const [depthInverted, setDepthInverted] = React.useState(false);
  React.useEffect(() => {
    setDepthInverted(false);
  }, [pair?.address]);
  React.useEffect(() => {
    if (!pairPolling) return;
    const i = setInterval(loadPair, 3000);
    return () => clearInterval(i);
  }, [pairPolling, loadPair]);

  const [minRatio, setMinRatio] = React.useState(DEFAULT_MIN_ORDER_RATIO);
  const [bookSupported, setBookSupported] = React.useState(true);
  // null = unknown (older pair without the V8 guard, or not fetched yet) —
  // the deviation check below stays silent/non-blocking in that case.
  const [maxDeviationFactor, setMaxDeviationFactor] = React.useState<number | null>(null);
  React.useEffect(() => {
    setBookSupported(true);
    setMaxDeviationFactor(null);
    if (!pair?.address || !networkApiAddress) return;
    fetchOrderBookInfo(networkApiAddress, pair.address).then(({ supported, ratio, maxDeviationFactor }) => {
      setBookSupported(supported);
      setMinRatio(ratio);
      setMaxDeviationFactor(maxDeviationFactor);
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
  const priceBN = (() => {
    const v = new BigNumber(price);
    return v.isFinite() && v.gt(0) ? v : null;
  })();
  // min_amount_out: what the maker wants for the WHOLE amount, floored to raw units.
  const minOutRaw = amountRaw && priceBN ? amountRaw.shiftedBy(-decIn).times(priceBN).shiftedBy(decOut).integerValue(BigNumber.ROUND_DOWN) : null;
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
  const priceTooFarFromMarket =
    spot && priceBN && maxDeviationFactor != null
      ? priceBN.gt(spot.times(maxDeviationFactor)) || priceBN.times(maxDeviationFactor).lt(spot)
      : false;

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
    if (priceBN && minOutRaw && minOutRaw.gt(0)) {
      setAmount(minOutRaw.shiftedBy(-decOut).toFixed());
      setPrice(new BigNumber(1).div(priceBN).precision(12, BigNumber.ROUND_DOWN).toFixed());
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
      setAmount("");
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

  /* ---- My orders ---- */
  const [orders, setOrders] = React.useState<BookOrder[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);
  const loadOrders = React.useCallback(() => {
    if (!apiUrl || !address) return setOrders([]);
    axios
      .get<{ orders: BookOrder[] }>(`${apiUrl}/orderbook/orders`, { params: { address } })
      .then((res) => setOrders(res.data.orders ?? []))
      .catch(() => setOrders([]));
  }, [apiUrl, address]);
  React.useEffect(() => {
    loadOrders();
    const i = setInterval(loadOrders, 30_000);
    return () => clearInterval(i);
  }, [loadOrders]);
  const activeOrders = orders.filter((o) => o.status === "active");
  const pastOrders = orders.filter((o) => o.status !== "active");

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
                  ? t("limit_price_too_far", { factor: maxDeviationFactor })
                  : !minOutRaw || minOutRaw.lte(0)
                    ? t("limit_out_too_small")
                    : null;

  const inputCls =
    "dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500";
  const label = "dvx:block dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1.5";

  const orderRow = (o: BookOrder) => {
    const initial = new BigNumber(o.amountInInitial);
    const remaining = new BigNumber(o.amountInRemaining);
    const filledPct = initial.gt(0) ? initial.minus(remaining).div(initial).times(100).toNumber() : 0;
    // price = ceil(min_out * 1e18 / amount_in) in raw units → human "1 IN = x OUT".
    const humanPrice = new BigNumber(o.price).shiftedBy(-18).shiftedBy(o.tokenInDecimals - o.tokenOutDecimals);
    const wantOut = initial.times(o.price).shiftedBy(-18);
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
          {/* Sell */}
          <div>
            <div className="dvx:flex dvx:justify-between dvx:items-end">
              <span className={label}>{t("limit_sell")}</span>
              {tokenIn && (
                <button
                  type="button"
                  onClick={() => setAmount(new BigNumber(balanceOf(tokenIn.identifier)).shiftedBy(-decIn).toFixed())}
                  className="dvx:mb-1.5 dvx:bg-transparent dvx:p-0 dvx:font-semibold dvx:text-amber-500"
                  style={{ fontSize: 11 }}
                >
                  {t("balance")} : {fmt(balanceOf(tokenIn.identifier), decIn)} · MAX
                </button>
              )}
            </div>
            <div className="dvx:flex dvx:gap-2">
              <TokenSelect value={tokenIn} onChange={setTokenIn} tokens={tokensIn} balances={balances} exclude={tokenOut?.identifier} loading={tokensLoading} />
              <input type="number" min="0" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} style={{ maxWidth: 180 }} />
            </div>
            {/* Anti-spam floor of this pair (ratio adjustable per pair by the owner). */}
            {minOrder && tokenIn && (
              <p
                className={belowMin ? "dvx:text-red-500 dvx:font-semibold" : "dvx:text-gray-500 dvx:dark:text-gray-400"}
                style={{ fontSize: 11, marginTop: 6 }}
                title={t("limit_min_tooltip")}
              >
                {minOrder.min.gt(0)
                  ? t(minOrder.basisIsReserve ? "limit_min_reserve" : "limit_min_book", {
                      amount: `${fmt(minOrder.min, decIn)} ${tokenIn.ticker}`,
                      pct: ratioPctLabel(minOrder.ratio),
                    })
                  : t("limit_min_none")}
              </p>
            )}
          </div>

          {/* Invert direction */}
          <div className="dvx:flex dvx:justify-center" style={{ margin: "-6px 0" }}>
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
          <div>
            <div className="dvx:flex dvx:justify-between dvx:items-end">
              <span className={label}>{t("limit_buy")}</span>
              {tokenOut && address && (
                <span className="dvx:mb-1.5 dvx:font-semibold dvx:text-gray-400" style={{ fontSize: 11 }}>
                  {t("balance")} : {fmt(balanceOf(tokenOut.identifier), decOut)}
                </span>
              )}
            </div>
            <TokenSelect value={tokenOut} onChange={setTokenOut} tokens={tokensOut} exclude={tokenIn?.identifier} loading={tokensLoading} />
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

          {/* Optional step 3 — active pair with no AMM liquidity: orders work (book only),
              but swaps can only consume a few orders at a time; liquidity smooths it out. */}
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
            <div>
              <div className="dvx:flex dvx:justify-between dvx:items-end">
                <span className={label}>{t("limit_price", { a: tokenIn?.ticker ?? "", b: tokenOut?.ticker ?? "" })}</span>
                {spot && (
                  <button
                    type="button"
                    onClick={() => setPrice(fmtPrice(spot).replace(/,/g, ""))}
                    className="dvx:mb-1.5 dvx:bg-transparent dvx:p-0 dvx:font-semibold dvx:text-amber-500"
                    style={{ fontSize: 11 }}
                  >
                    {t("limit_market")} : {fmtPrice(spot)}
                  </button>
                )}
              </div>
              <input type="number" min="0" placeholder="0.0" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
              <div className="dvx:mt-1.5 dvx:flex dvx:flex-wrap dvx:justify-between dvx:gap-2" style={{ fontSize: 12 }}>
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {minOutRaw && minOutRaw.gt(0) && tokenOut
                    ? t("limit_receive", { amount: fmt(minOutRaw, decOut), ticker: tokenOut.ticker })
                    : t("limit_no_market_hint")}
                </span>
                {deviationPct != null && Number.isFinite(deviationPct) && (
                  <span className={`dvx:font-bold ${deviationPct >= 0 ? "dvx:text-green-600 dvx:dark:text-green-400" : "dvx:text-red-500"}`}>
                    {deviationPct >= 0 ? "+" : ""}
                    {deviationPct.toFixed(2)}% {t("limit_vs_market")}
                  </span>
                )}
              </div>
              {priceTooFarFromMarket ? (
                <p className="dvx:mt-1 dvx:font-semibold dvx:text-red-500" style={{ fontSize: 11 }}>
                  {t("limit_price_too_far", { factor: maxDeviationFactor })}
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
              return (
                <div>
                  <div className="dvx:flex dvx:justify-end dvx:mb-1">
                    <button
                      type="button"
                      onClick={() => setDepthInverted((v) => !v)}
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
                    // Bucket the order being typed will land in (same raw price as createOrder).
                    // "ask" = escrows the depth chart's component-A token — which real token
                    // that is depends on both the swap direction (inIsA) AND whether the
                    // quote-priority/invert logic above swapped A away from the real tokenA.
                    preview={
                      amountRaw && minOutRaw && minOutRaw.gt(0)
                        ? {
                            side: inIsA === baseIsRealA ? "ask" : "bid",
                            priceRaw: minOutRaw.times("1e18").plus(amountRaw).minus(1).idiv(amountRaw).toFixed(0),
                            amount: amountRaw.shiftedBy(-decIn).toNumber(),
                          }
                        : null
                    }
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

      {address && (orders.length > 0) && (
        <Card
          className="dvx:border-2 dvx:border-cyan-500/20"
          title={<span className="dvx:text-lg dvx:font-black dvx:tracking-tight">{t("limit_my_orders")}</span>}
        >
          <div className="dvx:flex dvx:flex-col dvx:gap-2 dvx:mt-3">
            {activeOrders.length === 0 && <p className="dvx:text-gray-400" style={{ fontSize: 12 }}>{t("limit_no_active")}</p>}
            {activeOrders.map(orderRow)}
            {pastOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="dvx:mt-1 dvx:bg-transparent dvx:font-semibold dvx:text-gray-400 dvx:hover:text-amber-500"
                style={{ fontSize: 12 }}
              >
                {showHistory ? t("limit_hide_history") : t("limit_show_history", { count: pastOrders.length })}
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
