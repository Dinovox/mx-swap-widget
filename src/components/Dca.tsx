import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { Card } from "../ui/Card";
import { SectionTabs } from "../ui/NavTabs";
import { TokenSelect, type TokenBalanceInfo } from "../ui/TokenSelect";
import bigToHex from "../helpers/bigToHex";
import {
  getDcaQuote,
  getDcaMinOrderConfig,
  type DcaMinOrderConfig,
} from "../helpers/getDcaQuote";
import strToHex from "../helpers/strToHex";
import BigNumber from "bignumber.js";
import { useSwapConfig } from "../context/SwapConfigContext";
import { getThemePalette } from "../ui/themePalette";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import type { SwapToken, DcaOrder, DcaExecution } from "../types";

type TFn = (key: string, options?: Record<string, unknown>) => string;

const EGLD_TOKEN: SwapToken = {
  identifier: "EGLD",
  ticker: "EGLD",
  poolCount: 0,
  decimals: 18,
  logoUrl: null,
};

type FrequencyUnit = "minutes" | "hours" | "days" | "weeks";
const UNIT_SECONDS: Record<FrequencyUnit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
};
// Floor enforced on-chain too (dca-escrow::DEFAULT_MIN_INTERVAL_SECONDS) — kept
// here so the form can flag it before the user even submits.
const MIN_INTERVAL_SECONDS = 60;

// createOrder does up to: wrapEgld sync_call (EGLD in) + hasRoute view sync_call
// + an optional getBestQuote sync_call (only if the owner configured a minimum
// order reference). Mainnet measurement (ESDT in, tx 0c0a1451…): ~8.9M used
// (8.66M SC + base) — the previous 50M limit was charged in full ("too much gas
// provided", no refund). ~1.7x margin on the ESDT path; EGLD in adds the
// wrapEgld sync_call on top (not measured yet), hence the extra.
const CREATE_ORDER_GAS_LIMIT = 25_000_000;
const CREATE_ORDER_EGLD_EXTRA_GAS = 5_000_000;
// cancelOrder does at most one unwrapEgld sync_call (only if deposited as EGLD).
const CANCEL_ORDER_GAS_LIMIT = 20_000_000;

// Price range shortcuts: min/max set this far below/above the live quote.
const RANGE_SHORTCUT_PCT = 10;

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export const Dca = () => {
  const {
    apiUrl,
    dcaEscrowAddress,
    theme,
    onConnect,
    whitelist,
    blacklist,
    address,
    networkApiAddress,
    chainId,
    onSignTransactions,
    explorerAddress,
  } = useSwapConfig();
  const p = getThemePalette(theme);
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");

  /* ---- Token list (mirrors Swap.tsx) ---- */
  const [tokens, setTokens] = useState<SwapToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);
    // /dca/tokens — NOT /tokens: only tokens that appear in at least one
    // whitelisted dca-router pair are offered here. The full DEX token list
    // (/tokens) includes hundreds of tokens with no DCA route at all —
    // picking one would just revert on createOrder (hasRoute() check).
    axios
      .get<{ tokens: SwapToken[] }>(`${apiUrl}/dca/tokens`)
      .then((res) => {
        const whiteSet =
          whitelist && whitelist.length > 0 ? new Set(whitelist) : null;
        const blackSet =
          blacklist && blacklist.length > 0 ? new Set(blacklist) : null;
        const list = (res.data.tokens || [])
          .filter((tk) => tk.identifier)
          .filter((tk) => !whiteSet || whiteSet.has(tk.identifier))
          .filter((tk) => !blackSet || !blackSet.has(tk.identifier));
        // EGLD itself never comes back from /dca/tokens (it's not a real ESDT
        // routed through a pair) — offered as token_in only, and only when
        // WEGLD is actually part of the routable set (createOrder wraps
        // EGLD -> WEGLD internally, so without a WEGLD route it'd be a dead end).
        const wegld = list.find((tk) => tk.ticker === "WEGLD");
        const includeEgld =
          !!wegld &&
          (!whiteSet || whiteSet.has("EGLD")) &&
          (!blackSet || !blackSet.has("EGLD"));
        const egld = {
          ...EGLD_TOKEN,
          logoUrl: wegld?.logoUrl ?? null,
          priceUsd: wegld?.priceUsd ?? null,
        };
        setTokens(includeEgld ? [egld, ...list] : list);
      })
      .catch(() => setTokens([]))
      .finally(() => setTokensLoading(false));
  }, [apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Wallet balances (mirrors Swap.tsx — MAX button + selector sorting) ---- */
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

  const allWalletTokensRaw = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
    refreshKey: balanceRefreshKey,
  });
  const walletBalanceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of allWalletTokensRaw as Array<{
      identifier?: string;
      balance?: string;
    }>) {
      if (w?.identifier && w?.balance) map.set(w.identifier, w.balance);
    }
    return map;
  }, [allWalletTokensRaw]);
  const walletPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of allWalletTokensRaw as Array<{
      identifier?: string;
      price?: number;
    }>) {
      if (w?.identifier && w?.price != null) map.set(w.identifier, w.price);
    }
    return map;
  }, [allWalletTokensRaw]);
  const tokenBalances = useMemo(() => {
    const map: Record<string, TokenBalanceInfo> = {};
    for (const tok of tokens) {
      const raw =
        tok.identifier === "EGLD"
          ? egldBalance
          : walletBalanceMap.get(tok.identifier);
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

  // The synthetic "EGLD" entry is valid on both sides: as token_in createOrder
  // wraps it to WEGLD itself; as token_out the order targets WEGLD with
  // unwrap_to_egld=true (dca-escrow V7) so each execution delivers native EGLD.
  // Either way EGLD and WEGLD are the same underlying token for the router, so
  // picking one on the "in" side excludes both on the "out" side.
  const wegldId = useMemo(
    () => tokens.find((tk) => tk.ticker === "WEGLD")?.identifier ?? null,
    [tokens],
  );
  const toRouterToken = (id: string | undefined) =>
    id === "EGLD" ? (wegldId ?? undefined) : id;

  /* ---- Form state ---- */
  const [tokenIn, setTokenIn] = useState<SwapToken | null>(null);
  const [tokenOut, setTokenOut] = useState<SwapToken | null>(null);
  const [amountPerExecution, setAmountPerExecution] = useState("");
  const [frequencyValue, setFrequencyValue] = useState("1");
  const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit>("days");
  const [numberOfOrders, setNumberOfOrders] = useState("10");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minReceived, setMinReceived] = useState("");
  const [maxReceived, setMaxReceived] = useState("");
  // Optional createOrder receiver (dca-escrow: OptionalValue<ManagedAddress>,
  // empty = the order owner gets the swap output).
  const [receiver, setReceiver] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const isEgldIn = tokenIn?.identifier === "EGLD";
  const isEgldOut = tokenOut?.identifier === "EGLD";
  const tokenInRouterId = toRouterToken(tokenIn?.identifier);
  const tokenOutRouterId = toRouterToken(tokenOut?.identifier);
  const tokensForOut = useMemo(
    () =>
      sortedTokens.filter(
        (tk) =>
          !tokenInRouterId || toRouterToken(tk.identifier) !== tokenInRouterId,
      ),
    [sortedTokens, tokenInRouterId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Switching token_in onto token_out's underlying (e.g. EGLD in while EGLD/WEGLD
  // is selected out) would leave an impossible pair selected — clear it.
  // Preset from ?tokenIn=&tokenOut= (Pools "DCA" shortcut), once, as soon as
  // the DCA token list is loaded. Unknown identifiers are ignored.
  const [searchParams] = useWidgetSearchParams();
  const presetDone = React.useRef(false);
  useEffect(() => {
    if (presetDone.current || tokens.length === 0) return;
    presetDone.current = true;
    const qIn = searchParams.get("tokenIn");
    const qOut = searchParams.get("tokenOut");
    const foundIn = qIn ? tokens.find((tk) => tk.identifier === qIn) : undefined;
    const foundOut = qOut ? tokens.find((tk) => tk.identifier === qOut) : undefined;
    if (foundIn) setTokenIn(foundIn);
    if (foundOut) setTokenOut(foundOut);
  }, [tokens]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tokenInRouterId && tokenOutRouterId === tokenInRouterId)
      setTokenOut(null);
  }, [tokenInRouterId, tokenOutRouterId]);
  const tokenInBalances = useGetUserESDT(
    !isEgldIn ? tokenIn?.identifier : undefined,
    {
      enabled: !!tokenIn && !isEgldIn && !!address,
      address,
      networkApiAddress,
      refreshKey: balanceRefreshKey,
    },
  );
  const tokenInBalanceRaw: string | null = isEgldIn
    ? egldBalance
    : (tokenInBalances?.[0]?.balance ?? null);
  const tokenInBalanceDisplay =
    tokenInBalanceRaw && tokenIn
      ? new BigNumber(tokenInBalanceRaw)
          .shiftedBy(-tokenIn.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

  const intervalSeconds = Math.round(
    (Number(frequencyValue) || 0) * UNIT_SECONDS[frequencyUnit],
  );
  const nOrders = Math.max(0, Math.floor(Number(numberOfOrders) || 0));
  const intervalTooShort =
    intervalSeconds > 0 && intervalSeconds < MIN_INTERVAL_SECONDS;

  const amountPerExecutionRaw = useMemo(() => {
    if (!tokenIn || !amountPerExecution || Number(amountPerExecution) <= 0)
      return null;
    try {
      return BigInt(
        new BigNumber(amountPerExecution)
          .shiftedBy(tokenIn.decimals)
          .toFixed(0, BigNumber.ROUND_DOWN),
      );
    } catch {
      return null;
    }
  }, [tokenIn, amountPerExecution]);

  const totalDepositRaw =
    amountPerExecutionRaw != null && nOrders > 0
      ? amountPerExecutionRaw * BigInt(nOrders)
      : null;
  const totalDepositDisplay =
    totalDepositRaw != null && tokenIn
      ? new BigNumber(totalDepositRaw.toString())
          .shiftedBy(-tokenIn.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;

  const insufficientBalance =
    !!tokenInBalanceRaw && totalDepositRaw != null
      ? new BigNumber(totalDepositRaw.toString()).isGreaterThan(
          tokenInBalanceRaw,
        )
      : false;

  const durationLabel =
    nOrders > 0 && intervalSeconds > 0
      ? formatDuration(intervalSeconds * nOrders, t)
      : null;

  const canSubmit =
    !!tokenIn &&
    !!tokenOut &&
    !!tokenOutRouterId &&
    tokenInRouterId !== tokenOutRouterId &&
    amountPerExecutionRaw != null &&
    nOrders > 0 &&
    intervalSeconds >= MIN_INTERVAL_SECONDS &&
    !insufficientBalance;

  /* ---- Live quote: estimated output of the first execution + price range shortcuts ---- */
  const [quoteOutRaw, setQuoteOutRaw] = useState<bigint | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  // getBestQuote answered with an empty value: dca-router has no route between
  // these two tokens — createOrder would revert (hasRoute), so block it here.
  // A failed query (network error) does NOT set this: unknown ≠ no route.
  const [quoteNoRoute, setQuoteNoRoute] = useState(false);
  const tokenInId = tokenIn?.identifier;
  // EGLD out is quoted as WEGLD (the unwrap happens after the swap, 1:1).
  const tokenOutId = tokenOutRouterId;
  useEffect(() => {
    setQuoteOutRaw(null);
    setQuoteNoRoute(false);
    if (
      !networkApiAddress ||
      !dcaEscrowAddress ||
      !tokenInId ||
      !tokenOutId ||
      tokenInId === tokenOutId ||
      amountPerExecutionRaw == null
    ) {
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      getDcaQuote(
        networkApiAddress,
        dcaEscrowAddress,
        tokenInId,
        tokenOutId,
        amountPerExecutionRaw,
      )
        .then((out) => {
          if (cancelled) return;
          setQuoteOutRaw(out > 0n ? out : null);
          setQuoteNoRoute(out === 0n);
        })
        .catch(() => {
          if (!cancelled) setQuoteOutRaw(null);
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    networkApiAddress,
    dcaEscrowAddress,
    tokenInId,
    tokenOutId,
    amountPerExecutionRaw,
  ]);

  const quoteOut =
    quoteOutRaw != null && tokenOut
      ? new BigNumber(quoteOutRaw.toString()).shiftedBy(-tokenOut.decimals)
      : null;
  const applyRangeShortcut = (field: "min" | "max") => {
    if (!quoteOut) return;
    const factor =
      field === "min"
        ? 1 - RANGE_SHORTCUT_PCT / 100
        : 1 + RANGE_SHORTCUT_PCT / 100;
    const value = quoteOut
      .multipliedBy(factor)
      .precision(6, field === "min" ? BigNumber.ROUND_DOWN : BigNumber.ROUND_UP)
      .toFixed();
    if (field === "min") setMinReceived(value);
    else setMaxReceived(value);
  };
  // Same comparison as dca-escrow::executeOrder (0/empty = bound disabled).
  const quoteBelowMin =
    !!quoteOut && Number(minReceived) > 0 && quoteOut.isLessThan(minReceived);
  const quoteAboveMax =
    !!quoteOut &&
    Number(maxReceived) > 0 &&
    quoteOut.isGreaterThan(maxReceived);

  /* ---- Minimum order value / self-funded gas reserve (dca-escrow V5) ---- */
  // Read directly from the escrow, same rationale/technique as getDcaQuote
  // above — this gates whether createOrder will revert, so it can't depend
  // on a backend round-trip being up to date.
  const [minOrderConfig, setMinOrderConfig] =
    useState<DcaMinOrderConfig | null>(null);
  useEffect(() => {
    if (!networkApiAddress || !dcaEscrowAddress) return;
    getDcaMinOrderConfig(networkApiAddress, dcaEscrowAddress)
      .then(setMinOrderConfig)
      .catch(() => setMinOrderConfig(null));
  }, [networkApiAddress, dcaEscrowAddress]);

  // amount_per_execution converted into minOrderConfig's reference token —
  // exactly what createOrder itself computes server-side before comparing to
  // minOrderAmount. No conversion needed when token_in already IS the
  // reference token (same shortcut as the contract).
  const [amountInReferenceRaw, setAmountInReferenceRaw] = useState<
    bigint | null
  >(null);
  const minRefToken = minOrderConfig?.minOrderReferenceToken ?? null;
  useEffect(() => {
    setAmountInReferenceRaw(null);
    if (
      !minRefToken ||
      !networkApiAddress ||
      !dcaEscrowAddress ||
      !tokenInId ||
      amountPerExecutionRaw == null
    )
      return;
    if (tokenInId === minRefToken) {
      setAmountInReferenceRaw(amountPerExecutionRaw);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      getDcaQuote(
        networkApiAddress,
        dcaEscrowAddress,
        tokenInId,
        minRefToken,
        amountPerExecutionRaw,
      )
        .then((out) => {
          if (!cancelled) setAmountInReferenceRaw(out);
        })
        .catch(() => {
          if (!cancelled) setAmountInReferenceRaw(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    minRefToken,
    networkApiAddress,
    dcaEscrowAddress,
    tokenInId,
    amountPerExecutionRaw,
  ]);

  // Mirrors dca-escrow::create_order exactly: below minOrderAmount + a gas
  // rate configured -> self-funded gas reserve required (allowed) ; below +
  // no rate configured -> hard reject, same as V3/V4 (no way around it).
  const belowMinOrderValue =
    !!minOrderConfig?.minOrderReferenceToken &&
    amountInReferenceRaw != null &&
    amountInReferenceRaw < minOrderConfig.minOrderAmount;
  const gasFeeMechanismAvailable =
    !!minOrderConfig && minOrderConfig.gasFeePerExecution > 0n;
  const needsGasFee = belowMinOrderValue && gasFeeMechanismAvailable;
  const hardBlockedBelowMinimum =
    belowMinOrderValue && !gasFeeMechanismAvailable;
  const gasFeeTotalRaw =
    needsGasFee && minOrderConfig
      ? minOrderConfig.gasFeePerExecution * BigInt(nOrders)
      : 0n;
  const gasFeeTotalDisplay =
    gasFeeTotalRaw > 0n
      ? new BigNumber(gasFeeTotalRaw.toString())
          .shiftedBy(-18)
          .toFixed(6, BigNumber.ROUND_UP)
      : null;
  const gasFeePerExecutionDisplay =
    needsGasFee && minOrderConfig
      ? new BigNumber(minOrderConfig.gasFeePerExecution.toString())
          .shiftedBy(-18)
          .toFixed()
      : null;

  const receiverTrimmed = receiver.trim();
  const receiverInvalid = useMemo(() => {
    if (!receiverTrimmed) return false;
    try {
      Address.newFromBech32(receiverTrimmed);
      return false;
    } catch {
      return true;
    }
  }, [receiverTrimmed]);

  const canSubmitFinal =
    canSubmit && !hardBlockedBelowMinimum && !quoteNoRoute && !receiverInvalid;

  // Same ⇅ as Swap. The amount is re-expressed in the new token_in using the
  // live quote when we have one (same value per execution), otherwise cleared;
  // min/max are token_out amounts, meaningless after the flip → reset.
  const invertTokens = () => {
    const nextIn = tokenOut;
    const nextOut = tokenIn;
    setTokenIn(nextIn);
    setTokenOut(nextOut);
    setAmountPerExecution(
      quoteOut && nextIn ? quoteOut.decimalPlaces(nextIn.decimals, BigNumber.ROUND_DOWN).toFixed() : "",
    );
    setMinReceived("");
    setMaxReceived("");
  };

  const handleMax = () => {
    if (!tokenInBalanceRaw || !tokenIn || nOrders <= 0) return;
    const perExec = new BigNumber(tokenInBalanceRaw)
      .dividedBy(nOrders)
      .integerValue(BigNumber.ROUND_DOWN);
    setAmountPerExecution(
      perExec
        .shiftedBy(-tokenIn.decimals)
        .toFixed(tokenIn.decimals, BigNumber.ROUND_DOWN),
    );
  };

  /* ---- My orders ---- */
  const [orders, setOrders] = useState<DcaOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiUrl || !address) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    axios
      .get<{ orders: DcaOrder[] }>(`${apiUrl}/dca/orders`, {
        params: { address },
      })
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [apiUrl, address, ordersReloadKey]);

  /* ---------- Create order ---------- */
  const handleCreate = async () => {
    if (
      !canSubmitFinal ||
      !tokenIn ||
      !tokenOut ||
      !address ||
      !dcaEscrowAddress
    )
      return;
    if (amountPerExecutionRaw == null || totalDepositRaw == null) return;
    setTxError(null);
    setIsSending(true);

    try {
      const senderAddress = new Address(address);
      const escrowAddress = new Address(dcaEscrowAddress);

      const minOutRaw = minReceived
        ? BigInt(
            new BigNumber(minReceived)
              .shiftedBy(tokenOut.decimals)
              .toFixed(0, BigNumber.ROUND_DOWN),
          )
        : 0n;
      const maxOutRaw = maxReceived
        ? BigInt(
            new BigNumber(maxReceived)
              .shiftedBy(tokenOut.decimals)
              .toFixed(0, BigNumber.ROUND_DOWN),
          )
        : 0n;

      const createArgs = [
        // EGLD out = WEGLD order + unwrap_to_egld (tokenOutRouterId is WEGLD then).
        strToHex(tokenOutRouterId!),
        bigToHex(amountPerExecutionRaw),
        bigToHex(BigInt(intervalSeconds)),
        bigToHex(BigInt(nOrders)),
        bigToHex(minOutRaw),
        bigToHex(maxOutRaw),
        // Trailing optionals, in contract order: unwrap_to_egld (bool), then
        // receiver (always LAST). Both omitted when unset; setting receiver
        // alone requires an explicit false ("" = top-encoded bool false) for
        // unwrap_to_egld in front of it.
        ...(isEgldOut || receiverTrimmed ? [isEgldOut ? "01" : ""] : []),
        ...(receiverTrimmed
          ? [Address.newFromBech32(receiverTrimmed).toHex()]
          : []),
      ];

      let txData: string;
      let value: bigint;
      let receiver: Address;
      if (isEgldIn) {
        // #[payable("*")] on the contract side — a single native EGLD value
        // covers both the principal (wrapped to WEGLD internally) AND the gas
        // reserve when needed (dca-escrow splits them itself, cf. V5): both
        // legs are the same token here, no multi-transfer required.
        txData = ["createOrder", ...createArgs].join("@");
        value = totalDepositRaw + gasFeeTotalRaw;
        receiver = escrowAddress;
      } else if (needsGasFee) {
        // ESDT principal + a SEPARATE native EGLD gas reserve in the same
        // call — a plain ESDTTransfer only carries one token, so this needs
        // MultiESDTNFTTransfer with the protocol's EGLD-000000 pseudo-token
        // for the EGLD leg (mirrors dca-escrow's own call_value().all_transfers(),
        // cf. dca-escrow/src/lib.rs V5). Convention: receiver = sender
        // (self-transfer), the real destination is an argument.
        txData = [
          "MultiESDTNFTTransfer",
          escrowAddress.toHex(),
          "02",
          strToHex(tokenIn.identifier),
          "00",
          bigToHex(totalDepositRaw),
          strToHex("EGLD-000000"),
          "00",
          bigToHex(gasFeeTotalRaw),
          strToHex("createOrder"),
          ...createArgs,
        ].join("@");
        value = 0n;
        receiver = senderAddress;
      } else {
        txData = [
          "ESDTTransfer",
          strToHex(tokenIn.identifier),
          bigToHex(totalDepositRaw),
          strToHex("createOrder"),
          ...createArgs,
        ].join("@");
        value = 0n;
        receiver = escrowAddress;
      }

      const transaction = new Transaction({
        value,
        data: new TextEncoder().encode(txData),
        receiver,
        sender: senderAddress,
        gasLimit: BigInt(
          CREATE_ORDER_GAS_LIMIT + (isEgldIn ? CREATE_ORDER_EGLD_EXTRA_GAS : 0),
        ),
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });

      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("dca_processing"),
          errorMessage: t("dca_error_tx"),
          successMessage: t("dca_success_tx"),
        },
      });

      setAmountPerExecution("");
      setMinReceived("");
      setMaxReceived("");
      setReceiver("");
      setBalanceRefreshKey((k) => k + 1);
      setOrdersReloadKey((k) => k + 1);
    } catch (err: any) {
      console.error("[DcaWidget] handleCreate error:", err);
      setTxError(err?.message ?? "Erreur lors de la création de l'ordre DCA");
    } finally {
      setIsSending(false);
    }
  };

  /* ---------- Cancel order ---------- */
  const handleCancel = async (orderId: string) => {
    if (!address || !dcaEscrowAddress) return;
    setCancelError(null);
    setCancellingId(orderId);

    try {
      const senderAddress = new Address(address);
      const escrowAddress = new Address(dcaEscrowAddress);
      // Not payable, no other argument — cancelOrder only ever refunds
      // (amount_per_execution * remaining_executions) back to order.owner.
      const txData = ["cancelOrder", bigToHex(BigInt(orderId))].join("@");

      const transaction = new Transaction({
        value: 0n,
        data: new TextEncoder().encode(txData),
        receiver: escrowAddress,
        sender: senderAddress,
        gasLimit: BigInt(CANCEL_ORDER_GAS_LIMIT),
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });

      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("dca_cancel_processing"),
          errorMessage: t("dca_cancel_error"),
          successMessage: t("dca_cancel_success"),
        },
      });

      setBalanceRefreshKey((k) => k + 1);
      setOrdersReloadKey((k) => k + 1);
    } catch (err: any) {
      console.error("[DcaWidget] handleCancel error:", err);
      setCancelError(err?.message ?? "Erreur lors de l'annulation");
    } finally {
      setCancellingId(null);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:xs:flex-row dvx:items-start dvx:xs:items-center dvx:justify-between dvx:w-full dvx:gap-4">
            <SectionTabs active="dca" />
          </div>
        }
        description={t("dca_card_desc")}
      >
        {!dcaEscrowAddress ? (
          <div className="dvx:mt-4 dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-6 dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400">
            {t("dca_not_configured")}
          </div>
        ) : (
          <div className="dvx:space-y-2 dvx:mt-4">
            {/* ---- You pay ---- */}
            <div
              style={p.inner}
              className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
            >
              <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2">
                {t("dca_you_pay")}{" "}
                <span className="dvx:normal-case dvx:text-gray-400">
                  · {t("dca_per_execution")}
                </span>
              </p>
              {address && tokenInBalanceDisplay && (
                <div className="dvx:flex dvx:justify-end dvx:mb-3">
                  <button
                    onClick={handleMax}
                    className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition-colors"
                  >
                    <span className="dvx:text-gray-400">{t("balance")} :</span>
                    {tokenInBalanceDisplay}
                    <span className="dvx:bg-amber-100 dvx:dark:bg-amber-900/30 dvx:text-amber-600 dvx:dark:text-amber-400 dvx:px-1.5 dvx:py-0.5 dvx:rounded dvx:text-[9px] dvx:font-bold">
                      MAX
                    </span>
                  </button>
                </div>
              )}
              <div className="dvx:flex dvx:items-center dvx:gap-3">
                <TokenSelect
                  value={tokenIn}
                  onChange={setTokenIn}
                  tokens={sortedTokens}
                  balances={tokenBalances}
                  loading={tokensLoading}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="0.0"
                  value={amountPerExecution}
                  onChange={(e) => setAmountPerExecution(e.target.value)}
                  style={p.input}
                  className={`dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:transition-colors ${
                    insufficientBalance
                      ? "dvx:border-red-400 dvx:dark:border-red-500 dvx:focus:ring-red-400"
                      : "dvx:border-amber-400 dvx:dark:border-amber-500 dvx:focus:ring-amber-500"
                  }`}
                />
              </div>
              {insufficientBalance && (
                <p className="dvx:mt-2 dvx:text-[10px] dvx:font-semibold dvx:text-red-500 dvx:text-right">
                  {t("insufficient_balance")}
                </p>
              )}
            </div>

            {/* ---- Invert button (same as Swap) ---- */}
            <div className="dvx:flex dvx:justify-center dvx:-my-0.5 dvx:relative dvx:z-10">
              <button
                type="button"
                onClick={invertTokens}
                disabled={!tokenIn && !tokenOut}
                title={t("dca_invert")}
                style={p.invertBtn}
                className="dvx:rounded-full dvx:p-2 dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:shadow-sm dvx:hover:bg-amber-50 dvx:dark:hover:bg-amber-900/20 dvx:transition-colors dvx:disabled:opacity-40"
              >
                <ArrowUpDown className="dvx:h-4 dvx:w-4 dvx:text-amber-500" />
              </button>
            </div>

            {/* ---- You receive ---- */}
            <div
              style={p.inner}
              className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
            >
              <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2">
                {t("dca_you_receive")}
                {tokenOut && amountPerExecutionRaw != null && (
                  <span className="dvx:normal-case dvx:text-gray-400">
                    {" "}
                    · {t("dca_first_swap_estimate")}
                  </span>
                )}
              </p>
              <div className="dvx:flex dvx:items-center dvx:gap-3">
                <TokenSelect
                  value={tokenOut}
                  onChange={setTokenOut}
                  tokens={tokensForOut}
                  loading={tokensLoading}
                />
                {tokenOut && amountPerExecutionRaw != null && (
                  <div
                    style={p.input}
                    className="dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:truncate"
                  >
                    {quoteLoading ? (
                      <span className="dvx:text-gray-400 dvx:animate-pulse">
                        …
                      </span>
                    ) : quoteOut ? (
                      `≈ ${quoteOut.precision(6, BigNumber.ROUND_DOWN).toFixed()}`
                    ) : (
                      <span className="dvx:text-gray-400">—</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ---- Frequency + number of orders ---- */}
            <div
              style={p.inner}
              className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4 dvx:space-y-3"
            >
              <div>
                <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2">
                  {t("dca_frequency")}
                </p>
                <div className="dvx:flex dvx:items-center dvx:gap-2">
                  <span className="dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400 dvx:font-medium">
                    {t("dca_every")}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(e.target.value)}
                    style={p.input}
                    className="dvx:w-16 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-2 dvx:py-2 dvx:text-center dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
                  />
                  <select
                    value={frequencyUnit}
                    onChange={(e) =>
                      setFrequencyUnit(e.target.value as FrequencyUnit)
                    }
                    style={p.input}
                    className="dvx:flex-1 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
                  >
                    <option value="minutes">{t("dca_unit_minutes")}</option>
                    <option value="hours">{t("dca_unit_hours")}</option>
                    <option value="days">{t("dca_unit_days")}</option>
                    <option value="weeks">{t("dca_unit_weeks")}</option>
                  </select>
                </div>
                {intervalTooShort && (
                  <p className="dvx:mt-1.5 dvx:text-[10px] dvx:font-semibold dvx:text-red-500">
                    {t("dca_min_interval_error")}
                  </p>
                )}
              </div>
              <div>
                <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2">
                  {t("dca_number_of_orders")}
                </p>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={numberOfOrders}
                  onChange={(e) => setNumberOfOrders(e.target.value)}
                  style={p.input}
                  className="dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
                />
              </div>
              {(totalDepositDisplay || durationLabel) && (
                <div className="dvx:pt-2 dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333] dvx:text-xs dvx:space-y-1">
                  {totalDepositDisplay && (
                    <div className="dvx:flex dvx:justify-between">
                      <span className="dvx:text-gray-400">
                        {t("dca_summary_deposit")}
                      </span>
                      <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                        {totalDepositDisplay} {tokenIn?.ticker}
                      </span>
                    </div>
                  )}
                  {durationLabel && (
                    <div className="dvx:flex dvx:justify-end">
                      <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                        {t("dca_summary_duration", { duration: durationLabel })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {needsGasFee && gasFeeTotalDisplay && (
                <p className="dvx:pt-2 dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333] dvx:text-[11px] dvx:text-amber-600 dvx:dark:text-amber-400 dvx:leading-relaxed">
                  {t("dca_gas_fee_required", {
                    perExecution: gasFeePerExecutionDisplay,
                    total: gasFeeTotalDisplay,
                    count: nOrders,
                  })}
                </p>
              )}
            </div>

            {/* ---- Advanced: optional price range ---- */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:px-1 dvx:py-2 dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors"
              >
                <span>{t("dca_advanced_toggle")}</span>
                <ChevronDown
                  className={`dvx:h-3.5 dvx:w-3.5 dvx:transition-transform ${showAdvanced ? "dvx:rotate-180" : ""}`}
                />
              </button>
              {showAdvanced && (
                <div
                  style={p.inner}
                  className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4 dvx:space-y-3"
                >
                  <div className="dvx:grid dvx:grid-cols-2 dvx:gap-3">
                    <div>
                      <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1.5">
                        {t("dca_min_received")}
                      </p>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.0"
                        value={minReceived}
                        onChange={(e) => setMinReceived(e.target.value)}
                        style={p.input}
                        className="dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        disabled={!quoteOut}
                        onClick={() => applyRangeShortcut("min")}
                        className="dvx:mt-1.5 dvx:text-[10px] dvx:font-semibold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed dvx:transition-colors"
                      >
                        {t("dca_range_shortcut_min", {
                          pct: RANGE_SHORTCUT_PCT,
                        })}
                      </button>
                    </div>
                    <div>
                      <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1.5">
                        {t("dca_max_received")}
                      </p>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.0"
                        value={maxReceived}
                        onChange={(e) => setMaxReceived(e.target.value)}
                        style={p.input}
                        className="dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        disabled={!quoteOut}
                        onClick={() => applyRangeShortcut("max")}
                        className="dvx:mt-1.5 dvx:text-[10px] dvx:font-semibold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed dvx:transition-colors"
                      >
                        {t("dca_range_shortcut_max", {
                          pct: RANGE_SHORTCUT_PCT,
                        })}
                      </button>
                    </div>
                  </div>
                  {/* Live rate — makes explicit that min/max are an amount of
                      token_out received per execution, not a unit price. */}
                  <p className="dvx:text-xs dvx:text-gray-500 dvx:dark:text-gray-300">
                    {quoteLoading
                      ? t("dca_quote_loading")
                      : quoteOut && tokenIn && tokenOut
                        ? t("dca_quote_current", {
                            amountIn: amountPerExecution,
                            tokenIn: tokenIn.ticker,
                            amountOut: quoteOut
                              .precision(6, BigNumber.ROUND_DOWN)
                              .toFixed(),
                            tokenOut: tokenOut.ticker,
                          })
                        : t("dca_quote_unavailable")}
                  </p>
                  {(quoteBelowMin || quoteAboveMax) && (
                    <p className="dvx:text-[11px] dvx:font-semibold dvx:text-orange-500">
                      {t(
                        quoteBelowMin
                          ? "dca_quote_below_min"
                          : "dca_quote_above_max",
                      )}
                    </p>
                  )}
                  <p className="dvx:text-[10px] dvx:text-gray-400 dvx:leading-relaxed">
                    {t("dca_price_range_hint")}
                  </p>
                  <div className="dvx:mt-2 dvx:pt-4 dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333]">
                    <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1.5">
                      {t("dca_receiver")}
                    </p>
                    <input
                      type="text"
                      placeholder="erd1…"
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                      style={p.input}
                      className={`dvx:w-full dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2 dvx:text-sm dvx:font-mono dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 ${
                        receiverInvalid
                          ? "dvx:border-red-400 dvx:dark:border-red-500 dvx:focus:ring-red-400"
                          : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500"
                      }`}
                    />
                    <p
                      className={`dvx:mt-1.5 dvx:text-[10px] dvx:leading-relaxed ${
                        receiverInvalid
                          ? "dvx:font-semibold dvx:text-red-500"
                          : "dvx:text-gray-400"
                      }`}
                    >
                      {t(
                        receiverInvalid
                          ? "dca_receiver_invalid"
                          : "dca_receiver_hint",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ---- Errors ---- */}
            {quoteNoRoute && (
              <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
                {t("dca_no_route")}
              </div>
            )}
            {hardBlockedBelowMinimum && (
              <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
                {t("dca_below_minimum_blocked")}
              </div>
            )}
            {txError && (
              <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
                {txError}
              </div>
            )}

            {/* ---- Submit ---- */}
            <button
              onClick={!address ? onConnect : handleCreate}
              disabled={!address ? !onConnect : !canSubmitFinal || isSending}
              style={{ minHeight: "36px" }}
              className={`dinoButton orange dvx:w-full dvx:text-base ${
                address
                  ? "dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed"
                  : ""
              }`}
            >
              {!address
                ? t("btn_connect")
                : isSending
                  ? t("dca_btn_signing")
                  : !tokenIn || !tokenOut
                    ? t("dca_btn_select_tokens")
                    : !amountPerExecutionRaw
                      ? t("dca_btn_enter_amount")
                      : insufficientBalance
                        ? t("btn_insufficient")
                        : quoteNoRoute
                          ? t("dca_btn_no_route")
                          : receiverInvalid
                            ? t("dca_btn_invalid_receiver")
                            : hardBlockedBelowMinimum
                              ? t("dca_btn_below_minimum")
                              : t("dca_btn_create")}
            </button>
          </div>
        )}
      </Card>

      {/* ---- My orders ---- */}
      {address && dcaEscrowAddress && (
        <Card
          className="dvx:border-2 dvx:border-cyan-500/20"
          title={
            <span className="dvx:text-lg dvx:font-black dvx:tracking-tight">
              {t("dca_orders_title")}
            </span>
          }
        >
          <div className="dvx:space-y-3 dvx:mt-4">
            {cancelError && (
              <div className="dvx:rounded-xl dvx:bg-red-50 dvx:dark:bg-red-900/20 dvx:border dvx:border-red-200 dvx:dark:border-red-800/50 dvx:px-4 dvx:py-3 dvx:text-sm dvx:text-red-600 dvx:dark:text-red-400">
                {cancelError}
              </div>
            )}
            {!ordersLoading && orders.length === 0 ? (
              <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-6 dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400">
                {t("dca_orders_empty")}
              </div>
            ) : (
              orders.map((o) => (
                <DcaOrderCard
                  key={o.orderId}
                  order={o}
                  t={t}
                  onCancel={handleCancel}
                  cancelling={cancellingId === o.orderId}
                  apiUrl={apiUrl}
                  explorerAddress={explorerAddress}
                  networkApiAddress={networkApiAddress}
                  dcaEscrowAddress={dcaEscrowAddress}
                />
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDuration(totalSeconds: number, t: TFn): string {
  if (totalSeconds >= 604800 && totalSeconds % 604800 === 0) {
    const n = totalSeconds / 604800;
    return t(n === 1 ? "dca_duration_weeks" : "dca_duration_weeks_plural", {
      count: n,
    });
  }
  if (totalSeconds >= 86400) {
    const n = Math.round(totalSeconds / 86400);
    return t(n === 1 ? "dca_duration_days" : "dca_duration_days_plural", {
      count: n,
    });
  }
  if (totalSeconds >= 3600) {
    const n = Math.round(totalSeconds / 3600);
    return t(n === 1 ? "dca_duration_hours" : "dca_duration_hours_plural", {
      count: n,
    });
  }
  const n = Math.round(totalSeconds / 60);
  return t(n === 1 ? "dca_duration_minutes" : "dca_duration_minutes_plural", {
    count: n,
  });
}

function DcaOrderCard({
  order,
  t,
  onCancel,
  cancelling,
  apiUrl,
  explorerAddress,
  networkApiAddress,
  dcaEscrowAddress,
}: {
  order: DcaOrder;
  t: TFn;
  onCancel: (orderId: string) => void;
  cancelling: boolean;
  apiUrl: string;
  explorerAddress?: string;
  networkApiAddress?: string;
  dcaEscrowAddress?: string;
}) {
  const amountDisplay = new BigNumber(order.amountPerExecution)
    .shiftedBy(-order.tokenInDecimals)
    .toFixed(6, BigNumber.ROUND_DOWN);
  const nextDate = new Date(order.nextExecutionAt);

  // 0 = pas de borne (désactivé), cf. dca-escrow/src/lib.rs — même convention
  // que le formulaire de création (dca_min_received/dca_max_received).
  const hasMinAmountOut = new BigNumber(order.minAmountOut).isGreaterThan(0);
  const hasMaxAmountOut = new BigNumber(order.maxAmountOut).isGreaterThan(0);
  const minAmountOutDisplay = hasMinAmountOut
    ? new BigNumber(order.minAmountOut)
        .shiftedBy(-order.tokenOutDecimals)
        .toFixed(6, BigNumber.ROUND_DOWN)
    : null;
  const maxAmountOutDisplay = hasMaxAmountOut
    ? new BigNumber(order.maxAmountOut)
        .shiftedBy(-order.tokenOutDecimals)
        .toFixed(6, BigNumber.ROUND_DOWN)
    : null;

  /* ---- Historique d'exécution — chargé à la demande (pas un fetch par carte au montage) ---- */
  const [showHistory, setShowHistory] = useState(false);
  const [executions, setExecutions] = useState<DcaExecution[] | null>(null);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  // Estimated output of the next execution — same dca-router::getBestQuote the
  // escrow checks against the order's min/max. Re-read on every expand (the
  // rate moves), active orders only.
  const [nextQuoteRaw, setNextQuoteRaw] = useState<bigint | null>(null);
  const [nextQuoteLoading, setNextQuoteLoading] = useState(false);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && executions === null) {
      setExecutionsLoading(true);
      axios
        .get<{ executions: DcaExecution[] }>(
          `${apiUrl}/dca/orders/${order.orderId}/executions`,
        )
        .then((res) => setExecutions(res.data.executions || []))
        .catch(() => setExecutions([]))
        .finally(() => setExecutionsLoading(false));
    }
    if (
      next &&
      order.status === "active" &&
      networkApiAddress &&
      dcaEscrowAddress
    ) {
      setNextQuoteLoading(true);
      getDcaQuote(
        networkApiAddress,
        dcaEscrowAddress,
        order.tokenIn,
        order.tokenOut,
        BigInt(order.amountPerExecution),
      )
        .then((out) => setNextQuoteRaw(out > 0n ? out : null))
        .catch(() => setNextQuoteRaw(null))
        .finally(() => setNextQuoteLoading(false));
    }
  };
  const nextQuoteDisplay =
    nextQuoteRaw != null
      ? new BigNumber(nextQuoteRaw.toString())
          .shiftedBy(-order.tokenOutDecimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : null;
  // Same comparison as dca-escrow::executeOrder (0 = bound disabled).
  const nextQuoteOutOfRange =
    nextQuoteRaw != null &&
    ((hasMinAmountOut && nextQuoteRaw < BigInt(order.minAmountOut)) ||
      (hasMaxAmountOut && nextQuoteRaw > BigInt(order.maxAmountOut)));
  const statusKey =
    order.status === "active"
      ? "dca_status_active"
      : order.status === "completed"
        ? "dca_status_completed"
        : "dca_status_cancelled";
  const statusClass =
    order.status === "active"
      ? "dvx:bg-green-100 dvx:text-green-700 dvx:dark:bg-green-900/30 dvx:dark:text-green-400"
      : order.status === "completed"
        ? "dvx:bg-blue-100 dvx:text-blue-700 dvx:dark:bg-blue-900/30 dvx:dark:text-blue-400"
        : "dvx:bg-gray-100 dvx:text-gray-500 dvx:dark:bg-gray-800 dvx:dark:text-gray-400";

  return (
    <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:p-4">
      <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3 dvx:mb-3">
        <div className="dvx:min-w-0">
          <div className="dvx:flex dvx:items-center dvx:gap-2 dvx:mb-0.5 dvx:flex-wrap">
            <span className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
              {order.tokenInTicker} → {order.tokenOutTicker}
            </span>
            <span
              className={`dvx:text-[10px] dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:font-semibold ${statusClass}`}
            >
              {t(statusKey)}
            </span>
          </div>
          <p className="dvx:text-xs dvx:text-gray-500 dvx:font-medium">
            {amountDisplay} {order.tokenInTicker} {t("dca_per_execution")}
          </p>
          {(hasMinAmountOut || hasMaxAmountOut) && (
            <div className="dvx:flex dvx:flex-wrap dvx:gap-1.5 dvx:mt-1.5">
              {hasMinAmountOut && (
                <span className="dvx:text-[10px] dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#1e1e1e] dvx:text-gray-500 dvx:dark:text-gray-400 dvx:border dvx:border-gray-200 dvx:dark:border-[#333]">
                  {t("dca_min_received")}: {minAmountOutDisplay}{" "}
                  {order.tokenOutTicker}
                </span>
              )}
              {hasMaxAmountOut && (
                <span className="dvx:text-[10px] dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#1e1e1e] dvx:text-gray-500 dvx:dark:text-gray-400 dvx:border dvx:border-gray-200 dvx:dark:border-[#333]">
                  {t("dca_max_received")}: {maxAmountOutDisplay}{" "}
                  {order.tokenOutTicker}
                </span>
              )}
            </div>
          )}
        </div>
        {order.status === "active" && (
          <button
            onClick={() => onCancel(order.orderId)}
            disabled={cancelling}
            className="dvx:text-xs dvx:font-bold dvx:text-red-500 dvx:bg-transparent dvx:hover:text-red-600 dvx:transition dvx:underline dvx:decoration-dashed dvx:disabled:opacity-50 dvx:shrink-0"
          >
            {cancelling ? t("dca_cancel_processing") : t("dca_cancel_btn")}
          </button>
        )}
      </div>
      {order.status === "active" && (
        <div className="dvx:grid dvx:grid-cols-2 dvx:gap-2 dvx:text-xs">
          <div className="dvx:rounded-xl dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2">
            <p className="dvx:text-gray-400 dvx:mb-0.5">{t("dca_frequency")}</p>
            <p className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
              {formatDuration(order.intervalSeconds, t)}
            </p>
            <p className="dvx:text-gray-400 dvx:mt-0.5">
              {/* Plural key picked by hand (like formatDuration) — this i18next
                  version resolves `_one`/`_other`, not the `_plural` suffix. */}
              {t(order.remainingExecutions === 1 ? "dca_remaining" : "dca_remaining_plural", {
                count: order.remainingExecutions,
              })}
            </p>
          </div>
          <div className="dvx:rounded-xl dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2">
            <p className="dvx:text-gray-400 dvx:mb-0.5">
              {t("dca_next_execution")}
            </p>
            <p className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
              {nextDate.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* ---- Historique d'exécution ---- */}
      <button
        type="button"
        onClick={toggleHistory}
        className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:mt-3 dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333] dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors"
      >
        <span>{t("dca_history_toggle")}</span>
        <ChevronDown
          className={`dvx:h-3.5 dvx:w-3.5 dvx:transition-transform ${showHistory ? "dvx:rotate-180" : ""}`}
        />
      </button>
      {showHistory && (
        <div className="dvx:mt-2 dvx:space-y-1.5">
          {order.status === "active" &&
            (nextQuoteLoading || nextQuoteDisplay) && (
              <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:text-xs dvx:rounded-lg dvx:border dvx:border-dashed dvx:border-amber-300 dvx:dark:border-amber-700/60 dvx:px-3 dvx:py-1.5">
                <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                  {t("dca_next_estimate")}
                </span>
                {nextQuoteLoading ? (
                  <span className="dvx:text-gray-400 dvx:animate-pulse">
                    {t("calculating")}
                  </span>
                ) : (
                  <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:shrink-0">
                    ≈ +{nextQuoteDisplay} {order.tokenOutTicker}
                  </span>
                )}
                {!nextQuoteLoading && (hasMinAmountOut || hasMaxAmountOut) && (
                  <span
                    className={`dvx:text-[10px] dvx:font-semibold dvx:shrink-0 ${
                      nextQuoteOutOfRange
                        ? "dvx:text-orange-500"
                        : "dvx:text-green-600 dvx:dark:text-green-400"
                    }`}
                  >
                    {t(
                      nextQuoteOutOfRange
                        ? "dca_next_estimate_out_of_range"
                        : "dca_next_estimate_in_range",
                    )}
                  </span>
                )}
              </div>
            )}
          {executionsLoading ? (
            <p className="dvx:text-xs dvx:text-gray-400 dvx:animate-pulse">
              {t("calculating")}
            </p>
          ) : !executions || executions.length === 0 ? (
            <p className="dvx:text-xs dvx:text-gray-400">
              {t("dca_history_empty")}
            </p>
          ) : (
            executions.map((ex) => {
              const amountOutDisplay = new BigNumber(ex.amountOut)
                .shiftedBy(-order.tokenOutDecimals)
                .toFixed(6, BigNumber.ROUND_DOWN);
              const shortHash = `${ex.txHash.slice(0, 6)}…${ex.txHash.slice(-4)}`;
              return (
                <div
                  key={ex.txHash}
                  className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:text-xs dvx:rounded-lg dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-1.5"
                >
                  <span className="dvx:text-gray-500 dvx:dark:text-gray-400">
                    {new Date(ex.timestamp).toLocaleString()}
                  </span>
                  <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:shrink-0">
                    +{amountOutDisplay} {order.tokenOutTicker}
                  </span>
                  {explorerAddress ? (
                    <a
                      href={`${explorerAddress}/transactions/${ex.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dvx:text-amber-500 dvx:hover:text-amber-400 dvx:hover:underline dvx:shrink-0"
                    >
                      {shortHash} ↗
                    </a>
                  ) : (
                    <span className="dvx:text-gray-400 dvx:shrink-0">
                      {shortHash}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
