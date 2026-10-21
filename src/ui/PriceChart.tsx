import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Maximize2, X } from "lucide-react";
import { fetchCandles, type Candle, type ChartableEntry, type ChartInterval } from "../helpers/charts";

// viewBox width — the SVG stretches to the container; wicks / guides use
// non-scaling-stroke so they stay 1px whatever the aspect ratio.
const W = 600;
const PAD_Y = 8;

// The user picks a PERIOD; the candle size follows it (keeps ~24–180 candles).
const PERIODS: Array<{ days: number; interval: ChartInterval }> = [
  { days: 1, interval: "1h" },
  { days: 7, interval: "1h" },
  { days: 30, interval: "4h" },
  { days: 90, interval: "1d" },
];
const INTERVAL_MS: Record<ChartInterval, number> = { "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };

// Direction colors (price up / down) — inline so they don't depend on host CSS.
const UP = "#16a34a";
const DOWN = "#ef4444";

/** Price with ~5 significant digits, no scientific notation for tiny values. */
function fmtPrice(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(4);
  const digits = Math.min(12, Math.max(2, -Math.floor(Math.log10(v)) + 4));
  return v.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Chart continuity: /ohlc candles open at their own first trade, so with sparse
 * trading each candle floats at an unrelated level (and a single-trade candle
 * has no body). Like standard charts, open each candle at the PREVIOUS close
 * (widening high/low to include it) — levels connect and every move shows.
 */
function withContinuity(candles: Candle[]): Candle[] {
  return candles.map((c, i) => {
    if (i === 0) return c;
    const open = candles[i - 1].close;
    return { ...c, open, high: Math.max(c.high, open), low: Math.min(c.low, open) };
  });
}

const STORAGE_KEY = "dvx-swap-chart-open";

type Props = {
  apiUrl: string;
  entries: ChartableEntry[];
  tickerOf: (id: string) => string;
  /**
   * Inside another card (e.g. a pool card's "Price" disclosure): no own frame,
   * always open (the host disclosure handles collapsing), no remembered state.
   */
  embedded?: boolean;
};

/**
 * Candlestick price chart of a token against VOXEGLD / USDC / WEGLD (direct
 * DinoVox pools only). `entries` = the chartable entries of ONE token (one per
 * quote currency). Collapsible inline card + an enlarged modal view.
 */
export const PriceChart = ({ apiUrl, entries, tickerOf, embedded = false }: Props) => {
  const { t, i18n } = useTranslation("swap");
  const [openState, setOpen] = React.useState(() => {
    if (embedded) return true;
    try {
      return localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(STORAGE_KEY, o ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !o;
    });
  const open = embedded || openState;
  const [enlarged, setEnlarged] = React.useState(false);

  const [quote, setQuote] = React.useState(entries[0]?.quote);
  const entry = entries.find((e) => e.quote === quote) ?? entries[0];
  React.useEffect(() => {
    if (!entries.some((e) => e.quote === quote)) setQuote(entries[0]?.quote);
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps

  const [days, setDays] = React.useState(7);
  const interval = PERIODS.find((p) => p.days === days)!.interval;
  const [candles, setCandles] = React.useState<Candle[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if ((!open && !enlarged) || !entry) return;
    let cancelled = false;
    setCandles(null);
    setFailed(false);
    fetchCandles(apiUrl, entry, interval, days)
      .then((c) => !cancelled && setCandles(withContinuity(c)))
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setCandles([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, entry?.poolAddress, entry?.invertPrice, interval, days, open, enlarged]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes the enlarged view.
  React.useEffect(() => {
    if (!enlarged) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEnlarged(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enlarged]);

  if (!entry) return null;
  const pair = `${tickerOf(entry.token)} / ${tickerOf(entry.quote)}`;
  const list = candles ?? [];
  const first = list[0];
  const last = list[list.length - 1];
  const changePct = first && last && first.open > 0 ? ((last.close - first.open) / first.open) * 100 : null;
  const periodLabel = days === 1 ? "24h" : t("chart_period", { count: days });

  const summary = (big: boolean) =>
    last && (
      <>
        <span className={`${big ? "dvx:text-base" : "dvx:text-xs"} dvx:font-bold dvx:text-gray-900 dvx:dark:text-white`}>
          {fmtPrice(last.close)} <span className="dvx:text-gray-400 dvx:font-medium">{tickerOf(entry.quote)}</span>
        </span>
        {changePct != null && (
          <span className={`${big ? "dvx:text-sm" : "dvx:text-[11px]"} dvx:font-bold`} style={{ color: changePct >= 0 ? UP : DOWN }}>
            {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
            <span className="dvx:text-gray-400 dvx:font-medium"> {periodLabel}</span>
          </span>
        )}
      </>
    );

  const controls = (
    <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
      <div className="dvx:flex dvx:gap-1">
        {entries.length > 1 &&
          entries.map((e) => (
            <button
              key={e.quote}
              type="button"
              onClick={() => setQuote(e.quote)}
              className={`dvx:px-2 dvx:py-0.5 dvx:text-[10px] dvx:font-bold dvx:rounded-md ${
                e.quote === entry.quote
                  ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-sm"
                  : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
              }`}
            >
              {tickerOf(e.quote)}
            </button>
          ))}
      </div>
      <div className="dvx:flex dvx:gap-1 dvx:p-0.5 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-lg">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            title={t("chart_candles", { interval: t(`chart_interval_${p.interval}`) })}
            className={`dvx:px-2 dvx:py-0.5 dvx:text-[10px] dvx:font-bold dvx:rounded-md ${
              days === p.days
                ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-sm"
                : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
            }`}
          >
            {p.days === 1 ? "24h" : t("chart_period", { count: p.days })}
          </button>
        ))}
      </div>
    </div>
  );

  const body = (height: number, gridLines: number) =>
    candles == null ? (
      <div className="dvx:flex dvx:items-center dvx:justify-center" style={{ height }}>
        <div className="dvx:w-5 dvx:h-5 dvx:border-2 dvx:border-amber-500 dvx:border-t-transparent dvx:rounded-full dvx:animate-spin" />
      </div>
    ) : list.length === 0 ? (
      // Empty = no indexed history yet (or fetch failed): an info state, not an error.
      <p className="dvx:flex dvx:items-center dvx:justify-center dvx:text-center dvx:px-4 dvx:text-xs dvx:text-gray-400" style={{ height }}>
        {failed ? t("chart_unavailable") : t("chart_no_data")}
      </p>
    ) : (
      <CandleCanvas
        candles={list}
        interval={interval}
        days={days}
        height={height}
        gridLines={gridLines}
        locale={i18n.language}
        tradesLabel={(count) => t("chart_trades", { count })}
      />
    );

  return (
    <div
      className={
        embedded
          ? "dvx:mt-3"
          : "dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:px-4 dvx:py-3"
      }
    >
      {/* Header: toggle + pair + last price / change · enlarge */}
      <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2">
        <button
          type="button"
          onClick={embedded ? undefined : toggle}
          className={`dvx:flex dvx:items-center dvx:gap-2 dvx:min-w-0 dvx:flex-wrap dvx:bg-transparent dvx:p-0 dvx:text-left ${embedded ? "dvx:cursor-default" : ""}`}
        >
          <span className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
            📈 {t("chart_title", { pair })}
          </span>
          {open && summary(false)}
        </button>
        <span className="dvx:flex dvx:items-center dvx:gap-2 dvx:shrink-0">
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            title={t("chart_enlarge")}
            aria-label={t("chart_enlarge")}
            className="dvx:p-1 dvx:rounded-md dvx:bg-transparent dvx:text-gray-400 dvx:hover:text-amber-500"
          >
            <Maximize2 className="dvx:h-3.5 dvx:w-3.5" />
          </button>
          {!embedded && (
            <button type="button" onClick={toggle} aria-label={t("chart_title", { pair })} className="dvx:p-1 dvx:bg-transparent">
              <ChevronDown className={`dvx:h-3.5 dvx:w-3.5 dvx:text-gray-400 dvx:transition-transform ${open ? "dvx:rotate-180" : ""}`} />
            </button>
          )}
        </span>
      </div>

      {open && !enlarged && (
        <div className="dvx:mt-2 dvx:space-y-2">
          {controls}
          {body(160, 3)}
        </div>
      )}

      {/* Enlarged view: modal over the page (Esc / click outside / ✕ to close) */}
      {enlarged && (
        <div
          className="dvx:fixed dvx:inset-0 dvx:z-50 dvx:flex dvx:items-center dvx:justify-center dvx:p-3"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
          onClick={() => setEnlarged(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("chart_title", { pair })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="dvx:w-full dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-[#ffffff] dvx:dark:bg-[#1e1e1e] dvx:p-5 dvx:shadow-xl dvx:space-y-3"
            style={{ maxWidth: 960 }}
          >
            <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3">
              <div className="dvx:flex dvx:items-center dvx:gap-3 dvx:flex-wrap dvx:min-w-0">
                <span className="dvx:text-sm dvx:font-black dvx:text-gray-900 dvx:dark:text-white">📈 {t("chart_title", { pair })}</span>
                {summary(true)}
              </div>
              <button
                type="button"
                onClick={() => setEnlarged(false)}
                aria-label={t("chart_close")}
                className="dvx:p-1 dvx:rounded-md dvx:bg-transparent dvx:text-gray-400 dvx:hover:text-gray-900 dvx:dark:hover:text-white dvx:shrink-0"
              >
                <X className="dvx:h-5 dvx:w-5" />
              </button>
            </div>
            {controls}
            {body(Math.min(420, Math.max(240, Math.round(window.innerHeight * 0.55))), 5)}
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */

function CandleCanvas({
  candles,
  interval,
  days,
  height,
  gridLines,
  locale,
  tradesLabel,
}: {
  candles: Candle[];
  interval: ChartInterval;
  days: number;
  height: number;
  gridLines: number;
  locale: string;
  tradesLabel: (count: number) => string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const H = height;
  const step = INTERVAL_MS[interval];

  // Time-based x over the whole selected period (gaps without trades stay
  // visible), price y padded 6% above/below.
  const now = Date.now();
  const t0 = Math.min(candles[0].time, now - days * 86_400_000);
  const t1 = Math.max(candles[candles.length - 1].time + step, now);
  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const span = hi - lo || hi * 0.02 || 1;
  const yLo = lo - span * 0.06;
  const yHi = hi + span * 0.06;
  const x = (time: number) => ((time - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => PAD_Y + (1 - (v - yLo) / (yHi - yLo)) * (H - 2 * PAD_Y);
  const cx = (c: Candle) => x(c.time + step / 2);
  const bodyW = Math.max(1.5, (step / (t1 - t0 || 1)) * W * 0.72);

  // Close-to-close step line through gaps (no trade = price unchanged).
  let stepPath = "";
  candles.forEach((c, i) => {
    stepPath += i === 0 ? `M${cx(c)},${y(c.close)}` : `H${cx(c)}V${y(c.close)}`;
  });
  stepPath += `H${W}`;

  // Evenly spaced horizontal price levels.
  const levels = Array.from({ length: gridLines }, (_, i) => yLo + ((yHi - yLo) * (i + 0.5)) / gridLines);

  // Right gutter reserved for the price labels, sized to the longest one
  // (~6px per char at 9px) — candles never run under the numbers.
  const gutter = Math.max(...levels.map((v) => fmtPrice(v).length)) * 6 + 10;

  const shown = hover != null ? candles[hover] : null;
  const fmtTime = (time: number) =>
    new Date(time).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      ...(interval !== "1d" ? { hour: "2-digit", minute: "2-digit" } : {}),
    });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const target = t0 + ((e.clientX - rect.left) / rect.width) * (t1 - t0);
    let best = 0;
    candles.forEach((c, i) => {
      if (Math.abs(c.time + step / 2 - target) < Math.abs(candles[best].time + step / 2 - target)) best = i;
    });
    setHover(best);
  };

  return (
    <div>
      {/* Hovered candle details (reserved line: no layout jump) */}
      <p className="dvx:text-[10px] dvx:text-gray-400 dvx:font-mono dvx:truncate" style={{ minHeight: 14 }}>
        {shown && (
          <>
            {fmtTime(shown.time)} · O {fmtPrice(shown.open)} · H {fmtPrice(shown.high)} · L {fmtPrice(shown.low)} · C{" "}
            <span style={{ color: shown.close >= shown.open ? UP : DOWN }}>{fmtPrice(shown.close)}</span> · {tradesLabel(shown.trades)}
          </>
        )}
      </p>
      <div style={{ display: "flex", height: H }}>
      <div className="dvx:relative dvx:cursor-crosshair" style={{ flex: "1 1 0%", minWidth: 0, height: H }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="dvx:absolute dvx:inset-0 dvx:w-full dvx:h-full dvx:overflow-visible">
          {levels.map((v) => (
            <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="rgba(156,163,175,0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={stepPath} fill="none" stroke="rgba(156,163,175,0.45)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          {candles.map((c, i) => {
            const color = c.close >= c.open ? UP : DOWN;
            const top = y(Math.max(c.open, c.close));
            const bottom = y(Math.min(c.open, c.close));
            return (
              <g key={c.time} opacity={hover == null || hover === i ? 1 : 0.5}>
                <line x1={cx(c)} x2={cx(c)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <rect x={cx(c) - bodyW / 2} width={bodyW} y={top} height={Math.max(1.5, bottom - top)} fill={color} />
              </g>
            );
          })}
          {shown && (
            <>
              <line x1={cx(shown)} x2={cx(shown)} y1={0} y2={H} stroke="rgba(156,163,175,0.6)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <line x1={0} x2={W} y1={y(shown.close)} y2={y(shown.close)} stroke="rgba(156,163,175,0.6)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
      </div>
      {/* Price labels in their own gutter, aligned on the level lines */}
      <div style={{ position: "relative", width: gutter, height: H, flexShrink: 0 }}>
        {levels.map((v) => (
          <span
            key={v}
            className="dvx:absolute dvx:text-[9px] dvx:text-gray-400 dvx:pointer-events-none dvx:whitespace-nowrap"
            style={{ left: 6, top: y(v), transform: "translateY(-50%)" }}
          >
            {fmtPrice(v)}
          </span>
        ))}
        {shown && (
          // Hovered close, highlighted on the axis
          <span
            className="dvx:absolute dvx:text-[9px] dvx:font-bold dvx:pointer-events-none dvx:whitespace-nowrap dvx:rounded dvx:px-1"
            style={{
              left: 2,
              top: y(shown.close),
              transform: "translateY(-50%)",
              color: "#fff",
              backgroundColor: shown.close >= shown.open ? UP : DOWN,
            }}
          >
            {fmtPrice(shown.close)}
          </span>
        )}
      </div>
      </div>
      <div className="dvx:flex dvx:justify-between dvx:mt-1 dvx:text-[9px] dvx:text-gray-400" style={{ paddingRight: gutter }}>
        <span>{fmtTime(t0)}</span>
        <span>{fmtTime((t0 + t1) / 2)}</span>
        <span>{fmtTime(t1)}</span>
      </div>
    </div>
  );
}
