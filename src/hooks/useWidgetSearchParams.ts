import { getCurrentView } from './useSwapView';

type Updater = (prev: URLSearchParams) => URLSearchParams;
type SetParams = (updater: Updater, options?: { replace?: boolean }) => void;

export function useWidgetSearchParams(): [URLSearchParams, SetParams] {
  const params = new URLSearchParams(window.location.search);

  const setParams: SetParams = (updater, options) => {
    const next = updater(new URLSearchParams(window.location.search));
    // The view on screen, not whatever hash the URL still has (see getCurrentView).
    const view = getCurrentView();
    const hash = view === 'swap' ? window.location.hash.replace(/^#swap$/, '') : '#' + view;
    const qs = next.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '') + hash;
    if (options?.replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  };

  return [params, setParams];
}
