import React, { useState, useCallback, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { useSwapConfig, SwapRoutes } from "../context/SwapConfigContext";
import WidgetRouterContext from "../context/WidgetRouterContext";
import widgetI18n from "../i18n";
import { Swap } from "./Swap";
import { Liquidity } from "./Liquidity";
import { AddLiquidity } from "./AddLiquidity";
import { RemoveLiquidity } from "./RemoveLiquidity";
import { CreatePool } from "./CreatePool";
import { Pools } from "./Pools";

type View = keyof SwapRoutes;

interface RouterState {
  view: View;
  params: URLSearchParams;
}

type ParamsUpdater = (prev: URLSearchParams) => URLSearchParams;

const VIEW_TO_HASH: Record<View, string> = {
  swap: "",
  liquidity: "#liquidity",
  addLiquidity: "#add-liquidity",
  removeLiquidity: "#remove-liquidity",
  createPool: "#create-pool",
  pools: "#pools",
};

const HASH_TO_VIEW: Record<string, View> = Object.fromEntries(
  Object.entries(VIEW_TO_HASH).map(([v, h]) => [h, v as View]),
);

function pathToView(pathname: string, routes: SwapRoutes): View {
  const entries = Object.entries(routes) as [View, string][];
  entries.sort((a, b) => b[1].length - a[1].length);
  for (const [view, route] of entries) {
    if (pathname === route) return view;
  }
  return "swap";
}

function viewFromHash(hash: string): View | null {
  return HASH_TO_VIEW[hash] ?? null;
}

interface SwapWidgetProps {
  initialView?: View;
}

export const SwapWidget: React.FC<SwapWidgetProps> = ({
  initialView = "swap",
}) => {
  const { routes, language, theme } = useSwapConfig();

  // When theme is not pinned, mirror the host app's <html> dark class reactively
  const [hostDark, setHostDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (theme !== undefined) return; // pinned theme, no need to observe
    const html = document.documentElement;
    setHostDark(html.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setHostDark(html.classList.contains('dark'));
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  // Sync language from config or navigator into the widget's own i18n instance
  useEffect(() => {
    const lang = (
      language ||
      (typeof navigator !== "undefined" ? navigator.language : "en") ||
      "en"
    ).split("-")[0];
    if (widgetI18n.language !== lang && widgetI18n.isInitialized) {
      widgetI18n.changeLanguage(lang);
    }
  }, [language]);

  const [{ view, params }, setRouterState] = useState<RouterState>(() => {
    const hashView =
      typeof window !== "undefined" ? viewFromHash(window.location.hash) : null;
    return {
      view: hashView ?? initialView,
      params: new URLSearchParams(window.location.search),
    };
  });

  const navigate = useCallback(
    (path: string) => {
      const [pathname, search] = path.split("?");
      const nextView = pathToView(pathname, routes);
      const hash = VIEW_TO_HASH[nextView];
      const newParams = new URLSearchParams(search ?? "");
      const newSearch = newParams.toString() ? "?" + newParams.toString() : "";
      window.history.pushState(
        null,
        "",
        window.location.pathname + newSearch + hash,
      );
      setRouterState({
        view: nextView,
        params: new URLSearchParams(search ?? ""),
      });
    },
    [routes],
  );

  const setParams = useCallback(
    (updater: ParamsUpdater, options?: { replace?: boolean }) => {
      setRouterState((prev) => {
        const next = updater(prev.params);
        const hash = VIEW_TO_HASH[prev.view];
        const url = window.location.pathname + "?" + next.toString() + hash;
        if (options?.replace) {
          window.history.replaceState(null, "", url);
        } else {
          window.history.pushState(null, "", url);
        }
        return { ...prev, params: next };
      });
    },
    [],
  );

  // Sync view when user presses browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const hashView = viewFromHash(window.location.hash);
      if (hashView) {
        setRouterState((prev) => ({
          ...prev,
          view: hashView,
          params: new URLSearchParams(window.location.search),
        }));
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Set initial hash if the current view has one and the URL doesn't yet
  useEffect(() => {
    const hash = VIEW_TO_HASH[view];
    if (hash && !window.location.hash) {
      window.history.replaceState(null, "", hash);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderView = () => {
    switch (view) {
      case "liquidity":
        return <Liquidity />;
      case "addLiquidity":
        return <AddLiquidity />;
      case "removeLiquidity":
        return <RemoveLiquidity />;
      case "createPool":
        return <CreatePool />;
      case "pools":
        return <Pools />;
      default:
        return <Swap />;
    }
  };

  const themeClass =
    theme === "dark" ? "dark"
    : theme === "light" ? "light"
    : hostDark ? "dark"
    : "";

  return (
    <I18nextProvider i18n={widgetI18n}>
      <WidgetRouterContext.Provider value={{ params, navigate, setParams }}>
        <div className={themeClass || undefined}>{renderView()}</div>
      </WidgetRouterContext.Provider>
    </I18nextProvider>
  );
};
