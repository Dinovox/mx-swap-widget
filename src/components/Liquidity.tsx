import React from "react";
import { Card } from "../ui/Card";

const formatUsd = (value: number): string => {
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import axios from "axios";
import { useSwapConfig } from "../context/SwapConfigContext";
import BigNumber from "bignumber.js";
import type { LiquidityPool, TokenMeta, UserPosition } from "../types";

export const Liquidity = () => {
  const { apiUrl, address, networkApiAddress } = useSwapConfig();
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");

  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
  const [poolsLoading, setPoolsLoading] = React.useState(true);
  const [userPositions, setUserPositions] = React.useState<UserPosition[]>([]);
  // DinoVox's own token catalogue — same price source as the pool's
  // lpTokenPriceUsd (used for the total/per-position headline figures) and as
  // RemoveLiquidity. Deliberately not api.multiversx.com's generic per-token
  // `price` field: that's a different feed and previously made the per-token
  // breakdown (estimatedAUsd/estimatedBUsd) disagree with the headline total.
  const [tokenMeta, setTokenMeta] = React.useState<Record<string, TokenMeta>>({});

  React.useEffect(() => {
    if (!apiUrl) return;
    setPoolsLoading(true);
    Promise.all([
      axios.get(`${apiUrl}/pools`),
      axios.get(`${apiUrl}/tokens`).catch(() => ({ data: { tokens: [] } })),
    ])
      .then(([poolsRes, tokensRes]) => {
        setPools(poolsRes.data.pools || []);
        const map: Record<string, TokenMeta> = {};
        for (const tk of tokensRes.data.tokens || []) {
          map[tk.identifier] = {
            identifier: tk.identifier,
            ticker: tk.ticker || tk.identifier.split("-")[0],
            decimals: tk.decimals ?? 18,
            priceUsd: tk.priceUsd ?? null,
          };
        }
        setTokenMeta(map);
      })
      .catch(console.error)
      .finally(() => setPoolsLoading(false));
  }, [apiUrl]);

  const walletTokens = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
  });

  React.useEffect(() => {
    if (
      !walletTokens ||
      walletTokens.length === 0 ||
      pools.length === 0 ||
      !networkApiAddress
    ) {
      setUserPositions([]);
      return;
    }
    const held = pools.flatMap((pool) => {
      const balanceObj = walletTokens.find(
        (wt: any) => wt.identifier === pool.lpToken,
      );
      if (balanceObj && new BigNumber(balanceObj.balance).gt(0)) {
        return [{ pool, balance: balanceObj.balance as string }];
      }
      return [];
    });
    if (held.length === 0) {
      setUserPositions([]);
      return;
    }
    Promise.all(
      held.map(async ({ pool, balance }) => {
        // Pool *detail* endpoint rather than the bulk /pools list this pool
        // object came from — a single-pool lookup stays fresher than the
        // list snapshot. Pulling reserveA/reserveB/lpSupply/lpTokenPriceUsd
        // all from this one response (instead of mixing the list snapshot's
        // reserves with a separately-queried live supply) keeps them from
        // the same moment, so a swap/arbitrage that just rebalanced the pool
        // can't leave the per-token breakdown and the headline total
        // disagreeing. Falls back to the list snapshot on failure.
        const detailRes = await axios
          .get(`${apiUrl}/pools/${pool.address}`)
          .catch(() => null);
        const detail = detailRes?.data;
        const freshPool: LiquidityPool = detail
          ? {
              ...pool,
              reserveA: detail.reserveA ?? pool.reserveA,
              reserveB: detail.reserveB ?? pool.reserveB,
              lpSupply: detail.lpSupply ?? pool.lpSupply,
              lpTokenPriceUsd: detail.lpTokenPriceUsd ?? pool.lpTokenPriceUsd,
            }
          : pool;
        const metaA = tokenMeta[pool.tokenA];
        const metaB = tokenMeta[pool.tokenB];
        return {
          pool: freshPool,
          balance,
          lpTotalSupply: freshPool.lpSupply,
          decimalsA: metaA?.decimals ?? 18,
          decimalsB: metaB?.decimals ?? 18,
          priceA: metaA?.priceUsd != null ? parseFloat(metaA.priceUsd) : null,
          priceB: metaB?.priceUsd != null ? parseFloat(metaB.priceUsd) : null,
        } as UserPosition;
      }),
    )
      .then(setUserPositions)
      .catch(console.error);
  }, [walletTokens, pools, networkApiAddress, tokenMeta, apiUrl]);

  return (
    <div className="flex flex-col w-full gap-6">
      <Card
        className="border-2 border-cyan-500/20"
        title={
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">💧</span>
              <span className="text-lg font-black tracking-tight">
                {t("liquidity_title")}
              </span>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto">
              <button
                onClick={() => goTo("swap")}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5"
              >
                Swap
              </button>
              <button className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all">
                {t("tab_liquidity")}
              </button>
              <button
                onClick={() => goTo("pools")}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5"
              >
                Pools
              </button>
            </div>
          </div>
        }
        description={t("liquidity_card_desc")}
      >
        <div className="space-y-4 mt-4">
          {!poolsLoading && userPositions.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t("liquidity_empty")}
              </p>
              <button
                onClick={() => goTo("add-liquidity")}
                style={{ minHeight: "36px" }}
                className="dinoButton w-full text-base"
              >
                {t("liquidity_add")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const totalUsd = userPositions.reduce((acc, pos) => {
                  if (!pos.pool.lpTokenPriceUsd) return acc;
                  const bal = new BigNumber(pos.balance)
                    .shiftedBy(-18)
                    .toNumber();
                  return acc + bal * parseFloat(pos.pool.lpTokenPriceUsd);
                }, 0);
                return (
                  <>
                    {totalUsd > 0 && (
                      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t("liquidity_total_value")}
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 text-base">
                          {formatUsd(totalUsd)}
                        </span>
                      </div>
                    )}
                    {userPositions.map((pos: UserPosition) => {
                      const lpTokenTicker = pos.pool.lpToken.split("-")[0];
                      const displayBalance = new BigNumber(pos.balance)
                        .shiftedBy(-18)
                        .toFixed(6, BigNumber.ROUND_DOWN);
                      const totalSupplyBN = new BigNumber(pos.lpTotalSupply);
                      const safeTotalSupply = totalSupplyBN.isZero()
                        ? new BigNumber(1)
                        : totalSupplyBN;
                      const estimatedA = new BigNumber(pos.balance)
                        .multipliedBy(pos.pool.reserveA)
                        .dividedBy(safeTotalSupply)
                        .shiftedBy(-pos.decimalsA)
                        .toFixed(6, BigNumber.ROUND_DOWN);
                      const estimatedB = new BigNumber(pos.balance)
                        .multipliedBy(pos.pool.reserveB)
                        .dividedBy(safeTotalSupply)
                        .shiftedBy(-pos.decimalsB)
                        .toFixed(6, BigNumber.ROUND_DOWN);
                      const estimatedAUsd =
                        pos.priceA != null
                          ? parseFloat(estimatedA) * pos.priceA
                          : null;
                      const estimatedBUsd =
                        pos.priceB != null
                          ? parseFloat(estimatedB) * pos.priceB
                          : null;
                      const posUsd = pos.pool.lpTokenPriceUsd
                        ? new BigNumber(pos.balance).shiftedBy(-18).toNumber() *
                          parseFloat(pos.pool.lpTokenPriceUsd)
                        : null;
                      return (
                        <div
                          key={pos.pool.address}
                          className="rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#2a2a2a] p-4"
                        >
                          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-bold text-gray-900 dark:text-white uppercase truncate">
                                  {lpTokenTicker}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 flex-shrink-0">
                                  LP
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium truncate">
                                {pos.pool.tokenA.split("-")[0]} /{" "}
                                {pos.pool.tokenB.split("-")[0]}
                              </p>
                            </div>
                            <div className="xs:text-right w-full xs:w-auto">
                              <p className="font-bold text-gray-900 dark:text-white mb-0.5">
                                {displayBalance} LP
                              </p>
                              {posUsd !== null && posUsd > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">
                                  ≈ {formatUsd(posUsd)}
                                </p>
                              )}
                              <div className="flex gap-3 xs:justify-end">
                                <button
                                  onClick={() =>
                                    goTo("add-liquidity", {
                                      tokenA: pos.pool.tokenA,
                                      tokenB: pos.pool.tokenB,
                                    })
                                  }
                                  className="text-xs font-bold text-green-500 hover:text-green-600 transition underline decoration-dashed"
                                >
                                  {t("liquidity_add_btn")}
                                </button>
                                <button
                                  onClick={() =>
                                    goTo("remove-liquidity", {
                                      pool: pos.pool.address,
                                    })
                                  }
                                  className="text-xs font-bold text-red-500 hover:text-red-600 transition underline decoration-dashed"
                                >
                                  {t("liquidity_remove_btn")}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs">
                              <p className="text-gray-400 mb-0.5">
                                ≈ {pos.pool.tokenA.split("-")[0]}
                              </p>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {estimatedA}
                              </p>
                              {estimatedAUsd != null && estimatedAUsd > 0 && (
                                <p className="text-gray-400 mt-0.5">
                                  {formatUsd(estimatedAUsd)}
                                </p>
                              )}
                            </div>
                            <div className="rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs">
                              <p className="text-gray-400 mb-0.5">
                                ≈ {pos.pool.tokenB.split("-")[0]}
                              </p>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {estimatedB}
                              </p>
                              {estimatedBUsd != null && estimatedBUsd > 0 && (
                                <p className="text-gray-400 mt-0.5">
                                  {formatUsd(estimatedBUsd)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
              <button
                onClick={() => goTo("add-liquidity")}
                style={{ minHeight: "36px" }}
                className="dinoButton w-full text-base"
              >
                {t("liquidity_add")}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
