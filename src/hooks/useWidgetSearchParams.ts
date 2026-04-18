import { useWidgetRouter } from '../context/WidgetRouterContext';

type Updater = (prev: URLSearchParams) => URLSearchParams;
type Options = { replace?: boolean };
type SetParams = (updater: Updater, options?: Options) => void;

export function useWidgetSearchParams(): [URLSearchParams, SetParams] {
  const router = useWidgetRouter();

  if (router) {
    const setParams: SetParams = router.setParams ?? ((updater, options) => {
      const next = updater(new URLSearchParams(window.location.search));
      const url = new URL(window.location.href);
      url.search = next.toString();
      if (options?.replace) {
        window.history.replaceState({}, '', url.toString());
      } else {
        window.history.pushState({}, '', url.toString());
      }
    });
    return [router.params, setParams];
  }

  // Standalone fallback: read/write window.location directly
  const params = new URLSearchParams(window.location.search);

  const setParams: SetParams = (updater, options) => {
    const next = updater(new URLSearchParams(window.location.search));
    const url = new URL(window.location.href);
    url.search = next.toString();
    if (options?.replace) {
      window.history.replaceState({}, '', url.toString());
    } else {
      window.history.pushState({}, '', url.toString());
    }
  };

  return [params, setParams];
}
