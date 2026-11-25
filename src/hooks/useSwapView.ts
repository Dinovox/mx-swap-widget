import { useState, useEffect, useCallback } from 'react';

export type SwapView =
  | 'swap'
  | 'liquidity'
  | 'add-liquidity'
  | 'remove-liquidity'
  | 'create-pool'
  | 'pools'
  | 'dca'
  | 'farms'
  | 'farms-rewards'
  | 'limit'
  | 'fees';

const VALID_VIEWS = new Set<string>([
  'swap', 'liquidity', 'add-liquidity', 'remove-liquidity', 'create-pool', 'pools', 'dca', 'farms', 'farms-rewards', 'limit', 'fees',
]);

// Custom event dispatched by goTo so all useSwapView instances stay in sync
const WIDGET_NAV_EVENT = 'widget-nav';

function getViewFromHash(): SwapView {
  const hash = window.location.hash.replace('#', '');
  return VALID_VIEWS.has(hash) ? (hash as SwapView) : 'swap';
}

// View on screen, read by useWidgetSearchParams to write the URL hash: the
// host may drop the hash behind the widget's back (e.g. a router redirect to
// the bare pathname after connecting) while the view stays mounted, and the
// next ?from=&to= sync would then publish a link that opens the swap tab.
let currentView: SwapView = getViewFromHash();
export const getCurrentView = () => currentView;

export function useSwapView() {
  const [view, setView] = useState<SwapView>(getViewFromHash);
  currentView = view;

  useEffect(() => {
    const sync = () => setView(getViewFromHash());
    window.addEventListener('popstate', sync);
    window.addEventListener(WIDGET_NAV_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(WIDGET_NAV_EVENT, sync);
    };
  }, []);

  const goTo = useCallback((target: SwapView, searchParams?: Record<string, string>) => {
    const qs = searchParams ? '?' + new URLSearchParams(searchParams).toString() : '';
    window.history.pushState(null, '', window.location.pathname + qs + '#' + target);
    window.dispatchEvent(new CustomEvent(WIDGET_NAV_EVENT));
  }, []);

  return { view, goTo };
}
