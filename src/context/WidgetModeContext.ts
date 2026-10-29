import { createContext, useContext } from "react";

/**
 * How the widget is mounted:
 *  - "page"  (SwapWidget): full widget with section tabs, hash routing and
 *    token selections mirrored to the URL (?from=&to=).
 *  - "modal" (SwapModal): swap form only, opened over a host page — never
 *    touches the host URL; links to other views go through the host's
 *    onNavigate (hidden when the host doesn't provide one).
 */
export interface WidgetMode {
  mode: "page" | "modal";
  /** false → hide buttons that would navigate to another widget view. */
  canNavigate: boolean;
}

const WidgetModeContext = createContext<WidgetMode>({ mode: "page", canNavigate: true });

export const WidgetModeProvider = WidgetModeContext.Provider;
export const useWidgetMode = () => useContext(WidgetModeContext);
