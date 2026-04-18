import { createContext, useContext } from 'react';

type ParamsUpdater = (prev: URLSearchParams) => URLSearchParams;

interface WidgetRouterContextValue {
  params: URLSearchParams;
  navigate: (path: string) => void;
  setParams: (updater: ParamsUpdater, options?: { replace?: boolean }) => void;
}

const WidgetRouterContext = createContext<WidgetRouterContextValue | null>(null);

export const useWidgetRouter = () => useContext(WidgetRouterContext);

export default WidgetRouterContext;
