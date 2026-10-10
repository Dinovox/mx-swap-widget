import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import type { TokenMeta } from "../types";

interface RecentSwap {
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: string;
}

// LP share of the swap fee — same split the backend uses for feesUsdLp / APR
// (100% - DEFAULT_PROTOCOL_FEE_PCT 30%, cf. pair/src/lib.rs).
const LP_FEE_SHARE = 0.7;

function formatAmount(bn: BigNumber): string {
  if (bn.isZero()) return "0";
  if (bn.gte(1_000_000)) return bn.toFormat(0);
  if (bn.gte(1000)) return bn.toFormat(2);
  if (bn.gte(1)) return bn.toFormat(4);
  return bn.precision(4).toFixed();
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${(value / 1000).toFixed(1)}K`;
}

/** Latest swaps of a pool (GET /pools/:address → recentSwaps) with the LP fee each one captured. */
export const RecentSwaps = ({
  apiUrl,
  address,
  explorerAddress,
  tokenMap,
}: {
  apiUrl: string;
  address: string;
  explorerAddress?: string;
  tokenMap: Record<string, TokenMeta>;
}) => {
  const { t, i18n } = useTranslation("swap");
  const [swaps, setSwaps] = React.useState<RecentSwap[] | null>(null);
  const [feeBps, setFeeBps] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    axios
      .get<{ recentSwaps?: RecentSwap[]; feeBps?: number }>(`${apiUrl}/pools/${address}`)
      .then((res) => {
        if (cancelled) return;
        setSwaps(res.data.recentSwaps ?? []);
        setFeeBps(res.data.feeBps ?? null);
      })
      .catch(() => !cancelled && setSwaps([]));
    return () => {
      cancelled = true;
    };
  }, [apiUrl, address]);

  const ticker = (id: string) => tokenMap[id]?.ticker ?? id.split("-")[0];
  const human = (raw: string, id: string) => new BigNumber(raw).shiftedBy(-(tokenMap[id]?.decimals ?? 18));
  const priceOf = (id: string) => {
    const p = tokenMap[id]?.priceUsd;
    return p != null ? parseFloat(p) : null;
  };

  // LP fee is taken on the input amount.
  const rows = (swaps ?? []).map((s) => {
    const inH = human(s.amountIn, s.tokenIn);
    const feeH = feeBps != null ? inH.multipliedBy(feeBps).dividedBy(10_000).multipliedBy(LP_FEE_SHARE) : null;
    const price = priceOf(s.tokenIn);
    return { s, inH, outH: human(s.amountOut, s.tokenOut), feeH, feeUsd: feeH && price != null ? feeH.toNumber() * price : null };
  });
  const totalFeeUsd = rows.every((r) => r.feeUsd != null) ? rows.reduce((a, r) => a + (r.feeUsd ?? 0), 0) : null;

  return (
    <div className="dvx:mt-3 dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:p-3">
      <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:mb-2">
        <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
          {t("pools_recent_swaps_title", { count: rows.length })}
        </p>
        {totalFeeUsd != null && rows.length > 0 && (
          <p
            className="dvx:text-[10px] dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:cursor-help"
            title={t("pools_swap_fee_tooltip", { pct: feeBps != null ? feeBps / 100 : "—", lpPct: LP_FEE_SHARE * 100 })}
          >
            {t("pools_recent_swaps_fee_total", { amount: formatUsd(totalFeeUsd) })}
          </p>
        )}
      </div>
      {swaps == null ? (
        <p className="dvx:text-xs dvx:text-gray-400 dvx:animate-pulse">{t("calculating")}</p>
      ) : rows.length === 0 ? (
        <p className="dvx:text-xs dvx:text-gray-400">{t("pools_recent_swaps_empty")}</p>
      ) : (
        <div className="dvx:space-y-1">
          {rows.map(({ s, inH, outH, feeH, feeUsd }) => {
            const shortHash = `${s.txHash.slice(0, 6)}…${s.txHash.slice(-4)}`;
            return (
              <div
                key={s.txHash}
                className="dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-x-3 dvx:gap-y-0.5 dvx:rounded-lg dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:px-2.5 dvx:py-1.5 dvx:text-[11px]"
              >
                <span className="dvx:text-gray-400 dvx:w-[88px] dvx:shrink-0">
                  {new Date(s.timestamp).toLocaleString(i18n.language, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:flex-1 dvx:min-w-0">
                  {formatAmount(inH)} {ticker(s.tokenIn)}
                  <span className="dvx:text-gray-400 dvx:font-normal"> → </span>
                  {formatAmount(outH)} {ticker(s.tokenOut)}
                </span>
                {feeH && (
                  <span className="dvx:text-amber-600 dvx:dark:text-amber-400 dvx:whitespace-nowrap">
                    {t("pools_swap_fee_lp", {
                      amount: feeUsd != null ? formatUsd(feeUsd) : `${formatAmount(feeH)} ${ticker(s.tokenIn)}`,
                    })}
                  </span>
                )}
                {explorerAddress ? (
                  <a
                    href={`${explorerAddress}/transactions/${s.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dvx:text-amber-500 dvx:hover:text-amber-400 dvx:hover:underline dvx:whitespace-nowrap dvx:font-mono"
                  >
                    {shortHash} ↗
                  </a>
                ) : (
                  <span className="dvx:text-gray-400 dvx:font-mono">{shortHash}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
