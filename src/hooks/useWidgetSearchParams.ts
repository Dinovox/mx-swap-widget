type Updater = (prev: URLSearchParams) => URLSearchParams;
type SetParams = (updater: Updater, options?: { replace?: boolean }) => void;

export function useWidgetSearchParams(): [URLSearchParams, SetParams] {
  const params = new URLSearchParams(window.location.search);

  const setParams: SetParams = (updater, options) => {
    const next = updater(new URLSearchParams(window.location.search));
    const hash = window.location.hash;
    const url = window.location.pathname + '?' + next.toString() + hash;
    if (options?.replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
  };

  return [params, setParams];
}
