import React from "react";
import { Info } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionTabs, LiquiditySubTabs } from "../ui/NavTabs";
import { DcaBadge } from "../ui/DcaBadge";
import { fetchAllPools } from "../helpers/fetchAllPools";

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
      fetchAllPools(apiUrl).then((pools) => ({ data: { pools } })),
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
      // Largest position (USD value) first; unpriced positions go last.
      .then((positions) => {
        const valueUsd = (pos: UserPosition) =>
          pos.pool.lpTokenPriceUsd
            ? new BigNumber(pos.balance).shiftedBy(-18).toNumber() * parseFloat(pos.pool.lpTokenPriceUsd)
            : -1;
        setUserPositions([...positions].sort((a, b) => valueUsd(b) - valueUsd(a)));
      })
      .catch(console.error);
  }, [walletTokens, pools, networkApiAddress, tokenMeta, apiUrl]);

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
            <SectionTabs active="liquidity" />
            <LiquiditySubTabs active="liquidity" />
          </div>
        }
        description={t("liquidity_card_desc")}
      >
        <div className="dvx:space-y-4 dvx:mt-4">
          {!poolsLoading && userPositions.length === 0 ? (
            <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-6 dvx:text-center">
              <p className="dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400 dvx:mb-4">
                {t("liquidity_empty")}
              </p>
              <button
                onClick={() => goTo("add-liquidity")}
                style={{ minHeight: "36px" }}
                className="dinoButton dvx:w-full dvx:text-base"
              >
                {t("liquidity_add")}
              </button>
            </div>
          ) : (
            <div className="dvx:space-y-4">
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
                      <div className="dvx:rounded-2xl dvx:border dvx:border-amber-200 dvx:dark:border-amber-800/50 dvx:bg-amber-50 dvx:dark:bg-amber-900/10 dvx:px-4 dvx:py-3 dvx:flex dvx:items-center dvx:justify-between">
                        <span className="dvx:text-xs dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-400 dvx:uppercase dvx:tracking-wider">
                          {t("liquidity_total_value")}
                        </span>
                        <span className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:text-base">
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
                      const tickerA = tokenMeta[pos.pool.tokenA]?.ticker ?? pos.pool.tokenA.split("-")[0];
                      const tickerB = tokenMeta[pos.pool.tokenB]?.ticker ?? pos.pool.tokenB.split("-")[0];
                      const poolSharePct = totalSupplyBN.isZero()
                        ? null
                        : new BigNumber(pos.balance).dividedBy(totalSupplyBN).multipliedBy(100).toNumber();
                      // Estimated LP fees over 30 days at the CURRENT pool share: the
                      // pool's LP fees over its APR window, normalised to 30 days, times
                      // the share. Indicative — a recent deposit didn't earn the past fees.
                      const feesWindowUsd = pos.pool.apr?.feesUsdLp != null ? parseFloat(pos.pool.apr.feesUsdLp) : NaN;
                      const windowDays = pos.pool.apr?.windowDays ?? 0;
                      const estFees30dUsd =
                        poolSharePct != null && Number.isFinite(feesWindowUsd) && windowDays > 0
                          ? (feesWindowUsd / windowDays) * 30 * (poolSharePct / 100)
                          : null;
                      const shareBox = (ticker: string, amount: string, usd: number | null) => (
                        <div className="dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2">
                          <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-0.5">
                            {t("liquidity_your_share")} {ticker}
                          </p>
                          <p className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white dvx:text-sm">
                            {amount} <span className="dvx:text-gray-400 dvx:font-medium">{ticker}</span>
                          </p>
                          {usd != null && usd > 0 && (
                            <p className="dvx:text-[10px] dvx:text-gray-400 dvx:mt-0.5">{formatUsd(usd)}</p>
                          )}
                        </div>
                      );
                      return (
                        <div
                          key={pos.pool.address}
                          className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
                        >
                          {/* Same header layout as the Pools cards */}
                          <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3 dvx:mb-3">
                            <div className="dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap dvx:min-w-0">
                              <span className="dvx:font-black dvx:text-gray-900 dvx:dark:text-white dvx:text-base">
                                {tickerA} / {tickerB}
                              </span>
                              {pos.pool.dcaReady && <DcaBadge tokenA={pos.pool.tokenA} tokenB={pos.pool.tokenB} />}
                              {posUsd !== null && posUsd > 0 && (
                                <span className="dvx:text-sm dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                                  ≈ {formatUsd(posUsd)}
                                </span>
                              )}
                              {poolSharePct != null && (
                                <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400">
                                  {t("liquidity_pool_share", {
                                    pct: poolSharePct > 0 && poolSharePct < 0.01 ? "<0.01" : poolSharePct.toFixed(2),
                                  })}
                                </span>
                              )}
                              {pos.pool.apr?.aprPct != null && (
                                <span className="dvx:text-[10px] dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400">
                                  {t("pools_apr", { pct: parseFloat(pos.pool.apr.aprPct).toFixed(2) })}
                                </span>
                              )}
                              {estFees30dUsd != null && (
                                <span
                                  className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:cursor-help dvx:whitespace-nowrap"
                                  title={t("liquidity_est_fees_tooltip", { days: Math.round(windowDays) })}
                                >
                                  {t("liquidity_est_fees", {
                                    amount: estFees30dUsd === 0 ? "$0" : formatUsd(estFees30dUsd),
                                  })}
                                  <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                                </span>
                              )}
                            </div>
                            <div className="dvx:flex dvx:gap-3 dvx:shrink-0 dvx:mt-1">
                              <button
                                onClick={() =>
                                  goTo("add-liquidity", {
                                    tokenA: pos.pool.tokenA,
                                    tokenB: pos.pool.tokenB,
                                  })
                                }
                                className="dvx:whitespace-nowrap dvx:text-xs dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition"
                              >
                                + {t("liquidity_add_btn")}
                              </button>
                              <button
                                onClick={() =>
                                  goTo("remove-liquidity", {
                                    pool: pos.pool.address,
                                  })
                                }
                                className="dvx:whitespace-nowrap dvx:text-xs dvx:font-bold dvx:text-red-500 dvx:bg-transparent dvx:hover:text-red-600 dvx:transition"
                              >
                                − {t("liquidity_remove_btn")}
                              </button>
                            </div>
                          </div>
                          <div className="dvx:grid dvx:grid-cols-2 dvx:gap-3">
                            {shareBox(tickerA, estimatedA, estimatedAUsd)}
                            {shareBox(tickerB, estimatedB, estimatedBUsd)}
                          </div>
                          <p className="dvx:text-[10px] dvx:text-gray-400 dvx:mt-2 dvx:font-mono dvx:truncate">
                            {displayBalance} {lpTokenTicker}
                          </p>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
              <button
                onClick={() => goTo("add-liquidity")}
                style={{ minHeight: "36px" }}
                className="dinoButton dvx:w-full dvx:text-base"
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
