import React, { useEffect, useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { useSwapConfig, SwapConfigProvider } from "../context/SwapConfigContext";
import type { SwapConfig } from "../context/SwapConfigContext";
import { useSwapView } from "../hooks/useSwapView";
import { SwapViewProvider } from "../context/SwapViewContext";
import widgetI18n from "../i18n";
import { getNearestThemeAncestor } from "../helpers/domTheme";
import { Swap } from "./Swap";
import { Liquidity } from "./Liquidity";
import { AddLiquidity } from "./AddLiquidity";
import { RemoveLiquidity } from "./RemoveLiquidity";
import { CreatePool } from "./CreatePool";
import { Pools } from "./Pools";

type SwapWidgetProps = Pick<SwapConfig, 'defaultFrom' | 'defaultTo' | 'whitelist' | 'blacklist' | 'address' | 'networkApiAddress' | 'chainId' | 'explorerAddress' | 'onSignTransactions'>;

export const SwapWidget: React.FC<SwapWidgetProps> = (props) => {
  const outerConfig = useSwapConfig();
  const { language, theme } = outerConfig;
  const { view, goTo } = useSwapView();

  // When theme is not pinned, mirror the host app's dark mode reactively.
  // Deliberately *not* falling back to prefers-color-scheme: a host with its own
  // light/dark toggle (e.g. our own dapp) signals "light" by simply not having the
  // class, which looks identical to "this host doesn't manage dark mode at all" —
  // a media-query fallback can't tell those apart, and would override an explicit
  // light choice whenever the OS/browser happens to prefer dark. A host that isn't
  // covered by this class convention should pass `theme="dark"` explicitly instead.
  //
  // Checked from this wrapper's *parent* (not itself) via getNearestThemeAncestor —
  // same "nearest .dark/.light ancestor wins" logic the compiled CSS custom-variant
  // uses, and the same helper TokenSelect uses for its own dark detection, so the
  // two can't disagree about a host's ancestry the way they used to (this used to
  // check only `document.documentElement`, missing a host that toggles the class
  // somewhere lower in the tree).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hostDark, setHostDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (theme !== undefined) return;
    const evaluate = () =>
      setHostDark(getNearestThemeAncestor(wrapperRef.current?.parentElement ?? null) === 'dark');
    evaluate();
    const observer = new MutationObserver(evaluate);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    const lang = (
      language ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en') ||
      'en'
    ).split('-')[0];
    if (widgetI18n.language !== lang && widgetI18n.isInitialized) {
      widgetI18n.changeLanguage(lang);
    }
  }, [language]);

  const themeClass =
    theme === 'dark' ? 'dark'
    : theme === 'light' ? 'light'
    : theme === 'mid' ? 'dark'
    : hostDark ? 'dark'
    : '';

  const renderView = () => {
    switch (view) {
      case 'liquidity':        return <Liquidity />;
      case 'add-liquidity':    return <AddLiquidity />;
      case 'remove-liquidity': return <RemoveLiquidity />;
      case 'create-pool':      return <CreatePool />;
      case 'pools':            return <Pools />;
      default:                 return <Swap />;
    }
  };

  // `dinovox-swap-widget` scopes widget.css's minimal reset (box-sizing,
  // native button/select/input chrome, fallback font) to this subtree only —
  // see the comment above that block in widget.css for why it's needed.
  //
  // `w-full max-w-[640px] mx-auto`: none of the views below (Swap, Liquidity,
  // AddLiquidity, RemoveLiquidity, Pools) cap their own width — only
  // CreatePool does (max-w-lg). Left to a host, this widget stretches to
  // whatever container it's placed in: capped nicely at 640px in dinotool-v2
  // (its own page wraps Swap in a 640px column), but edge-to-edge across the
  // full viewport in mx-faucet (no wrapping container at all) — the same
  // "looks right only where the host happens to constrain it" pattern as
  // .dinoButton/the font stack elsewhere in this file, just at the layout
  // level instead of styling. Capping it here means every host gets the same
  // card-like presentation by default, with or without its own wrapper.
  const rootClassName = ['dinovox-swap-widget dvx:w-full dvx:max-w-[640px] dvx:mx-auto', themeClass]
    .filter(Boolean)
    .join(' ');

  return (
    <I18nextProvider i18n={widgetI18n}>
      <SwapConfigProvider config={{ ...outerConfig, ...props }}>
        <SwapViewProvider value={goTo}>
          <div ref={wrapperRef} className={rootClassName}>{renderView()}</div>
        </SwapViewProvider>
      </SwapConfigProvider>
    </I18nextProvider>
  );
};
