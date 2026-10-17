import React from "react";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";

/** "🌾 Farm" shortcut for a pool whose LP token has live farm rewards — opens the Farms tab. */
export const FarmBadge = ({ pool }: { pool?: string }) => {
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  return (
    <button
      type="button"
      // ?pool= → the Farms tab opens filtered on this pool's farm (GET /farms?pool=).
      onClick={() => goTo("farms", pool ? { pool } : undefined)}
      title={t("pools_farm_tooltip")}
      className="dvx:inline-flex dvx:w-fit dvx:shrink-0 dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-500 dvx:dark:text-gray-300 dvx:border dvx:border-gray-200 dvx:dark:border-[#3a3a3a] dvx:hover:text-amber-500 dvx:hover:border-amber-400 dvx:transition-colors dvx:whitespace-nowrap"
    >
      <span aria-hidden>🌾</span>
      {t("tab_farms")}
    </button>
  );
};
