import React from "react";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";

// Quote-side tokens, most "base" first: the DCA shortcut spends the base token
// to accumulate the other one (pool tokenA/tokenB order is alphabetical, not
// semantic). Neither listed → keep the pool order.
const DCA_BASE_TICKERS = ["USDC", "WEGLD", "VOXEGLD"];

export function dcaDirection(tokenA: string, tokenB: string): { tokenIn: string; tokenOut: string } {
  const rank = (id: string) => {
    const i = DCA_BASE_TICKERS.indexOf(id.split("-")[0]);
    return i === -1 ? Infinity : i;
  };
  return rank(tokenB) < rank(tokenA) ? { tokenIn: tokenB, tokenOut: tokenA } : { tokenIn: tokenA, tokenOut: tokenB };
}

/** "⏱️ DCA" shortcut for a dcaReady pool — opens the DCA tab preset on the pair. */
export const DcaBadge = ({ tokenA, tokenB }: { tokenA: string; tokenB: string }) => {
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  return (
    <button
      type="button"
      onClick={() => goTo("dca", dcaDirection(tokenA, tokenB))}
      title={t("pools_dca_ready_tooltip")}
      className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-500 dvx:dark:text-gray-300 dvx:border dvx:border-gray-200 dvx:dark:border-[#3a3a3a] dvx:hover:text-amber-500 dvx:hover:border-amber-400 dvx:transition-colors dvx:whitespace-nowrap"
    >
      <span aria-hidden>⏱️</span>
      {t("tab_dca")}
    </button>
  );
};
