import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import { useGoTo } from "../context/SwapViewContext";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { ArrowUpDown, RefreshCw, GitBranch } from "lucide-react";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { Card } from "../ui/Card";
import { TokenSelect, type TokenBalanceInfo } from "../ui/TokenSelect";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import BigNumber from "bignumber.js";
import { useSwapConfig } from "../context/SwapConfigContext";
import eCompassLogo from "../assets/ecompass-logo.png";
import { getThemePalette } from "../ui/themePalette";
import type {
  SwapToken,
  QuoteHop,
  QuoteTx,
  QuoteResponse,
  ArbResponse,
} from "../types";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const SLIPPAGE_PRESETS = [0.005, 0.01, 0.02]; // 0.5 %, 1 %, 2 %
const eCompassId = (identifier: string) =>
  identifier === "EGLD" ? "WEGLD-bd4d79" : identifier;
const EGLD_TOKEN: SwapToken = {
  identifier: "EGLD",
  ticker: "EGLD",
  poolCount: 0,
  decimals: 18,
  logoUrl: null,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatUsd = (priceUsd: string, amount: number): string | null => {
  if (!amount || !priceUsd) return null;
  const value = parseFloat(priceUsd) * amount;
  if (!value) return null;
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

const formatUnitPrice = (
  priceUsd: string | null | undefined,
): string | null => {
  if (!priceUsd) return null;
  const v = parseFloat(priceUsd);
  if (!v) return null;
  if (v >= 1000)
    return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.0001) return `$${v.toFixed(4)}`;
  return `$${v.toExponential(2)}`;
};

/** Apply slippage to a raw amountOut string */
const applySlippage = (rawAmount: string, slippage: number): bigint =>
  BigInt(
    new BigNumber(rawAmount)
      .multipliedBy(1 - slippage)
      .toFixed(0, BigNumber.ROUND_DOWN),
  );

type ActiveField = "in" | "out";

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export const Swap = () => {
  const {
    apiUrl,
    routerAddress,
    aggregatorAddress,
    voxEgldAddress,
    wrapContract: WRAP_CONTRACT,
    wegldIdentifier: wegld_identifier,
    theme,
    onConnect,
    defaultFrom,
    defaultTo,
    whitelist,
    blacklist,
    address,
    networkApiAddress,
    chainId,
    explorerAddress,
    onSignTransactions,
    enableMultiroute,
    showNpmCta,
  } = useSwapConfig();
  const goTo = useGoTo();
  const p = getThemePalette(theme);
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const [searchParams, setSearchParams] = useWidgetSearchParams();

  /* ---- EGLD balance (fetched directly from API, no sdk-dapp hook) ---- */
  const [egldBalance, setEgldBalance] = useState<string | null>(null);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  useEffect(() => {
    if (!address || !networkApiAddress) {
      setEgldBalance(null);
      return;
    }
    axios
      .get<{ balance: string }>(`/accounts/${address}`, {
        baseURL: networkApiAddress,
      })
      .then((res) => setEgldBalance(res.data.balance ?? null))
      .catch(() => setEgldBalance(null));
  }, [address, networkApiAddress, balanceRefreshKey]);

  /* ---- Token list ---- */
  const [tokens, setTokens] = useState<SwapToken[]>([]);
  const [hubTokenIds, setHubTokenIds] = useState<Set<string>>(new Set());
  const [tokensLoading, setTokensLoading] = useState(true);

  /* ---- Selection ---- */
  const [tokenIn, setTokenIn] = useState<SwapToken | null>(null);
  const [tokenOut, setTokenOut] = useState<SwapToken | null>(null);
  const urlInitDoneRef = useRef(false);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>("in");

  /* ---- Quote ---- */
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // Backend found direct EGLD → liquid-staking more profitable than swapping.
  // One-way only (EGLD → voxEGLD): amountOut is deterministic, no wrap step involved.
  const isStakeRoute =
    !!quote &&
    (quote.source === "stake" ||
      quote.route.every((h) => h.dexType === "LiquidStaking"));

  // ---- Multiroute split (test feature, opt-in via SwapConfig.enableMultiroute) ----
  // splitAvailable reflects what the *current* quote actually offers; useSplitRoute
  // is the user's own choice, reset whenever tokens/amounts change so an old opt-in
  // never silently carries over to a different swap.
  const [useSplitRoute, setUseSplitRoute] = useState(false);
  const splitAvailable =
    !!enableMultiroute &&
    !!quote?.splitComparison &&
    quote.splitComparison.better === "split" &&
    !!quote.txs?.length &&
    !!quote.routes?.length;
  const useSplit = splitAvailable && useSplitRoute;

  /* ---- Arb ---- */
  const [arb, setArb] = useState<ArbResponse | null>(null);
  const [arbLoading, setArbLoading] = useState(false);
  const [arbError, setArbError] = useState<string | null>(null);
  const isArb = !!(
    tokenIn &&
    tokenOut &&
    tokenIn.identifier === tokenOut.identifier
  );

  /* ---- Settings ---- */
  const [slippage, setSlippage] = useState(0.01);

  /* ---- Tx state ---- */
  const [isSending, setIsSending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const quoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(10);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  /* ---- Balance tokenIn ---- */
  const [balanceLoading, setBalanceLoading] = useState(false);
  const isEgldIn = tokenIn?.identifier === "EGLD";

  const tokenInBalances = useGetUserESDT(
    !isEgldIn ? tokenIn?.identifier : undefined,
    {
      enabled: !!tokenIn && !isEgldIn && !!address,
      address,
      networkApiAddress,
      refreshKey: balanceRefreshKey,
    },
  );

  // Marque "en chargement" dès qu'on change de token
  useEffect(() => {
    if (tokenIn && address) setBalanceLoading(true);
    else setBalanceLoading(false);
  }, [tokenIn?.identifier]); // eslint-disable-line react-hooks/exhaustive-deps

  // Marque "chargé" dès que le hook répond
  useEffect(() => {
    setBalanceLoading(false);
  }, [tokenInBalances]);

  const tokenInBalanceRaw: string | null = isEgldIn
    ? (egldBalance ?? null)
    : (tokenInBalances?.[0]?.balance ?? null);

  const tokenInBalanceDisplay =
    tokenInBalanceRaw && tokenIn
      ? new BigNumber(tokenInBalanceRaw)
          .shiftedBy(-tokenIn.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

  // Après chargement, "absent du wallet" === balance 0
  const effectiveBalanceRaw =
    !balanceLoading && address && tokenIn
      ? (tokenInBalanceRaw ?? "0")
      : tokenInBalanceRaw;

  const effectiveAmountInRaw =
    activeField === "out" && quote
      ? quote.amountIn
      : activeField === "in" && amountIn
        ? new BigNumber(amountIn)
            .shiftedBy(tokenIn?.decimals ?? 18)
            .toFixed(0, BigNumber.ROUND_DOWN)
        : null;

  const insufficientBalance =
    !!effectiveBalanceRaw && !!effectiveAmountInRaw
      ? new BigNumber(effectiveAmountInRaw).isGreaterThan(effectiveBalanceRaw)
      : false;

  /* ---- Balance tokenOut ---- */
  const isEgldOut_balance = tokenOut?.identifier === "EGLD";
  const tokenOutBalances = useGetUserESDT(
    !isEgldOut_balance ? tokenOut?.identifier : undefined,
    {
      enabled: !!tokenOut && !isEgldOut_balance && !!address,
      address,
      networkApiAddress,
      refreshKey: balanceRefreshKey,
    },
  );
  const tokenOutBalanceRaw: string | null = isEgldOut_balance
    ? (egldBalance ?? null)
    : (tokenOutBalances?.[0]?.balance ?? null);
  const tokenOutBalanceDisplay =
    tokenOutBalanceRaw && tokenOut
      ? new BigNumber(tokenOutBalanceRaw)
          .shiftedBy(-tokenOut.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

  /* ---------- Wallet holdings (to sort/annotate the token selector) ---------- */
  // Fetch every ESDT held by the connected wallet (no identifier filter = full list).
  const allWalletTokensRaw = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
    refreshKey: balanceRefreshKey,
  });

  const walletBalanceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of allWalletTokensRaw as Array<{ identifier?: string; balance?: string }>) {
      if (w?.identifier && w?.balance) map.set(w.identifier, w.balance);
    }
    return map;
  }, [allWalletTokensRaw]);

  // Fallback price per identifier, sourced from the network API's own account-tokens
  // response (already fetched above for balances — `price` comes along for free).
  // DinoVox's own price graph doesn't always resolve every token (e.g. freshly
  // discovered pools, or ones outside its routing graph) even when the network API
  // already has a market price for it — without this fallback, such a token would
  // silently show no price/USD value anywhere despite genuinely having one.
  const walletPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of allWalletTokensRaw as Array<{ identifier?: string; price?: number }>) {
      if (w?.identifier && w?.price != null) map.set(w.identifier, w.price);
    }
    return map;
  }, [allWalletTokensRaw]);

  // Held amount + USD value per token identifier, used to display balances in the
  // token selector and to sort it wallet-holdings-first.
  const tokenBalances = useMemo(() => {
    const map: Record<string, TokenBalanceInfo> = {};
    for (const tok of tokens) {
      const raw =
        tok.identifier === "EGLD" ? egldBalance : walletBalanceMap.get(tok.identifier);
      if (!raw) continue;
      const amount = new BigNumber(raw).shiftedBy(-tok.decimals);
      if (amount.isZero()) continue;
      const price = tok.priceUsd ?? walletPriceMap.get(tok.identifier);
      map[tok.identifier] = {
        amount: amount.toNumber(),
        usd: price != null ? amount.multipliedBy(price).toNumber() : null,
      };
    }
    return map;
  }, [tokens, egldBalance, walletBalanceMap, walletPriceMap]);

  // Tokens held by the wallet first (largest USD value first, dust included so it can
  // be sold too), then the remaining tokens in their original order.
  const sortedTokens = useMemo(() => {
    if (Object.keys(tokenBalances).length === 0) return tokens;
    return [...tokens].sort((a, b) => {
      const aBal = tokenBalances[a.identifier];
      const bBal = tokenBalances[b.identifier];
      if (!!aBal !== !!bBal) return aBal ? -1 : 1;
      if (aBal && bBal) return (bBal.usd ?? -1) - (aBal.usd ?? -1);
      return 0;
    });
  }, [tokens, tokenBalances]);

  /* ---------- Wrap / Unwrap detection ---------- */
  const isWrap =
    tokenIn?.identifier === "EGLD" && tokenOut?.identifier === wegld_identifier;
  const isUnwrap =
    tokenIn?.identifier === wegld_identifier && tokenOut?.identifier === "EGLD";
  const isWrapUnwrap = isWrap || isUnwrap;

  const handleMax = () => {
    if (!tokenInBalanceRaw || !tokenIn) return;
    setActiveField("in");
    setAmountOut("");
    setAmountIn(
      new BigNumber(tokenInBalanceRaw)
        .shiftedBy(-tokenIn.decimals)
        .toFixed(tokenIn.decimals, BigNumber.ROUND_DOWN),
    );
  };

  /* ---------- Fetch token list from DinoVox API (decimals + logoUrl already included) ---------- */
  useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);

    Promise.all([
      axios.get<{
        tokens: Array<{
          identifier: string;
          ticker: string;
          poolCount: number;
          decimals: number;
          logoUrl?: string | null;
          priceUsd?: string | null;
        }>;
      }>(`${apiUrl}/tokens`),
      axios
        .get(`${apiUrl}/tokens/hub`)
        .catch(() => ({ data: { hubTokens: [] } })),
    ])
      .then(([tokensRes, hubRes]) => {
        const whiteSet =
          whitelist && whitelist.length > 0 ? new Set(whitelist) : null;
        const blackSet =
          blacklist && blacklist.length > 0 ? new Set(blacklist) : null;
        const list = (tokensRes.data.tokens || [])
          .filter((t) => t.identifier)
          .filter((t) => !whiteSet || whiteSet.has(t.identifier))
          .filter((t) => !blackSet || !blackSet.has(t.identifier));
        const wegld = list.find((t) => t.ticker === "WEGLD");
        const egld = {
          ...EGLD_TOKEN,
          logoUrl: wegld?.logoUrl ?? null,
          priceUsd: wegld?.priceUsd ?? null,
        };
        const includeEgld =
          (!whiteSet || whiteSet.has("EGLD")) &&
          (!blackSet || !blackSet.has("EGLD"));
        setTokens(includeEgld ? [egld, ...list] : list);
        const ids: string[] = (hubRes.data?.hubTokens ?? []).map(
          (h: any) => h.identifier,
        );
        setHubTokenIds(new Set(ids));
      })
      .catch(() => setTokens([EGLD_TOKEN]))
      .finally(() => setTokensLoading(false));
  }, [apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Init token selection from URL params ---------- */
  useEffect(() => {
    if (tokens.length === 0 || urlInitDoneRef.current) return;
    urlInitDoneRef.current = true;

    const fromId = searchParams.get("from") || defaultFrom;
    const toId = searchParams.get("to") || defaultTo;

    const foundIn = fromId ? tokens.find((t) => t.identifier === fromId) : null;
    const foundOut = toId ? tokens.find((t) => t.identifier === toId) : null;

    if (foundIn) setTokenIn(foundIn);
    if (foundOut) setTokenOut(foundOut);

    urlInitDoneRef.current = true;
  }, [tokens, tokensLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Sync token selection to URL ---------- */
  useEffect(() => {
    if (!urlInitDoneRef.current) return;
    setSearchParams(
      (prev: URLSearchParams) => {
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

  /* ---------- Debounced quote / arb ---------- */
  const fetchQuote = useCallback(async () => {
    if (isWrapUnwrap) {
      setQuote(null);
      setQuoteError(null);
      setArb(null);
      setArbError(null);
      return;
    }

    if (!tokenIn || !tokenOut) {
      setQuote(null);
      setQuoteError(null);
      setArb(null);
      setArbError(null);
      return;
    }

    // ---- ARB mode: tokenIn === tokenOut ----
    if (isArb) {
      setQuote(null);
      setQuoteError(null);
      setArbLoading(true);
      setArbError(null);
      try {
        const params: Record<string, string | number> = {
          token: tokenIn.identifier,
          slippageBps: Math.round(slippage * 10000),
        };
        if (amountIn && Number(amountIn) > 0) {
          params.amountIn = new BigNumber(amountIn)
            .shiftedBy(tokenIn.decimals)
            .toFixed(0, BigNumber.ROUND_DOWN);
        }
        const { data } = await axios.get<ArbResponse>(`${apiUrl}/arb`, {
          params,
        });
        setArb(data);
        // Pre-fill amountIn with optimal amount if user hasn't typed one
        if (!amountIn || Number(amountIn) <= 0) {
          setAmountIn(
            new BigNumber(data.amountIn)
              .shiftedBy(-tokenIn.decimals)
              .toFixed(6, BigNumber.ROUND_DOWN),
          );
        }
      } catch (err: any) {
        setArb(null);
      } finally {
        setArbLoading(false);
      }
      return;
    }

    // ---- Normal quote ----
    const activeAmount = activeField === "in" ? amountIn : amountOut;
    if (!activeAmount || Number(activeAmount) <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const activeToken = activeField === "in" ? tokenIn : tokenOut;
    const rawAmount = new BigNumber(activeAmount)
      .shiftedBy(activeToken.decimals)
      .toFixed(0, BigNumber.ROUND_DOWN);

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const { data } = await axios.get<QuoteResponse>(`${apiUrl}/quote`, {
        params: {
          tokenIn: tokenIn.identifier,
          tokenOut: tokenOut.identifier,
          ...(activeField === "in"
            ? { amountIn: rawAmount }
            : { amountOut: rawAmount }),
          slippageBps: Math.round(slippage * 10000),
          // multiroute is exact-input only — the backend silently ignores it
          // alongside amountOut, so don't bother sending it in that case.
          ...(enableMultiroute && activeField === "in"
            ? { multiroute: "true" }
            : {}),
        },
      });
      setQuote(data);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      setQuoteError(
        code === "AMOUNT_TOO_LOW"
          ? t("error_amount_too_low")
          : code === "NO_ROUTE"
            ? t("error_no_route")
            : code === "INSUFFICIENT_LIQUIDITY"
              ? t("error_insufficient_liquidity")
              : (err?.response?.data?.message ?? t("error_quote")),
      );
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    activeField,
    isArb,
    isWrapUnwrap,
    slippage,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = setTimeout(fetchQuote, 300);
    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [fetchQuote]);

  const fetchQuoteRef = useRef(fetchQuote);
  useEffect(() => {
    fetchQuoteRef.current = fetchQuote;
  }, [fetchQuote]);

  /* ---------- Auto-refresh quote every 10s ---------- */
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (!quote || quoteLoading || isWrapUnwrap) return;
    setRefreshCountdown(10);
    let count = 10;
    refreshIntervalRef.current = setInterval(() => {
      count -= 1;
      setRefreshCountdown(count);
      if (count <= 0) {
        count = 10;
        setRefreshCountdown(10);
        fetchQuoteRef.current();
      }
    }, 1000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [quote, quoteLoading, isWrapUnwrap]);

  /* ---------- Invert direction ---------- */
  const invertTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    if (activeField === "in") {
      setActiveField("out");
      setAmountOut(amountIn);
      setAmountIn("");
    } else {
      setActiveField("in");
      setAmountIn(amountOut);
      setAmountOut("");
    }
    setQuote(null);
    setUseSplitRoute(false);
  };

  /* ---------- Execute swap / arb ---------- */
  const handleSwap = async () => {
    if (!tokenIn || !address) return;
    if (isArb && !arb) return;
    if (!isArb && !quote) return;
    setTxError(null);
    setIsSending(true);

    try {
      const allowedReceivers = [
        routerAddress,
        aggregatorAddress,
        voxEgldAddress,
      ].map((a) => a.toLowerCase());

      if (useSplit && quote?.txs?.length) {
        // Multiroute split: N independent multiPairSwap transactions, signed
        // together in one batch. sdk-dapp assigns them sequential nonces
        // (nonce, nonce+1, ...) in array order — no atomicity, one leg can
        // fail while the others go through.
        const invalidTx = quote.txs.find(
          (txMeta) => !allowedReceivers.includes(txMeta.scAddress.toLowerCase()),
        );
        if (invalidTx) {
          setTxError(`Receiver refusé : ${invalidTx.scAddress}`);
          return;
        }

        const transactions = quote.txs.map(
          (txMeta) =>
            new Transaction({
              value: BigInt(txMeta.egldValue),
              data: new TextEncoder().encode(txMeta.txData),
              receiver: new Address(txMeta.scAddress),
              sender: new Address(address),
              gasLimit: BigInt(txMeta.gasLimit),
              gasPrice: BigInt(GAS_PRICE),
              chainID: chainId!,
              version: 1,
            }),
        );

        await signAndSendTransactions({
          onSignTransactions,
          transactions,
          transactionsDisplayInfo: {
            processingMessage: t("processing_split", { n: transactions.length }),
            errorMessage: t("error_split"),
            successMessage: t("success_split"),
          },
        });
      } else {
        const { tx } = isArb ? arb! : quote!;
        if (!allowedReceivers.includes(tx.scAddress.toLowerCase())) {
          setTxError(`Receiver refusé : ${tx.scAddress}`);
          return;
        }

        const transaction = new Transaction({
          value: BigInt(tx.egldValue),
          data: new TextEncoder().encode(tx.txData),
          receiver: new Address(tx.scAddress),
          sender: new Address(address),
          gasLimit: BigInt(tx.gasLimit),
          gasPrice: BigInt(GAS_PRICE),
          chainID: chainId!,
          version: 1,
        });

        await signAndSendTransactions({
          onSignTransactions,
          transactions: [transaction],
          transactionsDisplayInfo: {
            processingMessage: t("processing"),
            errorMessage: t("error_tx"),
            successMessage: t("success_tx"),
          },
        });
      }

      // Reset
      setAmountIn("");
      setAmountOut("");
      setActiveField("in");
      setQuote(null);
      setArb(null);
      setUseSplitRoute(false);
      setBalanceRefreshKey((k) => k + 1);
    } catch (err: any) {
      console.error("[SwapWidget] handleSwap error:", err);
      setTxError(err?.message ?? "Erreur lors du swap");
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- Derived display values ---------- */
  const activeAmountStr = activeField === "in" ? amountIn : amountOut;

  // Value shown in the "you receive" field
  const amountOutDisplay = isWrapUnwrap
    ? activeAmountStr
      ? new BigNumber(activeAmountStr).toFixed(6, BigNumber.ROUND_DOWN)
      : ""
    : activeField === "out"
      ? amountOut // user is typing here
      : isArb && arb
        ? new BigNumber(arb.amountOut)
            .shiftedBy(-(tokenIn?.decimals ?? 18))
            .toFixed(6, BigNumber.ROUND_DOWN)
        : quote
          ? new BigNumber(
              useSplit && quote.splitComparison
                ? quote.splitComparison.amountOutSplit
                : quote.amountOut,
            )
              .shiftedBy(-(tokenOut?.decimals ?? 18))
              .toFixed(6, BigNumber.ROUND_DOWN)
          : "";

  // Value shown in the "you send" field (computed from reverse quote)
  const amountInDisplay =
    activeField === "out" && !isWrapUnwrap && quote
      ? new BigNumber(quote.amountIn)
          .shiftedBy(-(tokenIn?.decimals ?? 18))
          .toFixed(6, BigNumber.ROUND_DOWN)
      : amountIn;

  const arbProfitDisplay = arb
    ? new BigNumber(arb.profit)
        .shiftedBy(-(tokenIn?.decimals ?? 18))
        .toFixed(6, BigNumber.ROUND_DOWN)
    : null;

  // Minimum received: slippage on quote.amountOut (already net of all fees).
  // Stake route is deterministic (direct contract mint) — slippage doesn't apply,
  // amountOut itself is guaranteed.
  const minAmountOutDisplay =
    quote && !isWrapUnwrap
      ? new BigNumber(
          isStakeRoute
            ? quote.amountOut
            : applySlippage(
                useSplit && quote.splitComparison
                  ? quote.splitComparison.amountOutSplit
                  : quote.amountOut,
                slippage,
              ).toString(),
        )
          .shiftedBy(-(tokenOut?.decimals ?? 18))
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

  // How many more tokens the split's minimum-received actually guarantees over the
  // single route's, at the same slippage — the concrete number behind the bps figure
  // shown on the split toggle, so the user isn't left mentally diffing two amounts
  // themselves after flipping the checkbox.
  const splitMinOutDeltaDisplay = (() => {
    if (!quote?.splitComparison) return null;
    const singleMinOutRaw = isStakeRoute
      ? quote.amountOut
      : applySlippage(quote.splitComparison.amountOutSingle, slippage).toString();
    const splitMinOutRaw = applySlippage(
      quote.splitComparison.amountOutSplit,
      slippage,
    ).toString();
    return new BigNumber(splitMinOutRaw)
      .minus(singleMinOutRaw)
      .shiftedBy(-(tokenOut?.decimals ?? 18))
      .toFixed(6, BigNumber.ROUND_DOWN);
  })();

  // Falls back to the network API's own market price (already fetched above for
  // the balance lookups) when DinoVox's price graph hasn't resolved this token —
  // see walletPriceMap for why that can happen for a token that genuinely has a
  // price. Used everywhere a unit price or a USD value is shown for these two.
  const tokenInPriceUsd =
    tokenIn?.priceUsd ??
    (tokenInBalances?.[0]?.price != null
      ? String(tokenInBalances[0].price)
      : null);
  const tokenOutPriceUsd =
    tokenOut?.priceUsd ??
    (tokenOutBalances?.[0]?.price != null
      ? String(tokenOutBalances[0].price)
      : null);

  const amountInUsd =
    tokenInPriceUsd && Number(amountInDisplay) > 0
      ? formatUsd(tokenInPriceUsd, Number(amountInDisplay))
      : null;

  const amountOutUsd =
    tokenOutPriceUsd && Number(amountOutDisplay) > 0
      ? formatUsd(tokenOutPriceUsd, Number(amountOutDisplay))
      : null;

  const balanceInUsd =
    tokenInPriceUsd &&
    tokenInBalanceDisplay &&
    Number(tokenInBalanceDisplay) > 0
      ? formatUsd(tokenInPriceUsd, Number(tokenInBalanceDisplay))
      : null;

  const balanceOutUsd =
    tokenOutPriceUsd &&
    tokenOutBalanceDisplay &&
    Number(tokenOutBalanceDisplay) > 0
      ? formatUsd(tokenOutPriceUsd, Number(tokenOutBalanceDisplay))
      : null;

  const priceImpactPct = quote
    ? (parseFloat(quote.priceImpact) * 100).toFixed(2)
    : null;

  const impactColor = priceImpactPct
    ? parseFloat(priceImpactPct) < 1
      ? "dvx:text-green-600 dvx:dark:text-green-400"
      : parseFloat(priceImpactPct) < 3
        ? "dvx:text-amber-500 dvx:dark:text-amber-400"
        : "dvx:text-red-600 dvx:dark:text-red-400"
    : "";

  const canSwap = isWrapUnwrap
    ? !!address &&
      !isSending &&
      !insufficientBalance &&
      !!activeAmountStr &&
      Number(activeAmountStr) > 0
    : isArb
      ? !!arb &&
        !!address &&
        !isSending &&
        !arbLoading &&
        !arbError &&
        !insufficientBalance
      : !!quote &&
        !!address &&
        !isSending &&
        !quoteLoading &&
        !quoteError &&
        !insufficientBalance;

  const isEgldOut = tokenOut?.identifier === "EGLD";

  // DEX badge styling shared by the single-route breakdown and the multiroute
  // split-leg list, so a given DEX reads the same color/name in both places.
  // Canonical DEX color code: DinoVox=amber, JExchange=green, XExchange=blue,
  // OneDex=purple. LiquidStaking isn't a DEX in that code — cyan keeps it
  // visually distinct from all four (it never appears alongside them anyway,
  // the stake path is its own exclusive single-hop route).
  const getRouteDexStyle = (dexType?: QuoteHop["dexType"]) => {
    switch (dexType) {
      case "LiquidStaking":
        return {
          line: "dvx:bg-cyan-400 dvx:dark:bg-cyan-500",
          label: "dvx:text-cyan-600 dvx:dark:text-cyan-400",
          name: t("route_stake"),
        };
      case "XExchange":
        return {
          line: "dvx:bg-blue-400 dvx:dark:bg-blue-500",
          label: "dvx:text-blue-600 dvx:dark:text-blue-400",
          name: "XExchange",
        };
      case "JExchange":
        return {
          line: "dvx:bg-green-400 dvx:dark:bg-green-500",
          label: "dvx:text-green-600 dvx:dark:text-green-400",
          name: "JExchange",
        };
      case "OneDex":
        return {
          line: "dvx:bg-purple-400 dvx:dark:bg-purple-500",
          label: "dvx:text-purple-600 dvx:dark:text-purple-400",
          name: "OneDex",
        };
      default:
        return {
          line: "dvx:bg-amber-400 dvx:dark:bg-amber-500",
          label: "dvx:text-amber-600 dvx:dark:text-amber-400",
          name: "DinoVox",
        };
    }
  };

  /* ---------- Execute wrap / unwrap ---------- */
  const handleWrapUnwrap = async () => {
    const wrapAmount = activeField === "out" ? amountOut : amountIn;
    if (!tokenIn || !address || !wrapAmount || Number(wrapAmount) <= 0) return;
    setTxError(null);
    setIsSending(true);

    try {
      const senderAddress = new Address(address);
      const amountRaw = BigInt(
        new BigNumber(wrapAmount)
          .shiftedBy(18)
          .toFixed(0, BigNumber.ROUND_DOWN),
      );
      const wrapAddress = new Address(WRAP_CONTRACT);

      let txData: string;
      let receiver: Address;
      let value: bigint;

      if (isWrap) {
        receiver = wrapAddress;
        value = amountRaw;
        txData = "wrapEgld";
      } else {
        // unwrap: ESDTTransfer to wrap contract
        receiver = senderAddress;
        value = BigInt(0);
        txData = [
          "MultiESDTNFTTransfer",
          wrapAddress.toHex(),
          "01",
          strToHex(wegld_identifier),
          "00",
          bigToHex(amountRaw),
          strToHex("unwrapEgld"),
        ].join("@");
      }

      const transaction = new Transaction({
        value,
        data: new TextEncoder().encode(txData),
        receiver,
        sender: senderAddress,
        gasLimit: BigInt(3_000_000),
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });

      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: isWrap
            ? t("processing_wrap")
            : t("processing_unwrap"),
          errorMessage: isWrap ? t("error_wrap") : t("error_unwrap"),
          successMessage: isWrap ? t("success_wrap") : t("success_unwrap"),
        },
      });

      setAmountIn("");
      setAmountOut("");
      setActiveField("in");
      setBalanceRefreshKey((k) => k + 1);
    } catch (err: any) {
      setTxError(err?.message ?? "Erreur");
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:xs:flex-row dvx:items-start dvx:xs:items-center dvx:justify-between dvx:w-full dvx:gap-4">
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <span className="dvx:text-xl">🔄</span>
              <span className="dvx:text-lg dvx:font-black dvx:tracking-tight">Swap</span>
            </div>
            {/* Tabs: Swap / Liquidité */}
            <div
              style={p.tabBar}
              className="dvx:flex dvx:gap-1.5 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:shadow-inner dvx:w-full dvx:xs:w-auto"
            >
              <button
                style={p.activeTab}
                className="dvx:flex-1 dvx:xs:flex-initial dvx:px-4 dvx:sm:px-6 dvx:py-2 dvx:text-sm dvx:font-black dvx:rounded-lg dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md dvx:transition-all"
              >
                {t("tab_swap")}
              </button>
              <button
                onClick={() => goTo("liquidity")}
                className="dvx:flex-1 dvx:xs:flex-initial dvx:px-4 dvx:sm:px-6 dvx:py-2 dvx:text-sm dvx:font-bold dvx:rounded-lg dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-900 dvx:dark:hover:text-white dvx:transition-all dvx:hover:bg-white/50 dvx:dark:hover:bg-white/5"
              >
                {t("tab_liquidity")}
              </button>
            </div>
          </div>
        }
        description={t("card_description")}
      >
        <div className="dvx:space-y-2 dvx:mt-4">
          {/* ---- Token In ---- */}
          <div
            style={p.inner}
            className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
          >
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-2">
              <div className="dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap">
                <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                  {t("you_send")}
                </p>
                {tokenIn && (
                  <a
                    href={`${explorerAddress}/tokens/${tokenIn.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dvx:text-[10px] dvx:font-bold dvx:text-amber-500 dvx:hover:text-amber-400 dvx:hover:underline dvx:transition-colors"
                  >
                    {tokenIn.ticker} ↗
                  </a>
                )}
                {tokenIn && (
                  <a
                    href={`https://e-compass.io/token/${eCompassId(tokenIn.identifier)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on e-compass"
                    className="dvx:hover:opacity-70 dvx:transition-opacity"
                  >
                    <img
                      src={eCompassLogo}
                      alt="e-compass"
                      className="dvx:h-6 dvx:w-6"
                    />
                  </a>
                )}
                {tokenIn && formatUnitPrice(tokenInPriceUsd) && (
                  <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400">
                    {formatUnitPrice(tokenInPriceUsd)}
                  </span>
                )}
              </div>
              {quoteLoading && activeField === "out" && (
                <span className="dvx:text-[10px] dvx:text-gray-400 dvx:animate-pulse dvx:uppercase dvx:tracking-wider dvx:flex-shrink-0">
                  {t("calculating")}
                </span>
              )}
            </div>
            {address && tokenInBalanceDisplay && (
              <div className="dvx:flex dvx:justify-end dvx:mb-3">
                <button
                  onClick={handleMax}
                  className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition-colors"
                >
                  <span className="dvx:text-gray-400">{t("balance")} :</span>
                  {tokenInBalanceDisplay}
                  {balanceInUsd && (
                    <span className="dvx:text-gray-400 dvx:font-normal">
                      ≈ {balanceInUsd}
                    </span>
                  )}
                  <span className="dvx:bg-amber-100 dvx:dark:bg-amber-900/30 dvx:text-amber-600 dvx:dark:text-amber-400 dvx:px-1.5 dvx:py-0.5 dvx:rounded dvx:text-[9px] dvx:font-bold">
                    MAX
                  </span>
                </button>
              </div>
            )}
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <TokenSelect
                value={tokenIn}
                onChange={(t) => {
                  setTokenIn(t);
                  setQuote(null);
                  setUseSplitRoute(false);
                }}
                tokens={sortedTokens}
                balances={tokenBalances}
                exclude={undefined}
                loading={tokensLoading}
              />
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amountInDisplay}
                onChange={(e) => {
                  setActiveField("in");
                  setAmountIn(e.target.value);
                  setAmountOut("");
                  setQuote(null);
                  setUseSplitRoute(false);
                }}
                style={p.input}
                className={`dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:transition-colors ${
                  insufficientBalance
                    ? "dvx:border-red-400 dvx:dark:border-red-500 dvx:focus:ring-red-400"
                    : activeField === "in"
                      ? "dvx:border-amber-400 dvx:dark:border-amber-500 dvx:focus:ring-amber-500"
                      : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500"
                }`}
              />
            </div>
            {amountInUsd && !insufficientBalance && (
              <p className="dvx:mt-1 dvx:text-[10px] dvx:text-gray-400 dvx:text-right">
                ≈ {amountInUsd}
              </p>
            )}
            {insufficientBalance && (
              <p className="dvx:mt-2 dvx:text-[10px] dvx:font-semibold dvx:text-red-500 dvx:text-right">
                {t("insufficient_balance")}
              </p>
            )}
          </div>

          {/* ---- Invert button ---- */}
          <div className="dvx:flex dvx:justify-center dvx:-my-0.5 dvx:relative dvx:z-10">
            <button
              onClick={invertTokens}
              style={p.invertBtn}
              className="dvx:rounded-full dvx:p-2 dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:shadow-sm dvx:hover:bg-amber-50 dvx:dark:hover:bg-amber-900/20 dvx:transition-colors"
            >
              <ArrowUpDown className="dvx:h-4 dvx:w-4 dvx:text-amber-500" />
            </button>
          </div>

          {/* ---- Token Out ---- */}
          <div
            style={p.inner}
            className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
          >
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-2">
              <div className="dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap">
                <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                  {t("you_receive")}
                </p>
                {tokenOut && (
                  <a
                    href={`${explorerAddress}/tokens/${tokenOut.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dvx:text-[10px] dvx:font-bold dvx:text-amber-500 dvx:hover:text-amber-400 dvx:hover:underline dvx:transition-colors"
                  >
                    {tokenOut.ticker} ↗
                  </a>
                )}
                {tokenOut && (
                  <a
                    href={`https://e-compass.io/token/${eCompassId(tokenOut.identifier)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on e-compass"
                    className="dvx:hover:opacity-70 dvx:transition-opacity"
                  >
                    <img
                      src={eCompassLogo}
                      alt="e-compass"
                      className="dvx:h-6 dvx:w-6"
                    />
                  </a>
                )}
                {tokenOut && formatUnitPrice(tokenOutPriceUsd) && (
                  <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400">
                    {formatUnitPrice(tokenOutPriceUsd)}
                  </span>
                )}
              </div>
              {quoteLoading && activeField === "in" && (
                <span className="dvx:text-[10px] dvx:text-gray-400 dvx:animate-pulse dvx:uppercase dvx:tracking-wider dvx:flex-shrink-0">
                  {t("calculating")}
                </span>
              )}
            </div>
            {address && tokenOutBalanceDisplay && (
              <div className="dvx:flex dvx:justify-end dvx:mb-3">
                <span className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                  {t("balance")} :{" "}
                  <span className="dvx:text-amber-500">
                    {tokenOutBalanceDisplay}
                  </span>
                  {balanceOutUsd && (
                    <span className="dvx:font-normal dvx:normal-case">
                      ≈ {balanceOutUsd}
                    </span>
                  )}
                </span>
              </div>
            )}
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <TokenSelect
                value={tokenOut}
                onChange={(t) => {
                  setTokenOut(t);
                  setQuote(null);
                  setUseSplitRoute(false);
                }}
                tokens={sortedTokens}
                balances={tokenBalances}
                exclude={undefined}
                loading={tokensLoading}
              />
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amountOutDisplay}
                onChange={(e) => {
                  setActiveField("out");
                  setAmountOut(e.target.value);
                  setAmountIn("");
                  setQuote(null);
                  setUseSplitRoute(false);
                }}
                style={p.input}
                className={`dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:transition-colors ${
                  activeField === "out"
                    ? "dvx:border-amber-400 dvx:dark:border-amber-500 dvx:focus:ring-amber-500"
                    : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500"
                }`}
              />
            </div>
            {amountOutUsd && (
              <p className="dvx:mt-1 dvx:text-[10px] dvx:text-gray-400 dvx:text-right">
                ≈ {amountOutUsd}
              </p>
            )}
          </div>

          {/* ---- Wrap/Unwrap info ---- */}
          {isWrapUnwrap && !!amountIn && Number(amountIn) > 0 && (
            <div className="dvx:rounded-2xl dvx:border dvx:border-cyan-200 dvx:dark:border-cyan-800/50 dvx:bg-cyan-50 dvx:dark:bg-cyan-900/10 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-cyan-700 dvx:dark:text-cyan-400">
              {isWrap ? t("wrap_info") : t("unwrap_info")}
            </div>
          )}

          {/* ---- Quote details ---- */}
          {!isWrapUnwrap && quote && (
            <div
              style={p.quoteSection}
              className={`dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-[#ffffff] dvx:dark:bg-[#1a1a1a] dvx:px-4 dvx:py-3 dvx:space-y-2.5 dvx:text-sm dvx:transition-opacity dvx:duration-300 ${quoteLoading ? "dvx:opacity-50" : "dvx:opacity-100"}`}
            >
              <div className="dvx:flex dvx:justify-between dvx:items-center">
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {t("price_impact")}
                </span>
                <span className={`dvx:font-semibold ${impactColor}`}>
                  {priceImpactPct}%
                </span>
              </div>
              <div className="dvx:flex dvx:justify-between dvx:items-center">
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {t("hops")}
                </span>
                <span className="dvx:font-medium dvx:text-gray-900 dvx:dark:text-white">
                  {quote.hops}
                </span>
              </div>
              <div className="dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#2a2a2a]">
                <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-2">
                  <p className="dvx:text-[10px] dvx:uppercase dvx:tracking-wider dvx:font-semibold dvx:text-gray-400">
                    {t("route")}
                  </p>
                  <button
                    onClick={() => fetchQuote()}
                    disabled={quoteLoading}
                    className="dvx:flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-amber-500 dvx:transition-colors dvx:disabled:opacity-40"
                    title="Rafraîchir le prix"
                  >
                    <RefreshCw
                      className={`dvx:h-3 dvx:w-3 ${quoteLoading ? "dvx:animate-spin" : ""}`}
                    />
                    <span className="dvx:tabular-nums">{refreshCountdown}s</span>
                  </button>
                </div>
                <div className="dvx:flex dvx:items-center dvx:flex-wrap dvx:gap-0">
                  {/* First token */}
                  <span className="dvx:text-xs dvx:font-semibold dvx:px-2.5 dvx:py-1 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-800 dvx:dark:text-gray-200">
                    {tokenIn?.ticker ?? quote.route[0]?.tokenIn}
                  </span>
                  {/* Wrap connector when EGLD in (skipped for the direct stake route, which never wraps) */}
                  {isEgldIn && !isStakeRoute && (
                    <React.Fragment>
                      <div className="dvx:flex dvx:flex-col dvx:items-center dvx:mx-1">
                        <span className="dvx:text-[9px] dvx:font-bold dvx:text-gray-400">
                          wrap
                        </span>
                        <div className="dvx:flex dvx:items-center dvx:gap-0.5">
                          <div className="dvx:h-px dvx:w-4 dvx:bg-gray-300 dvx:dark:bg-gray-600" />
                          <span className="dvx:text-[10px] dvx:leading-none dvx:text-gray-400">
                            ▶
                          </span>
                        </div>
                      </div>
                      <span className="dvx:text-xs dvx:font-semibold dvx:px-2.5 dvx:py-1 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-800 dvx:dark:text-gray-200">
                        WEGLD
                      </span>
                    </React.Fragment>
                  )}
                  {quote.route.map((hop, i) => {
                    const ticker =
                      tokens.find((t) => t.identifier === hop.tokenOut)
                        ?.ticker ?? hop.tokenOut;
                    const hopImpact = hop.priceImpact
                      ? parseFloat(hop.priceImpact) * 100
                      : 0;
                    const hopHighImpact = hopImpact >= 5;
                    const dexStyle = getRouteDexStyle(hop.dexType);
                    return (
                      <React.Fragment key={i}>
                        {/* Connector */}
                        <div className="dvx:flex dvx:flex-col dvx:items-center dvx:mx-1">
                          <a
                            href={`${explorerAddress}/accounts/${hop.pair}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`dvx:text-[9px] dvx:font-bold dvx:hover:underline ${hopHighImpact ? "dvx:text-red-500" : dexStyle.label}`}
                            title={hop.pair}
                          >
                            {dexStyle.name} ↗
                          </a>
                          <div className="dvx:flex dvx:items-center dvx:gap-0.5">
                            <div
                              className={`dvx:h-px dvx:w-4 ${
                                hopHighImpact ? "dvx:bg-red-500" : dexStyle.line
                              }`}
                            />
                            <span
                              className={`dvx:text-[10px] dvx:leading-none ${
                                hopHighImpact ? "dvx:text-red-500" : dexStyle.label
                              }`}
                            >
                              {hopHighImpact ? "⚠" : "▶"}
                            </span>
                          </div>
                        </div>
                        {/* Token out */}
                        <span className="dvx:text-xs dvx:font-semibold dvx:px-2.5 dvx:py-1 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-800 dvx:dark:text-gray-200">
                          {ticker}
                        </span>
                      </React.Fragment>
                    );
                  })}
                  {isEgldOut && (
                    <React.Fragment>
                      <div className="dvx:flex dvx:flex-col dvx:items-center dvx:mx-1">
                        <span className="dvx:text-[9px] dvx:font-bold dvx:text-gray-400">
                          unwrap
                        </span>
                        <div className="dvx:flex dvx:items-center dvx:gap-0.5">
                          <div className="dvx:h-px dvx:w-4 dvx:bg-gray-300 dvx:dark:bg-gray-600" />
                          <span className="dvx:text-[10px] dvx:leading-none dvx:text-gray-400">
                            ▶
                          </span>
                        </div>
                      </div>
                      <span className="dvx:text-xs dvx:font-semibold dvx:px-2.5 dvx:py-1 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-800 dvx:dark:text-gray-200">
                        EGLD
                      </span>
                    </React.Fragment>
                  )}
                </div>
                {(() => {
                  const highImpactHops = quote.route.filter(
                    (h) =>
                      h.priceImpact && parseFloat(h.priceImpact) * 100 >= 5,
                  );
                  if (highImpactHops.length === 0) return null;
                  const hasDinoVoxHop = highImpactHops.some(
                    (h) => h.dexType === "DinoVox" || !h.dexType,
                  );
                  const firstDinoHop = highImpactHops.find(
                    (h) => h.dexType === "DinoVox" || !h.dexType,
                  );
                  return (
                    <div className="dvx:mt-2 dvx:flex dvx:flex-col dvx:gap-2 dvx:rounded-lg dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-3 dvx:py-2 dvx:text-xs dvx:text-red-600 dvx:dark:text-red-400">
                      <div className="dvx:flex dvx:items-start dvx:gap-2">
                        <span className="dvx:mt-0.5 dvx:shrink-0">⚠</span>
                        <span>{t("high_impact_warning")}</span>
                      </div>
                      {hasDinoVoxHop &&
                        firstDinoHop &&
                        (() => {
                          // Put hub token as tokenA, other as tokenB
                          const a = firstDinoHop.tokenIn;
                          const b = firstDinoHop.tokenOut;
                          const [tokenA, tokenB] =
                            hubTokenIds.has(b) && !hubTokenIds.has(a)
                              ? [b, a]
                              : [a, b];
                          return (
                            <button
                              onClick={() =>
                                goTo("add-liquidity", { tokenA, tokenB })
                              }
                              className="dvx:self-start dvx:underline dvx:font-semibold dvx:bg-transparent dvx:hover:text-red-700 dvx:dark:hover:text-red-300 dvx:transition"
                            >
                              {t("add_liquidity_cta")}
                            </button>
                          );
                        })()}
                    </div>
                  );
                })()}
              </div>

              {/* ---- Multiroute split (test feature, opt-in) ---- */}
              {splitAvailable && quote.splitComparison && (
                <div className="dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#2a2a2a]">
                  <label className="dvx:flex dvx:items-start dvx:gap-2 dvx:cursor-pointer dvx:select-none">
                    <input
                      type="checkbox"
                      checked={useSplitRoute}
                      onChange={(e) => setUseSplitRoute(e.target.checked)}
                      className="dvx:mt-0.5 dvx:accent-amber-500"
                    />
                    <span className="dvx:text-xs dvx:text-gray-600 dvx:dark:text-gray-300">
                      <span className="dvx:flex dvx:items-center dvx:gap-1">
                        <GitBranch className="dvx:h-3 dvx:w-3 dvx:flex-shrink-0 dvx:text-amber-500" />
                        <span className="dvx:font-semibold">
                          {t("multiroute_toggle", {
                            n: quote.txs?.length ?? quote.routes?.length ?? 0,
                          })}
                        </span>
                      </span>
                      <span className="dvx:mt-0.5 dvx:flex dvx:items-baseline dvx:gap-1.5 dvx:font-semibold dvx:tabular-nums dvx:text-green-600 dvx:dark:text-green-400">
                        <span>
                          +
                          {parseFloat(
                            quote.splitComparison.improvementBps ?? "0",
                          ).toFixed(2)}{" "}
                          bps
                        </span>
                        {splitMinOutDeltaDisplay && (
                          <>
                            <span className="dvx:opacity-50">·</span>
                            <span>
                              +{splitMinOutDeltaDisplay} {tokenOut?.ticker}{" "}
                              {t("multiroute_more_received")}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                  </label>

                  {useSplitRoute && (
                    <>
                      <p className="dvx:mt-2 dvx:text-[10px] dvx:text-amber-600 dvx:dark:text-amber-400">
                        {t("multiroute_partial_warning")}
                      </p>
                      {quote.routes && quote.routes.length > 0 && (
                        <div className="dvx:mt-2 dvx:space-y-1.5">
                          <p className="dvx:text-[10px] dvx:uppercase dvx:tracking-wider dvx:font-semibold dvx:text-gray-400">
                            {t("multiroute_legs_label")}
                          </p>
                          {quote.routes.map((leg, idx) => {
                            const legPct =
                              quote.amountIn && quote.amountIn !== "0"
                                ? new BigNumber(leg.amountIn)
                                    .dividedBy(quote.amountIn)
                                    .multipliedBy(100)
                                : null;
                            return (
                              <div
                                key={idx}
                                className="dvx:flex dvx:items-center dvx:flex-wrap dvx:gap-0.5 dvx:text-xs"
                              >
                                <span className="dvx:text-[10px] dvx:font-bold dvx:text-gray-400 dvx:mr-1">
                                  #{idx + 1}
                                </span>
                                {legPct && (
                                  <span className="dvx:text-[10px] dvx:font-bold dvx:text-amber-500 dvx:mr-1.5 dvx:tabular-nums">
                                    {legPct.toFixed(legPct.isGreaterThanOrEqualTo(10) ? 0 : 1)}%
                                  </span>
                                )}
                                <span className="dvx:text-xs dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-800 dvx:dark:text-gray-200">
                                  {tokenIn?.ticker ?? leg.hops[0]?.tokenIn}
                                </span>
                                {leg.hops.map((hop, i) => {
                                  const hopDexStyle = getRouteDexStyle(hop.dexType);
                                  return (
                                    <React.Fragment key={i}>
                                      <a
                                        href={`${explorerAddress}/accounts/${hop.pair}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={hop.pair}
                                        className={`dvx:mx-1 dvx:text-[9px] dvx:font-bold dvx:hover:underline ${hopDexStyle.label}`}
                                      >
                                        {hopDexStyle.name} ▶
                                      </a>
                                      <span className="dvx:text-xs dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-800 dvx:dark:text-gray-200">
                                        {tokens.find((t) => t.identifier === hop.tokenOut)
                                          ?.ticker ?? hop.tokenOut}
                                      </span>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#2a2a2a] dvx:flex dvx:items-center dvx:justify-between">
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {t("slippage")}
                </span>
                <div className="dvx:flex dvx:gap-1">
                  {SLIPPAGE_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`dvx:px-2.5 dvx:py-0.5 dvx:rounded-full dvx:text-xs dvx:font-semibold dvx:transition-colors ${
                        slippage === s
                          ? "dvx:bg-yellow-500 dvx:text-white"
                          : "dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-600 dvx:dark:text-gray-400 dvx:hover:bg-yellow-100 dvx:dark:hover:bg-yellow-900/30"
                      }`}
                    >
                      {(s * 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#2a2a2a] dvx:flex dvx:items-center dvx:justify-between">
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {t("min_received")}
                </span>
                <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                  {minAmountOutDisplay}{" "}
                  <span className="dvx:text-gray-400 dvx:text-xs">
                    {tokenOut?.ticker}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* ---- Arb details ---- */}
          {isArb && arb && !arbLoading && (
            <div className="dvx:rounded-2xl dvx:border dvx:border-green-200 dvx:dark:border-green-800/50 dvx:bg-green-50 dvx:dark:bg-green-900/10 dvx:px-4 dvx:py-3 dvx:space-y-2.5 dvx:text-sm">
              {/* Profit */}
              <div className="dvx:flex dvx:justify-between dvx:items-center">
                <span className="dvx:text-green-700 dvx:dark:text-green-400 dvx:font-semibold">
                  {t("arb_profit")}
                </span>
                <span className="dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400">
                  +{arbProfitDisplay} {tokenIn?.ticker} (
                  {(arb.profitBps / 100).toFixed(2)}%)
                </span>
              </div>

              {/* Route */}
              {arb.route && arb.route.length > 0 && (
                <div className="dvx:pt-2 dvx:border-t dvx:border-green-200 dvx:dark:border-green-800/50">
                  <p className="dvx:text-[10px] dvx:uppercase dvx:tracking-wider dvx:font-semibold dvx:text-green-700/60 dvx:dark:text-green-400/60 dvx:mb-2">
                    {t("route")}
                  </p>
                  <div className="dvx:flex dvx:items-center dvx:flex-wrap dvx:gap-0">
                    <span className="dvx:text-xs dvx:font-semibold dvx:px-2.5 dvx:py-1 dvx:rounded-full dvx:bg-green-100 dvx:dark:bg-green-900/40 dvx:text-green-800 dvx:dark:text-green-200">
                      {tokenIn?.ticker}
                    </span>
                    {arb.route.map((hop, i) => {
                      const ticker =
                        tokens.find((t) => t.identifier === hop.tokenOut)
                          ?.ticker ?? hop.tokenOut.split("-")[0];
                      const dexStyle = getRouteDexStyle(hop.dexType);
                      return (
                        <React.Fragment key={i}>
                          <div className="dvx:flex dvx:flex-col dvx:items-center dvx:mx-1">
                            <a
                              href={`${explorerAddress}/accounts/${hop.pair}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`dvx:text-[9px] dvx:font-bold dvx:hover:underline ${dexStyle.label}`}
                              title={hop.pair}
                            >
                              {dexStyle.name} ↗
                            </a>
                            <div className="dvx:flex dvx:items-center dvx:gap-0.5">
                              <div className={`dvx:h-px dvx:w-4 ${dexStyle.line}`} />
                              <span
                                className={`dvx:text-[10px] dvx:leading-none ${dexStyle.label}`}
                              >
                                ▶
                              </span>
                            </div>
                          </div>
                          <span className="dvx:text-xs dvx:font-semibold dvx:px-2.5 dvx:py-1 dvx:rounded-full dvx:bg-green-100 dvx:dark:bg-green-900/40 dvx:text-green-800 dvx:dark:text-green-200">
                            {ticker}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Slippage */}
              <div className="dvx:pt-2 dvx:border-t dvx:border-green-200 dvx:dark:border-green-800/50 dvx:flex dvx:items-center dvx:justify-between">
                <span className="dvx:text-green-700/70 dvx:dark:text-green-400/70">
                  {t("slippage")}
                </span>
                <div className="dvx:flex dvx:gap-1">
                  {SLIPPAGE_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`dvx:px-2.5 dvx:py-0.5 dvx:rounded-full dvx:text-xs dvx:font-semibold dvx:transition-colors ${
                        slippage === s
                          ? "dvx:bg-green-500 dvx:text-white"
                          : "dvx:bg-green-100 dvx:dark:bg-green-900/30 dvx:text-green-700 dvx:dark:text-green-400 dvx:hover:bg-green-200 dvx:dark:hover:bg-green-900/50"
                      }`}
                    >
                      {(s * 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- Arb loading / error ---- */}
          {isArb && arbLoading && (
            <div className="dvx:text-center dvx:text-xs dvx:text-gray-400 dvx:animate-pulse dvx:py-2">
              {t("calculating")}
            </div>
          )}

          {/* ---- Errors ---- */}
          {((!isWrapUnwrap && !isArb && quoteError) ||
            (isArb && arbError) ||
            txError) && (
            <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
              {isArb ? arbError : (quoteError ?? txError)}
            </div>
          )}

          {/* ---- Swap button ---- */}
          <button
            onClick={
              !address
                ? onConnect
                : isWrapUnwrap
                  ? handleWrapUnwrap
                  : handleSwap
            }
            disabled={!address ? !onConnect : !canSwap}
            style={
              theme === "mid"
                ? {
                    background: "linear-gradient(135deg, #BD37EC, #1F67FF)",
                    border: "none",
                    minHeight: "36px",
                  }
                : { minHeight: "36px" }
            }
            className={`dinoButton orange dvx:w-full dvx:text-base ${
              !tokenIn || !tokenOut
                ? "dvx:!bg-orange-400 dvx:dark:!bg-orange-500 dvx:!border-orange-600 dvx:dark:!border-orange-700 dvx:!text-orange-950 dvx:dark:!text-orange-950 dvx:font-bold dvx:!opacity-100 dvx:hover:!bg-orange-500 dvx:hover:!border-orange-700 dvx:dark:hover:!bg-orange-400"
                : "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed"
            }`}
          >
            {!address
              ? t("btn_connect")
              : isSending
                ? t("btn_signing")
                : !tokenIn || !tokenOut
                  ? t("btn_select_tokens")
                  : insufficientBalance
                    ? t("btn_insufficient")
                    : isArb
                      ? arbLoading
                        ? t("btn_calculating")
                        : arbError
                          ? t("btn_quote_unavailable")
                          : t("btn_arb")
                      : !activeAmountStr || Number(activeAmountStr) <= 0
                        ? t("btn_enter_amount")
                        : quoteLoading
                          ? t("btn_calculating")
                          : isWrapUnwrap
                            ? isWrap
                              ? t("btn_wrap")
                              : t("btn_unwrap")
                            : quoteError
                              ? t("btn_quote_unavailable")
                              : t("btn_swap")}
          </button>
        </div>
      </Card>
      {showNpmCta && (
        <p className="dvx:text-center dvx:text-[11px] dvx:text-gray-400">
          <a
            href="https://www.npmjs.com/package/@dinovox/mx-swap-widget"
            target="_blank"
            rel="noopener noreferrer"
            className="dvx:hover:text-amber-500 dvx:hover:underline dvx:transition-colors"
          >
            {t("npm_cta")}
          </a>
        </p>
      )}
    </div>
  );
};
