import React from "react";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";

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
