import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { useSwapConfig, SwapConfigProvider } from "../context/SwapConfigContext";
import type { SwapConfig } from "../context/SwapConfigContext";
import { useSwapView } from "../hooks/useSwapView";
import { SwapViewProvider } from "../context/SwapViewContext";
import widgetI18n from "../i18n";
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

  // When theme is not pinned, mirror the host app's <html> dark class reactively
  const [hostDark, setHostDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    if (theme !== undefined) return;
    const html = document.documentElement;
    setHostDark(html.classList.contains('dark'));
    const observer = new MutationObserver(() => setHostDark(html.classList.contains('dark')));
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
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

  return (
    <I18nextProvider i18n={widgetI18n}>
      <SwapConfigProvider config={{ ...outerConfig, ...props }}>
        <SwapViewProvider value={goTo}>
          <div className={themeClass || undefined}>{renderView()}</div>
        </SwapViewProvider>
      </SwapConfigProvider>
    </I18nextProvider>
  );
};
