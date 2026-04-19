import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useWidgetNavigate } from "../hooks/useWidgetNavigate";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { ArrowUpDown } from "lucide-react";
import { useGetAccount } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetAccountInfo } from "@multiversx/sdk-dapp/out/react/account/useGetAccountInfo";
import { useGetNetworkConfig } from "@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { Card } from "../ui/Card";
import { TokenSelect } from "../ui/TokenSelect";
import bigToHex from "../helpers/bigToHex";
import BigNumber from "bignumber.js";
import { useSwapConfig } from "../context/SwapConfigContext";
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

const strToHex = (s: string) => Buffer.from(s, "utf8").toString("hex");

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
    wrapContract: WRAP_CONTRACT,
    wegldIdentifier: wegld_identifier,
    routes,
    theme,
  } = useSwapConfig();
  const p = getThemePalette(theme);
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const { address } = useGetAccount();
  const { account: accountInfo } = useGetAccountInfo();
  const { network } = useGetNetworkConfig();
  const [searchParams, setSearchParams] = useWidgetSearchParams();
  const navigate = useWidgetNavigate();

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

  /* ---- Balance tokenIn ---- */
  const [balanceLoading, setBalanceLoading] = useState(false);
  const isEgldIn = tokenIn?.identifier === "EGLD";

  const tokenInBalances = useGetUserESDT(
    !isEgldIn ? tokenIn?.identifier : undefined,
    { enabled: !!tokenIn && !isEgldIn && !!address },
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
    ? (accountInfo?.balance ?? null)
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
    { enabled: !!tokenOut && !isEgldOut_balance && !!address },
  );
  const tokenOutBalanceRaw: string | null = isEgldOut_balance
    ? (accountInfo?.balance ?? null)
    : (tokenOutBalances?.[0]?.balance ?? null);
  const tokenOutBalanceDisplay =
    tokenOutBalanceRaw && tokenOut
      ? new BigNumber(tokenOutBalanceRaw)
          .shiftedBy(-tokenOut.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

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
        }>;
      }>(`${apiUrl}/tokens`),
      axios
        .get(`${apiUrl}/tokens/hub`)
        .catch(() => ({ data: { hubTokens: [] } })),
    ])
      .then(([tokensRes, hubRes]) => {
        const list = (tokensRes.data.tokens || []).filter((t) => t.identifier);
        const wegld = list.find((t) => t.ticker === "WEGLD");
        setTokens([
          { ...EGLD_TOKEN, logoUrl: wegld?.logoUrl ?? null },
          ...list,
        ]);
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

    const fromId = searchParams.get("from");
    const toId = searchParams.get("to");

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
  }, [tokenIn, tokenOut, amountIn, amountOut, activeField, isArb, isWrapUnwrap, slippage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = setTimeout(fetchQuote, 300);
    return () => {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    };
  }, [fetchQuote]);

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
  };

  /* ---------- Execute swap / arb ---------- */
  const handleSwap = async () => {
    if (!tokenIn || !address) return;
    if (isArb && !arb) return;
    if (!isArb && !quote) return;
    setTxError(null);
    setIsSending(true);

    try {
      const { tx } = isArb ? arb! : quote!;

      const allowedReceivers = [routerAddress, aggregatorAddress].map((a) =>
        a.toLowerCase(),
      );
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
        chainID: network.chainId,
        version: 1,
      });

      await signAndSendTransactions({
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("processing"),
          errorMessage: t("error_tx"),
          successMessage: t("success_tx"),
        },
      });

      // Reset
      setAmountIn("");
      setAmountOut("");
      setActiveField("in");
      setQuote(null);
      setArb(null);
    } catch (err: any) {
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
      ? amountOut  // user is typing here
      : isArb && arb
        ? new BigNumber(arb.amountOut)
            .shiftedBy(-(tokenIn?.decimals ?? 18))
            .toFixed(6, BigNumber.ROUND_DOWN)
        : quote
          ? new BigNumber(quote.amountOut)
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

  // Minimum received: slippage on quote.amountOut (already net of all fees)
  const minAmountOutDisplay =
    quote && !isWrapUnwrap
      ? new BigNumber(applySlippage(quote.amountOut, slippage).toString())
          .shiftedBy(-(tokenOut?.decimals ?? 18))
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

  const priceImpactPct = quote
    ? (parseFloat(quote.priceImpact) * 100).toFixed(2)
    : null;

  const impactColor = priceImpactPct
    ? parseFloat(priceImpactPct) < 1
      ? "text-green-600 dark:text-green-400"
      : parseFloat(priceImpactPct) < 3
        ? "text-amber-500 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"
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

  /* ---------- Execute wrap / unwrap ---------- */
  const handleWrapUnwrap = async () => {
    const wrapAmount = activeField === "out" ? amountOut : amountIn;
    if (!tokenIn || !address || !wrapAmount || Number(wrapAmount) <= 0) return;
    setTxError(null);
    setIsSending(true);

    try {
      const senderAddress = new Address(address);
      const amountRaw = BigInt(
        new BigNumber(wrapAmount).shiftedBy(18).toFixed(0, BigNumber.ROUND_DOWN),
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
        chainID: network.chainId,
        version: 1,
      });

      await signAndSendTransactions({
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
    } catch (err: any) {
      setTxError(err?.message ?? "Erreur");
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="flex flex-col w-full gap-6">
      <Card
        className="border-2 border-cyan-500/20"
        title={
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔄</span>
              <span className="text-lg font-black tracking-tight">Swap</span>
            </div>
            {/* Tabs: Swap / Liquidité */}
            <div style={p.tabBar} className="flex gap-1.5 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full xs:w-auto">
              <button style={p.activeTab} className="flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all">
                {t("tab_swap")}
              </button>
              <button
                onClick={() => navigate(routes.liquidity)}
                className="flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5"
              >
                {t("tab_liquidity")}
              </button>
            </div>
          </div>
        }
        description={t("card_description")}
      >
        <div className="space-y-2 mt-4">
          {/* ---- Token In ---- */}
          <div style={p.inner} className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {t("you_send")}
                </p>
                {tokenIn && (
                  <a
                    href={`${network.explorerAddress}/tokens/${tokenIn.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors"
                  >
                    {tokenIn.ticker} ↗
                  </a>
                )}
              </div>
              {quoteLoading && activeField === "out" && (
                <span className="text-[10px] text-gray-400 animate-pulse uppercase tracking-wider">
                  {t("calculating")}
                </span>
              )}
              {address && tokenInBalanceDisplay && (
                <button
                  onClick={handleMax}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors"
                >
                  <span className="text-gray-400">{t("balance")} :</span>
                  {tokenInBalanceDisplay}
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                    MAX
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <TokenSelect
                value={tokenIn}
                onChange={(t) => {
                  setTokenIn(t);
                  setQuote(null);
                }}
                tokens={tokens}
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
                }}
                style={p.input}
                className={`w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                  insufficientBalance
                    ? "border-red-400 dark:border-red-500 focus:ring-red-400"
                    : activeField === "in"
                      ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500"
                      : "border-gray-200 dark:border-[#444] focus:ring-amber-500"
                }`}
              />
            </div>
            {insufficientBalance && (
              <p className="mt-2 text-[10px] font-semibold text-red-500 text-right">
                {t("insufficient_balance")}
              </p>
            )}
          </div>

          {/* ---- Invert button ---- */}
          <div className="flex justify-center -my-0.5 relative z-10">
            <button
              onClick={invertTokens}
              style={p.invertBtn}
              className="rounded-full p-2 bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <ArrowUpDown className="h-4 w-4 text-amber-500" />
            </button>
          </div>

          {/* ---- Token Out ---- */}
          <div style={p.inner} className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {t("you_receive")}
                </p>
                {tokenOut && (
                  <a
                    href={`${network.explorerAddress}/tokens/${tokenOut.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors"
                  >
                    {tokenOut.ticker} ↗
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                {quoteLoading && activeField === "in" && (
                  <span className="text-[10px] text-gray-400 animate-pulse uppercase tracking-wider">
                    {t("calculating")}
                  </span>
                )}
                {address && tokenOutBalanceDisplay && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {t("balance")} :{" "}
                    <span className="text-amber-500">
                      {tokenOutBalanceDisplay}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TokenSelect
                value={tokenOut}
                onChange={(t) => {
                  setTokenOut(t);
                  setQuote(null);
                }}
                tokens={tokens}
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
                }}
                style={p.input}
                className={`w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                  activeField === "out"
                    ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500"
                    : "border-gray-200 dark:border-[#444] focus:ring-amber-500"
                }`}
              />
            </div>
          </div>

          {/* ---- Wrap/Unwrap info ---- */}
          {isWrapUnwrap && !!amountIn && Number(amountIn) > 0 && (
            <div className="rounded-2xl border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-900/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-400">
              {isWrap ? t("wrap_info") : t("unwrap_info")}
            </div>
          )}

          {/* ---- Quote details ---- */}
          {!isWrapUnwrap && quote && !quoteLoading && (
            <div style={p.quoteSection} className="rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] px-4 py-3 space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("price_impact")}
                </span>
                <span className={`font-semibold ${impactColor}`}>
                  {priceImpactPct}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("hops")}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {quote.hops}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-[#2a2a2a]">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
                  {t("route")}
                </p>
                <div className="flex items-center flex-wrap gap-0">
                  {/* First token */}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200">
                    {tokenIn?.ticker ?? quote.route[0]?.tokenIn}
                  </span>
                  {/* Wrap connector when EGLD in */}
                  {isEgldIn && (
                    <React.Fragment>
                      <div className="flex flex-col items-center mx-1">
                        <span className="text-[9px] font-bold text-gray-400">
                          wrap
                        </span>
                        <div className="flex items-center gap-0.5">
                          <div className="h-px w-4 bg-gray-300 dark:bg-gray-600" />
                          <span className="text-[10px] leading-none text-gray-400">
                            ▶
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200">
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
                    // Color per DEX
                    const dexStyle =
                      hop.dexType === "XExchange"
                        ? {
                            line: "bg-blue-400 dark:bg-blue-500",
                            label: "text-blue-600 dark:text-blue-400",
                            name: "XExchange",
                          }
                        : hop.dexType === "JExchange"
                          ? {
                              line: "bg-green-400 dark:bg-green-500",
                              label: "text-green-600 dark:text-green-400",
                              name: "JExchange",
                            }
                          : {
                              line: "bg-amber-400 dark:bg-amber-500",
                              label: "text-amber-600 dark:text-amber-400",
                              name: "DinoVox",
                            };
                    return (
                      <React.Fragment key={i}>
                        {/* Connector */}
                        <div className="flex flex-col items-center mx-1">
                          <a
                            href={`${network.explorerAddress}/accounts/${hop.pair}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[9px] font-bold hover:underline ${hopHighImpact ? "text-red-500" : dexStyle.label}`}
                            title={hop.pair}
                          >
                            {dexStyle.name} ↗
                          </a>
                          <div className="flex items-center gap-0.5">
                            <div
                              className={`h-px w-4 ${
                                hopHighImpact ? "bg-red-500" : dexStyle.line
                              }`}
                            />
                            <span
                              className={`text-[10px] leading-none ${
                                hopHighImpact ? "text-red-500" : dexStyle.label
                              }`}
                            >
                              {hopHighImpact ? "⚠" : "▶"}
                            </span>
                          </div>
                        </div>
                        {/* Token out */}
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200">
                          {ticker}
                        </span>
                      </React.Fragment>
                    );
                  })}
                  {isEgldOut && (
                    <React.Fragment>
                      <div className="flex flex-col items-center mx-1">
                        <span className="text-[9px] font-bold text-gray-400">
                          unwrap
                        </span>
                        <div className="flex items-center gap-0.5">
                          <div className="h-px w-4 bg-gray-300 dark:bg-gray-600" />
                          <span className="text-[10px] leading-none text-gray-400">
                            ▶
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200">
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
                    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">⚠</span>
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
                                navigate(
                                  `${routes.addLiquidity}?tokenA=${tokenA}&tokenB=${tokenB}`,
                                )
                              }
                              className="self-start underline font-semibold hover:text-red-700 dark:hover:text-red-300 transition"
                            >
                              {t("add_liquidity_cta")}
                            </button>
                          );
                        })()}
                    </div>
                  );
                })()}
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("slippage")}
                </span>
                <div className="flex gap-1">
                  {SLIPPAGE_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        slippage === s
                          ? "bg-yellow-500 text-white"
                          : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                      }`}
                    >
                      {(s * 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("min_received")}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {minAmountOutDisplay}{" "}
                  <span className="text-gray-400 text-xs">
                    {tokenOut?.ticker}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* ---- Arb details ---- */}
          {isArb && arb && !arbLoading && (
            <div className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 px-4 py-3 space-y-2.5 text-sm">
              {/* Profit */}
              <div className="flex justify-between items-center">
                <span className="text-green-700 dark:text-green-400 font-semibold">
                  {t("arb_profit")}
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  +{arbProfitDisplay} {tokenIn?.ticker} (
                  {(arb.profitBps / 100).toFixed(2)}%)
                </span>
              </div>

              {/* Route */}
              {arb.route && arb.route.length > 0 && (
                <div className="pt-2 border-t border-green-200 dark:border-green-800/50">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-green-700/60 dark:text-green-400/60 mb-2">
                    {t("route")}
                  </p>
                  <div className="flex items-center flex-wrap gap-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                      {tokenIn?.ticker}
                    </span>
                    {arb.route.map((hop, i) => {
                      const ticker =
                        tokens.find((t) => t.identifier === hop.tokenOut)
                          ?.ticker ?? hop.tokenOut.split("-")[0];
                      const dexStyle =
                        hop.dexType === "XExchange"
                          ? {
                              line: "bg-blue-400",
                              label: "text-blue-600 dark:text-blue-400",
                              name: "XExchange",
                            }
                          : hop.dexType === "JExchange"
                            ? {
                                line: "bg-purple-400",
                                label: "text-purple-600 dark:text-purple-400",
                                name: "JExchange",
                              }
                            : {
                                line: "bg-green-400",
                                label: "text-green-600 dark:text-green-400",
                                name: "DinoVox",
                              };
                      return (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center mx-1">
                            <a
                              href={`${network.explorerAddress}/accounts/${hop.pair}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[9px] font-bold hover:underline ${dexStyle.label}`}
                              title={hop.pair}
                            >
                              {dexStyle.name} ↗
                            </a>
                            <div className="flex items-center gap-0.5">
                              <div className={`h-px w-4 ${dexStyle.line}`} />
                              <span
                                className={`text-[10px] leading-none ${dexStyle.label}`}
                              >
                                ▶
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                            {ticker}
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Slippage */}
              <div className="pt-2 border-t border-green-200 dark:border-green-800/50 flex items-center justify-between">
                <span className="text-green-700/70 dark:text-green-400/70">
                  {t("slippage")}
                </span>
                <div className="flex gap-1">
                  {SLIPPAGE_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                        slippage === s
                          ? "bg-green-500 text-white"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
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
            <div className="text-center text-xs text-gray-400 animate-pulse py-2">
              {t("calculating")}
            </div>
          )}

          {/* ---- Errors ---- */}
          {((!isWrapUnwrap && !isArb && quoteError) ||
            (isArb && arbError) ||
            txError) && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {isArb ? arbError : (quoteError ?? txError)}
            </div>
          )}

          {/* ---- Swap button ---- */}
          <button
            onClick={isWrapUnwrap ? handleWrapUnwrap : handleSwap}
            disabled={!canSwap}
            style={theme === 'mid' ? { background: 'linear-gradient(135deg, #BD37EC, #1F67FF)', border: 'none' } : {}}
            className={`dinoButton orange w-full !py-3 text-base ${
              !tokenIn || !tokenOut
                ? "!bg-orange-400 dark:!bg-orange-500 !border-orange-600 dark:!border-orange-700 !text-orange-950 dark:!text-orange-950 font-bold !opacity-100 hover:!bg-orange-500 hover:!border-orange-700 dark:hover:!bg-orange-400"
                : "disabled:opacity-40 disabled:cursor-not-allowed"
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
                      : !amountIn || Number(amountIn) <= 0
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
    </div>
  );
};
