import React from "react";
import { createPortal } from "react-dom";
import { I18nextProvider, useTranslation } from "react-i18next";
import { X } from "lucide-react";
import widgetI18n from "../i18n";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { useSwapConfig, SwapConfigProvider } from "../context/SwapConfigContext";
import { SwapViewProvider } from "../context/SwapViewContext";
import { WidgetModeProvider } from "../context/WidgetModeContext";
import { useWidgetShell } from "../hooks/useWidgetShell";
import type { SwapView } from "../hooks/useSwapView";
import type { SwapWidgetProps } from "./SwapWidget";
import { Swap } from "./Swap";

export interface SwapModalProps extends Omit<SwapWidgetProps, "defaultFrom" | "defaultTo"> {
  /** Controlled visibility. */
  open: boolean;
  /** Called on ✕, Escape, or a click on the backdrop. */
  onClose: () => void;
  /** Token sold (identifier, e.g. "USDC-c76f1f" or "EGLD"). */
  tokenIn?: string;
  /** Token bought. */
  tokenOut?: string;
  /**
   * Optional: where links to another widget view should go (e.g. "add
   * liquidity" hints) — typically the host's full /swap page. When omitted,
   * those links are hidden: the modal never changes the host page URL.
   */
  onNavigate?: (view: SwapView, params?: Record<string, string>) => void;
  /** CSS z-index of the overlay (default 1000). */
  zIndex?: number;
}

/**
 * Swap form in a modal, opened over any host page (e.g. Buy / Sell buttons
 * of a token chart) — same swap engine as SwapWidget, without section tabs
 * nor hash routing, and without ever touching the host URL. Rendered in a
 * portal on document.body.
 */
export const SwapModal: React.FC<SwapModalProps> = ({ open, onClose, tokenIn, tokenOut, onNavigate, zIndex = 1000, ...props }) => {
  const outerConfig = useSwapConfig();
  const { wrapperRef, themeClass } = useWidgetShell(outerConfig.language, outerConfig.theme);

  // Escape closes; page scroll locked while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const goTo = (view: SwapView, params?: Record<string, string>) => {
    if (!onNavigate) return;
    onClose();
    onNavigate(view, params);
  };

  return createPortal(
    <I18nextProvider i18n={widgetI18n}>
      <SwapConfigProvider config={{ ...outerConfig, ...props, defaultFrom: tokenIn, defaultTo: tokenOut }}>
        <SwapViewProvider value={goTo}>
          <WidgetModeProvider value={{ mode: "modal", canNavigate: !!onNavigate }}>
            <div
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => e.target === e.currentTarget && onClose()}
              style={{
                position: "fixed",
                inset: 0,
                zIndex,
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                overflowY: "auto",
                padding: "48px 12px",
              }}
            >
              <div
                ref={wrapperRef}
                className={["dinovox-swap-widget", themeClass].filter(Boolean).join(" ")}
                style={{ position: "relative", width: "100%", maxWidth: 480 }}
              >
                <CloseButton onClose={onClose} />
                {/* Unmounted while closed → fresh form on every opening; the key
                    also resets it when the tokens change while open. */}
                <Swap key={`${tokenIn ?? ""}|${tokenOut ?? ""}`} />
              </div>
            </div>
          </WidgetModeProvider>
        </SwapViewProvider>
      </SwapConfigProvider>
    </I18nextProvider>,
    document.body,
  );
};

function CloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={t("modal_close")}
      title={t("modal_close")}
      className="dvx:text-gray-400 dvx:hover:text-gray-700 dvx:dark:hover:text-white dvx:bg-transparent"
      style={{ position: "absolute", top: 14, right: 14, zIndex: 1, padding: 4, lineHeight: 0, border: 0, cursor: "pointer" }}
    >
      <X style={{ width: 20, height: 20 }} />
    </button>
  );
}
