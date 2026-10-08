import React from "react";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";
import { useSwapConfig } from "../context/SwapConfigContext";
import { getThemePalette } from "./themePalette";

const ACTIVE_CLASS =
  "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md dvx:font-black";
const INACTIVE_CLASS =
  "dvx:text-gray-400 dvx:bg-transparent dvx:font-bold dvx:hover:text-gray-900 dvx:dark:hover:text-white dvx:hover:bg-white/50 dvx:dark:hover:bg-white/5";

export type Section = "swap" | "dca" | "liquidity";

/**
 * Top-level sections, rendered as the card title itself (in place of the old
 * per-view heading): the active one reads as the title, the others are dimmed
 * clickable entries next to it.
 */
export const SectionTabs = ({ active }: { active: Section }) => {
  const goTo = useGoTo();
  const { t } = useTranslation("swap");

  const tabs: { key: Section; icon: string; label: string }[] = [
    { key: "swap", icon: "🔄", label: t("tab_swap") },
    { key: "dca", icon: "⏱️", label: t("tab_dca") },
    { key: "liquidity", icon: "💧", label: t("tab_liquidity") },
  ];

  return (
    <div className="dvx:flex dvx:items-center dvx:gap-4">
      {tabs.map((tab, i) => {
        const isActive = active === tab.key;
        return (
          <React.Fragment key={tab.key}>
            {i > 0 && (
              <span
                aria-hidden
                className="dvx:h-5 dvx:w-px dvx:bg-gray-300 dvx:dark:bg-[#444]"
              />
            )}
            <button
              type="button"
              onClick={isActive ? undefined : () => goTo(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`dvx:flex dvx:items-center dvx:gap-2 dvx:bg-transparent dvx:p-0 dvx:text-lg dvx:font-black dvx:tracking-tight dvx:transition-all dvx:focus:outline-none ${
                isActive
                  ? "dvx:text-gray-900 dvx:dark:text-white dvx:cursor-default"
                  : "dvx:text-gray-400 dvx:opacity-60 dvx:hover:opacity-100 dvx:hover:text-gray-700 dvx:dark:hover:text-gray-200"
              }`}
            >
              <span
                className={`dvx:text-xl ${isActive ? "" : "dvx:grayscale"}`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Sub-tabs of the Liquidity section, shown in the card header of Liquidity / Pools. */
export const LiquiditySubTabs = ({
  active,
}: {
  active: "liquidity" | "pools";
}) => {
  const goTo = useGoTo();
  const { theme } = useSwapConfig();
  const p = getThemePalette(theme);
  const { t } = useTranslation("swap");

  const tabs: { key: "liquidity" | "pools"; label: string }[] = [
    { key: "liquidity", label: t("tab_my_liquidity") },
    { key: "pools", label: t("pools_title") },
  ];

  return (
    <div
      style={p.tabBar}
      className="dvx:flex dvx:gap-1.5 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:shadow-inner dvx:w-full dvx:xs:w-auto"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={isActive ? undefined : () => goTo(tab.key)}
            style={isActive ? p.activeTab : undefined}
            className={`dvx:flex-1 dvx:xs:flex-initial dvx:px-3 dvx:sm:px-5 dvx:py-2 dvx:text-sm dvx:rounded-lg dvx:transition-all dvx:whitespace-nowrap ${
              isActive ? ACTIVE_CLASS : INACTIVE_CLASS
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
