import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { TokenSelect } from "../ui/TokenSelect";
import { useSwapConfig } from "../context/SwapConfigContext";
import strToHex from "../helpers/strToHex";
import type { DexToken, PoolInfo } from "../types";

export const CreatePool = () => {
  const {
    apiUrl,
    factoryAddress,
    address,
    chainId,
    networkApiAddress,
    onSignTransactions,
  } = useSwapConfig();
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const [searchParams, setSearchParams] = useWidgetSearchParams();

  const [hubTokens, setHubTokens] = useState<DexToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [lpTokenSet, setLpTokenSet] = useState<Set<string>>(new Set());
  const [tokenX, setTokenX] = useState<DexToken | null>(null);
  const [tokenY, setTokenY] = useState<DexToken | null>(null);

  const selectTokenX = (t: DexToken | null) => {
    setTokenX(t);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        t ? p.set("tokenX", t.identifier) : p.delete("tokenX");
        return p;
      },
      { replace: true },
    );
  };
  const selectTokenY = (t: DexToken | null) => {
    setTokenY(t);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        t ? p.set("tokenY", t.identifier) : p.delete("tokenY");
        return p;
      },
      { replace: true },
    );
  };

  const [lpName, setLpName] = useState("");
  const [lpTicker, setLpTicker] = useState("");
  const [existingPool, setExistingPool] = useState<PoolInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const allWalletTokensRaw = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
  });
  const [walletTokens, setWalletTokens] = useState<DexToken[]>([]);

  useEffect(() => {
    if (!allWalletTokensRaw || allWalletTokensRaw.length === 0) {
      setWalletTokens([]);
      return;
    }
    setWalletTokens(
      allWalletTokensRaw
        .filter((t: any) => !lpTokenSet.has(t.identifier))
        .map((t: any) => ({
          identifier: t.identifier,
          ticker: t.ticker || t.identifier.split("-")[0],
          decimals: t.decimals ?? 18,
          logoUrl: t.assets?.svgUrl ?? t.assets?.pngUrl ?? null,
        })),
    );
  }, [allWalletTokensRaw, lpTokenSet]);

  useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);
    Promise.all([
      axios.get(`${apiUrl}/tokens/hub`).catch(() => ({ data: [] })),
      axios.get(`${apiUrl}/pools`).catch(() => ({ data: { pools: [] } })),
    ])
      .then(([hubRes, poolsRes]) => {
        setHubTokens(
          (hubRes.data?.hubTokens || []).map((h: any) => ({
            identifier: h.identifier,
            ticker: h.ticker || h.identifier.split("-")[0],
            decimals: h.decimals ?? 18,
            logoUrl: h.logoUrl ?? null,
          })),
        );
        setLpTokenSet(
          new Set(
            (poolsRes.data.pools || [])
              .map((p: any) => p.lpToken)
              .filter(Boolean),
          ),
        );
      })
      .catch(console.error)
      .finally(() => setTokensLoading(false));
  }, [apiUrl]);

  useEffect(() => {
    if (tokensLoading) return;
    const qX = searchParams.get("tokenX");
    const qY = searchParams.get("tokenY");
    if (qX && !tokenX) {
      const f = hubTokens.find((t) => t.identifier === qX);
      if (f) setTokenX(f);
    }
    if (qY && !tokenY) {
      const f = walletTokens.find((t) => t.identifier === qY);
      if (f) setTokenY(f);
    }
  }, [tokensLoading, hubTokens, walletTokens]); // eslint-disable-line

  useEffect(() => {
    if (!tokenX || !tokenY) return;
    const clean = (s: string) =>
      s
        .split("-")[0]
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const tX = clean(tokenX.ticker);
    const tY = clean(tokenY.ticker);
    const splitBudget = (
      a: string,
      b: string,
      budget: number,
    ): [string, string] =>
      a.length + b.length <= budget
        ? [a, b]
        : [
            a.slice(0, budget - Math.floor(budget / 2)),
            b.slice(0, Math.floor(budget / 2)),
          ];
    const [nX, nY] = splitBudget(tX, tY, 18);
    setLpName(nX + nY + "LP");
    const [tkX, tkY] = splitBudget(tX, tY, 10);
    setLpTicker(tkX + tkY);
  }, [tokenX, tokenY]);

  const pollPools = async () => {
    if (!tokenX || !tokenY) return;
    try {
      const res = await axios.get(`${apiUrl}/pools/pair`, {
        params: { tokenA: tokenX.identifier, tokenB: tokenY.identifier },
      });
      setExistingPool(res.data?.address ? res.data : null);
    } catch (e: any) {
      if (e?.response?.status !== 404) console.error(e);
      setExistingPool(null);
    }
  };

  useEffect(() => {
    pollPools();
    const i = setInterval(pollPools, 5000);
    return () => clearInterval(i);
  }, [tokenX, tokenY]); // eslint-disable-line

  const [fastPolling, setFastPolling] = React.useState(false);
  useEffect(() => {
    if (!fastPolling) return;
    const i = setInterval(async () => {
      await pollPools();
      setExistingPool((prev) => {
        if (prev) setFastPolling(false);
        return prev;
      });
    }, 2000);
    return () => clearInterval(i);
  }, [fastPolling, tokenX, tokenY]); // eslint-disable-line

  const isValidName =
    lpName.length >= 3 && lpName.length <= 20 && /^[a-zA-Z0-9]+$/.test(lpName);
  const isValidTicker =
    lpTicker.length >= 3 &&
    lpTicker.length <= 10 &&
    /^[A-Z0-9]+$/.test(lpTicker);
  const canCreate =
    !!address &&
    !!tokenX &&
    !!tokenY &&
    tokenX.identifier !== tokenY.identifier &&
    isValidName &&
    isValidTicker &&
    !existingPool;
  const canIssue = !!address && !!existingPool && !existingPool.isActive;
  const disabled = isCreating || isIssuing;

  const handleCreatePair = async () => {
    if (!canCreate || !tokenX || !tokenY) return;
    setIsCreating(true);
    try {
      const txDataParts = [
        "createPair",
        strToHex(tokenX.identifier),
        strToHex(tokenY.identifier),
        strToHex(lpName),
        strToHex(lpTicker),
      ];
      const transaction = new Transaction({
        value: 0n,
        data: new TextEncoder().encode(txDataParts.join("@")),
        receiver: new Address(factoryAddress),
        sender: new Address(address),
        gasLimit: 300_000_000n,
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("create_processing_pair"),
          errorMessage: t("create_error_pair"),
          successMessage: t("create_success_pair"),
        },
      });
      setFastPolling(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleIssueLp = async () => {
    if (!canIssue || !tokenX || !tokenY) return;
    setIsIssuing(true);
    try {
      const txDataParts = [
        "issueLpToken",
        strToHex(tokenX.identifier),
        strToHex(tokenY.identifier),
      ];
      const transaction = new Transaction({
        value: 50_000_000_000_000_000n,
        data: new TextEncoder().encode(txDataParts.join("@")),
        receiver: new Address(factoryAddress),
        sender: new Address(address),
        gasLimit: 150_000_000n,
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("create_processing_lp"),
          errorMessage: t("create_error_lp"),
          successMessage: t("create_success_lp"),
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="dvx:mx-auto dvx:max-w-lg dvx:px-4 dvx:py-8">
      <div className="dvx:flex dvx:items-center dvx:gap-3 dvx:mb-6">
        <button
          onClick={() => goTo("liquidity")}
          className="dvx:p-2 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:hover:bg-gray-200 dvx:dark:hover:bg-[#2a2a2a] dvx:transition"
        >
          <ArrowLeft className="dvx:w-5 dvx:h-5 dvx:text-gray-600 dvx:dark:text-gray-300" />
        </button>
        <div>
          <h1 className="dvx:text-xl dvx:font-black dvx:uppercase dvx:tracking-tight dvx:text-gray-900 dvx:dark:text-white">
            {t("create_title")}
          </h1>
          <p className="dvx:text-xs dvx:text-gray-500 dvx:dark:text-gray-400">
            {t("create_subtitle")}
          </p>
        </div>
      </div>

      <div className="dvx:space-y-4">
        <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4 dvx:space-y-4">
          <div>
            <label className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2 dvx:block">
              {t("create_token1")}
            </label>
            <TokenSelect
              value={tokenX}
              onChange={disabled ? () => {} : selectTokenX}
              tokens={hubTokens}
              exclude={tokenY?.identifier}
              loading={tokensLoading}
            />
          </div>
          <div>
            <label className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-2 dvx:block">
              {t("create_token2")}
            </label>
            <TokenSelect
              value={tokenY}
              onChange={disabled ? () => {} : selectTokenY}
              tokens={walletTokens}
              exclude={tokenX?.identifier}
              loading={
                tokensLoading ||
                (allWalletTokensRaw.length > 0 && walletTokens.length === 0)
              }
            />
          </div>
          <div>
            <label className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1 dvx:block">
              {t("create_lp_name")}
            </label>
            <input
              type="text"
              value={lpName}
              readOnly
              className="dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:px-3 dvx:py-2.5 dvx:text-sm dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-400 dvx:cursor-default dvx:select-none dvx:focus:outline-none"
            />
          </div>
          <div>
            <label className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-1 dvx:block">
              {t("create_lp_ticker")}
            </label>
            <input
              type="text"
              value={lpTicker}
              readOnly
              className="dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:px-3 dvx:py-2.5 dvx:text-sm dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-400 dvx:cursor-default dvx:select-none dvx:focus:outline-none"
            />
          </div>
        </div>

        {!existingPool ? (
          <>
            <button
              onClick={handleCreatePair}
              disabled={!canCreate || isCreating}
              style={{ minHeight: "36px" }}
              className="dinoButton dvx:w-full dvx:text-base dvx:mt-4 dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed"
            >
              {isCreating ? t("create_tx_pending") : t("create_step1")}
            </button>
            {isCreating && (
              <p className="dvx:text-center dvx:text-xs dvx:text-amber-600 dvx:dark:text-amber-400 dvx:mt-2 dvx:animate-pulse">
                {t("create_tx_waiting")}
              </p>
            )}
          </>
        ) : !existingPool.isActive ? (
          <div className="dvx:rounded-xl dvx:border dvx:border-amber-200 dvx:bg-amber-50 dvx:dark:bg-amber-900/20 dvx:dark:border-amber-800 dvx:p-4 dvx:mt-4 dvx:text-center">
            <p className="dvx:text-sm dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:mb-3">
              {t("create_pair_done")}
            </p>
            <p className="dvx:text-xs dvx:text-amber-600/80 dvx:dark:text-amber-400/80 dvx:mb-4 dvx:text-left">
              {t("create_pair_desc")}
            </p>
            <button
              onClick={handleIssueLp}
              className="dvx:w-full dvx:px-4 dvx:py-3 dvx:bg-amber-500 dvx:text-white dvx:rounded-xl dvx:text-sm dvx:font-bold dvx:hover:bg-amber-600 dvx:transition dvx:shadow-sm"
            >
              {isIssuing ? t("create_tx_pending") : t("create_step2")}
            </button>
            {isIssuing && (
              <p className="dvx:text-center dvx:text-xs dvx:text-amber-600 dvx:dark:text-amber-400 dvx:mt-2 dvx:animate-pulse">
                {t("create_tx_waiting")}
              </p>
            )}
          </div>
        ) : (
          <div className="dvx:rounded-xl dvx:border dvx:border-green-200 dvx:bg-green-50 dvx:dark:bg-green-900/20 dvx:dark:border-green-800 dvx:p-6 dvx:mt-4 dvx:text-center">
            <CheckCircle className="dvx:w-12 dvx:h-12 dvx:text-green-500 dvx:mx-auto dvx:mb-3" />
            <p className="dvx:text-base dvx:font-bold dvx:text-green-700 dvx:dark:text-green-400 dvx:mb-2">
              {t("create_pool_active")}
            </p>
            <p className="dvx:text-sm dvx:text-green-600/80 dvx:dark:text-green-400/80 dvx:mb-4">
              {t("create_pool_ready")}
            </p>
            <button
              onClick={() =>
                goTo("add-liquidity", {
                  tokenA: tokenX?.identifier ?? "",
                  tokenB: tokenY?.identifier ?? "",
                })
              }
              className="dvx:w-full dvx:px-4 dvx:py-3 dvx:bg-green-500 dvx:text-white dvx:rounded-xl dvx:text-sm dvx:font-bold dvx:hover:bg-green-600 dvx:transition dvx:shadow-sm"
            >
              {t("create_add_liquidity")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
