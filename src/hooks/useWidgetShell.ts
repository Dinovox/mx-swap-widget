import { useEffect, useRef, useState } from "react";
import widgetI18n from "../i18n";
import { getNearestThemeAncestor } from "../helpers/domTheme";
import type { SwapConfig } from "../context/SwapConfigContext";

/**
 * Shared shell of the widget roots (SwapWidget, SwapModal): keeps the
 * widget's own i18n instance on the configured language, and resolves the
 * theme class.
 *
 * When theme is not pinned, mirror the host app's dark mode reactively.
 * Deliberately *not* falling back to prefers-color-scheme: a host with its own
 * light/dark toggle (e.g. our own dapp) signals "light" by simply not having the
 * class, which looks identical to "this host doesn't manage dark mode at all" —
 * a media-query fallback can't tell those apart, and would override an explicit
 * light choice whenever the OS/browser happens to prefer dark. A host that isn't
 * covered by this class convention should pass `theme="dark"` explicitly instead.
 *
 * Checked from the root's *parent* (not itself) via getNearestThemeAncestor —
 * same "nearest .dark/.light ancestor wins" logic the compiled CSS custom-variant
 * uses, and the same helper TokenSelect uses for its own dark detection.
 */
export function useWidgetShell(language: SwapConfig["language"], theme: SwapConfig["theme"]) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hostDark, setHostDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    if (theme !== undefined) return;
    const evaluate = () =>
      setHostDark(getNearestThemeAncestor(wrapperRef.current?.parentElement ?? null) === "dark");
    evaluate();
    const observer = new MutationObserver(evaluate);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"], subtree: true });
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    const lang = (language || (typeof navigator !== "undefined" ? navigator.language : "en") || "en").split("-")[0];
    if (widgetI18n.language !== lang && widgetI18n.isInitialized) {
      widgetI18n.changeLanguage(lang);
    }
  }, [language]);

  const themeClass =
    theme === "dark" ? "dark" : theme === "light" ? "light" : theme === "mid" ? "dark" : hostDark ? "dark" : "";

  return { wrapperRef, themeClass };
}
