import { useWidgetRouter } from '../context/WidgetRouterContext';
import { useSwapConfig } from '../context/SwapConfigContext';

export function useWidgetNavigate(): (path: string) => void {
  const router = useWidgetRouter();
  const config = useSwapConfig();
  if (router) return router.navigate;
  return config.navigate ?? ((path: string) => { window.location.assign(path); });
}
