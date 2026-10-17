import React from "react";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";

export type Section = "swap" | "dca" | "liquidity" | "farms";

/**
 * Top-level sections, rendered as the card title itself (in place of the old
 * per-view heading): the active one reads as the title, the others are dimmed
 * clickable entries next to it.
 */
export const SectionTabs = ({ active }: { active: Section }) => {
  const goTo = useGoTo();
  const { t } = useTranslation("swap");

  // Fit the 4 sections in the available width by stepping down a size ladder,
  // keeping every label readable as long as possible: icons-only for the
  // inactive tabs is the LAST resort. Driven by real overflow (measured after
  // render, re-checked on resize) — not a viewport breakpoint, and all sizes
  // are inline so it doesn't depend on the host serving the latest CSS.
  const LEVELS = [
    { font: 18, icon: 20, gap: 16, inner: 8, labels: true },
    { font: 15, icon: 17, gap: 11, inner: 6, labels: true },
    { font: 13, icon: 15, gap: 8, inner: 4, labels: true },
    { font: 15, icon: 17, gap: 10, inner: 6, labels: false }, // inactive = icon only
  ] as const;
  // wrapRef = available width (100%, min-width 0, overflow hidden: it can't be
  // widened by its content, so the page never overflows); rowRef = the tabs at
  // their natural width, measured against it.
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [level, setLevel] = React.useState(0);
  const [widthKey, setWidthKey] = React.useState(0);
  React.useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    let last = wrap.clientWidth;
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth === last) return;
      last = wrap.clientWidth;
      setLevel(0); // re-fit from the most readable size
      setWidthKey((k) => k + 1);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);
  React.useLayoutEffect(() => {
    const row = rowRef.current;
    const wrap = wrapRef.current;
    if (!row || !wrap) return;
    if (row.offsetWidth > wrap.clientWidth && level < LEVELS.length - 1) setLevel(level + 1);
  }, [level, widthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Labels change with the language → re-fit from the top.
  const labelsKey = `${t("tab_swap")}|${t("tab_dca")}|${t("tab_liquidity")}|${t("tab_farms")}`;
  React.useLayoutEffect(() => {
    setLevel(0);
    setWidthKey((k) => k + 1);
  }, [labelsKey]);
  const L = LEVELS[level];

  const tabs: { key: Section; icon: string; label: string }[] = [
    { key: "swap", icon: "🔄", label: t("tab_swap") },
    { key: "dca", icon: "⏱️", label: t("tab_dca") },
    { key: "liquidity", icon: "💧", label: t("tab_liquidity") },
    { key: "farms", icon: "🌾", label: t("tab_farms") },
  ];

  return (
    // contain: inline-size → the wrapper's intrinsic width ignores its content,
    // so the natural-width row can't size the card (a 100% width alone isn't
    // enough: percentages resolve to auto while ancestors size to content).
    <div ref={wrapRef} style={{ width: "100%", minWidth: 0, overflow: "hidden", contain: "inline-size" }}>
    <div ref={rowRef} className="dvx:flex dvx:items-center" style={{ gap: L.gap, width: "max-content" }}>
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
              aria-label={tab.label}
              title={tab.label}
              style={{ fontSize: L.font, gap: L.inner }}
              className={`dvx:flex dvx:items-center dvx:whitespace-nowrap dvx:bg-transparent dvx:p-0 dvx:font-black dvx:tracking-tight dvx:transition-all dvx:focus:outline-none ${
                isActive
                  ? "dvx:text-gray-900 dvx:dark:text-white dvx:cursor-default"
                  : "dvx:text-gray-400 dvx:opacity-60 dvx:hover:opacity-100 dvx:hover:text-gray-700 dvx:dark:hover:text-gray-200"
              }`}
            >
              <span style={{ fontSize: L.icon, lineHeight: 1, filter: isActive ? undefined : "grayscale(1)" }}>
                {tab.icon}
              </span>
              {(isActive || L.labels) && <span>{tab.label}</span>}
            </button>
          </React.Fragment>
        );
      })}
    </div>
    </div>
  );
};
