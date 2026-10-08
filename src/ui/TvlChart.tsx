import React from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import BigNumber from "bignumber.js";

interface TvlPoint {
  timestamp: string;
  tvlUsd: string | null;
  // Raw on-chain amounts per snapshot (older API versions may omit them).
  reserveA?: string | null;
  reserveB?: string | null;
  lpSupply?: string | null;
}

// Liquidity panel: 3 categorical slots, validated (all-pairs) on the widget's
// light #ffffff and dark #2a2a2a surfaces. Light aqua is < 3:1 → the legend
// always carries the value as text (relief rule), never color alone.
const LIQ_SERIES = [
  { key: "lpSupply", stroke: "dvx:stroke-[#2a78d6] dvx:dark:stroke-[#3987e5]", swatch: "dvx:bg-[#2a78d6] dvx:dark:bg-[#3987e5]" },
  { key: "reserveA", stroke: "dvx:stroke-[#eb6834] dvx:dark:stroke-[#d95926]", swatch: "dvx:bg-[#eb6834] dvx:dark:bg-[#d95926]" },
  { key: "reserveB", stroke: "dvx:stroke-[#1baf7a] dvx:dark:stroke-[#199e70]", swatch: "dvx:bg-[#1baf7a] dvx:dark:bg-[#199e70]" },
] as const;
type LiqKey = (typeof LIQ_SERIES)[number]["key"];
const H2 = 90;

const PERIODS = [1, 7, 30, 90] as const;

// viewBox units — the SVG stretches to the container width; strokes use
// non-scaling-stroke so they stay 2px whatever the aspect ratio.
const W = 600;
const H = 140;
const PAD_Y = 10;

export function formatUsdCompact(value: number): string {
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

/**
 * Signed TVL change, e.g. "▲ 3.42% 24h". Renders nothing when unknown
 * (null = no snapshot in that window yet — never shown as 0%).
 */
export function TvlChange({ pct, suffix }: { pct: string | number | null | undefined; suffix: string }) {
  const v = typeof pct === "number" ? pct : pct != null ? parseFloat(pct) : NaN;
  if (!Number.isFinite(v)) return null;
  const cls =
    v > 0 ? "dvx:text-green-600 dvx:dark:text-green-400" : v < 0 ? "dvx:text-red-500 dvx:dark:text-red-400" : "dvx:text-gray-400";
  return (
    <span className={`dvx:ml-1.5 dvx:text-[10px] dvx:font-semibold dvx:whitespace-nowrap ${cls}`}>
      {v > 0 ? "▲ " : v < 0 ? "▼ " : ""}
      {Math.abs(v).toFixed(2)}%<span className="dvx:ml-1 dvx:font-medium dvx:text-gray-400">{suffix}</span>
    </span>
  );
}

/**
 * TVL history of one pool (GET /pools/:address/tvl-history), hourly snapshots.
 * Below it, a second panel (same x-axis, shared hover) with reserveA / reserveB /
 * lpSupply as % change since the period start — different units than the USD
 * TVL, so a separate panel rather than a second y-axis. lpSupply only moves on
 * deposits / withdrawals; reserves also move with swaps.
 */
export const TvlChart = ({
  apiUrl,
  address,
  tickerA,
  tickerB,
}: {
  apiUrl: string;
  address: string;
  tickerA: string;
  tickerB: string;
}) => {
  const { t, i18n } = useTranslation("swap");
  const [days, setDays] = React.useState<(typeof PERIODS)[number]>(7);
  const [points, setPoints] = React.useState<TvlPoint[] | null>(null);
  // Token decimals from the same response — only needed to show absolute
  // amounts in the legend (the indexed % lines are decimal-independent).
  const [decimals, setDecimals] = React.useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [loading, setLoading] = React.useState(true);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHover(null);
    axios
      .get<{ points: TvlPoint[]; decimalsA?: number; decimalsB?: number }>(
        `${apiUrl}/pools/${address}/tvl-history`,
        { params: { days } },
      )
      .then((res) => {
        if (cancelled) return;
        setPoints(res.data.points || []);
        setDecimals({ a: res.data.decimalsA ?? null, b: res.data.decimalsB ?? null });
      })
      .catch(() => !cancelled && setPoints([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [apiUrl, address, days]);

  // Parsed series: null tvl = price unresolved at that snapshot → a gap, never a 0.
  const series = React.useMemo(
    () =>
      (points ?? []).map((p) => ({
        time: new Date(p.timestamp).getTime(),
        value: p.tvlUsd != null ? parseFloat(p.tvlUsd) : null,
      })),
    [points],
  );
  const values = series.flatMap((p) => (p.value != null && Number.isFinite(p.value) ? [p.value] : []));
  const hasData = values.length >= 2;
  const flat = hasData && Math.max(...values) === Math.min(...values);

  const minV = hasData ? Math.min(...values) : 0;
  const maxV = hasData ? Math.max(...values) : 0;
  const span = maxV - minV || maxV * 0.05 || 1; // flat series → small band around it
  const lo = minV - (maxV === minV ? span / 2 : 0);
  const hi = lo + span;
  const t0 = series[0]?.time ?? 0;
  const t1 = series[series.length - 1]?.time ?? 1;
  const x = (time: number) => ((time - t0) / (t1 - t0 || 1)) * W;
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD_Y);

  // One path, a new "M" after every gap.
  const path = React.useMemo(() => {
    let d = "";
    let pen = false;
    for (const p of series) {
      if (p.value == null || !Number.isFinite(p.value)) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`;
      pen = true;
    }
    return d;
  }, [series, lo, hi, t0, t1]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const target = t0 + ratio * (t1 - t0);
    let best: number | null = null;
    series.forEach((p, i) => {
      if (p.value == null) return;
      if (best == null || Math.abs(p.time - target) < Math.abs(series[best].time - target)) best = i;
    });
    setHover(best);
  };

  const fmtDate = (time: number, withTime: boolean) =>
    new Date(time).toLocaleString(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });

  /* ---- Liquidity panel: indexed % change since the first usable snapshot ---- */
  const liq = React.useMemo(() => {
    const out = {} as Record<LiqKey, (number | null)[]>;
    for (const { key } of LIQ_SERIES) {
      const raw = (points ?? []).map((p) => (p[key] != null && p[key] !== "" ? new BigNumber(p[key] as string) : null));
      const base = raw.find((v) => v != null && v.gt(0));
      out[key] = raw.map((v) => (v != null && base ? v.dividedBy(base).minus(1).multipliedBy(100).toNumber() : null));
    }
    return out;
  }, [points]);
  const liqValues = LIQ_SERIES.flatMap(({ key }) => liq[key].filter((v): v is number => v != null && Number.isFinite(v)));
  const hasLiq = liq.lpSupply.filter((v) => v != null).length >= 2;
  const liqMin = Math.min(0, ...liqValues);
  const liqMax = Math.max(0, ...liqValues);
  const liqSpan = liqMax - liqMin || 1; // all-flat → ±0.5% band around 0
  const liqLo = liqMax === liqMin ? -0.5 : liqMin - liqSpan * 0.1;
  const liqHi = liqMax === liqMin ? 0.5 : liqMax + liqSpan * 0.1;
  const y2 = (v: number) => (1 - (v - liqLo) / (liqHi - liqLo)) * H2;
  const liqPath = (key: LiqKey) => {
    let d = "";
    let pen = false;
    series.forEach((p, i) => {
      const v = liq[key][i];
      if (v == null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(p.time).toFixed(1)},${y2(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const lpUnchanged = liq.lpSupply.every((v) => v == null || Math.abs(v) < 1e-9);
  const liqLabel = (key: LiqKey) => (key === "lpSupply" ? t("pools_liq_lp_supply") : key === "reserveA" ? tickerA : tickerB);
  // LP tokens are always 18 decimals on DinoVox pairs.
  const liqDecimals = (key: LiqKey) => (key === "lpSupply" ? 18 : key === "reserveA" ? decimals.a : decimals.b);
  const fmtAmount = (raw: string | null | undefined, dec: number | null) => {
    if (raw == null || raw === "" || dec == null) return null;
    const bn = new BigNumber(raw).shiftedBy(-dec);
    if (!bn.isFinite()) return null;
    if (bn.gte(1_000_000)) return bn.toFormat(0);
    if (bn.gte(1)) return bn.toFormat(2);
    return bn.precision(4).toFixed();
  };
  const fmtPct = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;

  // Show the time on the axis when the window is short (or still filling up).
  const axisWithTime = days === 1 || t1 - t0 < 48 * 3600_000;
  const hovered = hover != null ? series[hover] : null;
  const last = [...series].reverse().find((p) => p.value != null);
  const headline = hovered ?? last;
  // Change over the selected period: first usable snapshot → headline point.
  const first = series.find((p) => p.value != null);
  // While history is still filling up, the change only covers the snapshots we
  // have — label it with that real span ("1 h"), not the selected period ("1j").
  const coveredMs = first && headline ? headline.time - first.time : 0;
  const periodLabel =
    coveredMs >= days * 86_400_000 * 0.95
      ? t("pools_tvl_period", { count: days })
      : coveredMs < 3_600_000
        ? t("pools_tvl_span_minutes", { count: Math.max(1, Math.round(coveredMs / 60_000)) })
        : coveredMs < 48 * 3_600_000
          ? t("pools_tvl_span_hours", { count: Math.round(coveredMs / 3_600_000) })
          : t("pools_tvl_period", { count: Math.round(coveredMs / 86_400_000) });
  const periodChangePct =
    hasData && first?.value && headline?.value != null
      ? ((headline.value - first.value) / first.value) * 100
      : null;

  return (
    <div className="dvx:mt-3 dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:p-3">
      <div className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:mb-2">
        <div className="dvx:min-w-0">
          <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
            {t("pools_tvl_chart_title")}
          </p>
          {hasData && headline?.value != null && (
            <p className="dvx:text-sm dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
              {formatUsdCompact(headline.value)}
              <TvlChange pct={periodChangePct} suffix={periodLabel} />
              <span className="dvx:ml-2 dvx:text-[10px] dvx:font-medium dvx:text-gray-400">
                {fmtDate(headline.time, true)}
              </span>
            </p>
          )}
        </div>
        <div className="dvx:flex dvx:gap-1 dvx:p-0.5 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-lg dvx:shrink-0">
          {PERIODS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`dvx:px-2 dvx:py-0.5 dvx:text-[10px] dvx:font-bold dvx:rounded-md dvx:transition-all ${
                days === d
                  ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-sm"
                  : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
              }`}
            >
              {t("pools_tvl_period", { count: d })}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="dvx:h-[140px] dvx:flex dvx:items-center dvx:justify-center">
          <div className="dvx:w-5 dvx:h-5 dvx:border-2 dvx:border-amber-500 dvx:border-t-transparent dvx:rounded-full dvx:animate-spin" />
        </div>
      ) : !hasData ? (
        // 0 or 1 usable snapshot: nothing to draw yet — say so instead of a lone dot.
        <p className="dvx:h-[140px] dvx:flex dvx:items-center dvx:justify-center dvx:text-center dvx:px-4 dvx:text-xs dvx:text-gray-400">
          {t(values.length === 1 ? "pools_tvl_chart_collecting" : "pools_tvl_chart_empty")}
        </p>
      ) : (
        <div className="dvx:cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <div className="dvx:relative dvx:h-[140px]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="dvx:absolute dvx:inset-0 dvx:w-full dvx:h-full dvx:overflow-visible"
              role="img"
              aria-label={t("pools_tvl_chart_title")}
            >
              {/* recessive guides at min / max */}
              {(flat ? [maxV] : [maxV, minV]).map((v) => (
                <line
                  key={v}
                  x1={0}
                  x2={W}
                  y1={y(v)}
                  y2={y(v)}
                  className="dvx:stroke-gray-200 dvx:dark:stroke-[#3a3a3a]"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={path}
                fill="none"
                className="dvx:stroke-amber-500"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {hovered?.value != null && (
                <line
                  x1={x(hovered.time)}
                  x2={x(hovered.time)}
                  y1={0}
                  y2={H}
                  className="dvx:stroke-gray-400"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {/* HTML marker so it stays round despite the stretched viewBox */}
            {hovered?.value != null && (
              <span
                className="dvx:absolute dvx:w-2.5 dvx:h-2.5 dvx:rounded-full dvx:bg-amber-500 dvx:ring-2 dvx:ring-white dvx:dark:ring-[#2a2a2a] dvx:pointer-events-none"
                style={{
                  left: `${(x(hovered.time) / W) * 100}%`,
                  top: `${(y(hovered.value) / H) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
            <span className="dvx:absolute dvx:right-0 dvx:text-[9px] dvx:text-gray-400 dvx:pointer-events-none" style={{ top: `${(y(maxV) / H) * 100}%`, transform: "translateY(-120%)" }}>
              {formatUsdCompact(maxV)}
            </span>
            {!flat && (
              <span className="dvx:absolute dvx:right-0 dvx:text-[9px] dvx:text-gray-400 dvx:pointer-events-none" style={{ top: `${(y(minV) / H) * 100}%`, transform: "translateY(20%)" }}>
                {formatUsdCompact(minV)}
              </span>
            )}
          </div>
          {hasLiq && (
            <div className="dvx:mt-4 dvx:pt-3 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333]">
              <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                {t("pools_liq_chart_title")}
              </p>
              {/* Legend = identity + value (hovered point, else latest) */}
              <div className="dvx:flex dvx:flex-wrap dvx:gap-x-3 dvx:gap-y-1 dvx:mt-1 dvx:mb-2">
                {LIQ_SERIES.map(({ key, swatch }) => {
                  const vals = liq[key];
                  const idx = hover ?? vals.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop();
                  return (
                    <span key={key} className="dvx:inline-flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:text-gray-500 dvx:dark:text-gray-300">
                      {key === "lpSupply" ? (
                        <span className="dvx:inline-flex dvx:gap-px">
                          <span className={`dvx:inline-block dvx:w-1 dvx:h-0.5 ${swatch}`} />
                          <span className={`dvx:inline-block dvx:w-1 dvx:h-0.5 ${swatch}`} />
                        </span>
                      ) : (
                        <span className={`dvx:inline-block dvx:w-2.5 dvx:h-0.5 dvx:rounded-full ${swatch}`} />
                      )}
                      {liqLabel(key)}
                      {idx != null && fmtAmount(points?.[idx]?.[key], liqDecimals(key)) && (
                        <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                          {fmtAmount(points?.[idx]?.[key], liqDecimals(key))}
                        </span>
                      )}
                      <span className="dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-300">
                        ({fmtPct(idx != null ? vals[idx] : null)})
                      </span>
                    </span>
                  );
                })}
              </div>
              <div className="dvx:relative" style={{ height: H2 }}>
                <svg
                  viewBox={`0 0 ${W} ${H2}`}
                  preserveAspectRatio="none"
                  className="dvx:absolute dvx:inset-0 dvx:w-full dvx:h-full dvx:overflow-visible"
                  role="img"
                  aria-label={t("pools_liq_chart_title")}
                >
                  <line
                    x1={0}
                    x2={W}
                    y1={y2(0)}
                    y2={y2(0)}
                    className="dvx:stroke-gray-200 dvx:dark:stroke-[#3a3a3a]"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* LP supply drawn last and dashed: when lines coincide (e.g. all at
                      0%), the dash lets the reserve lines underneath show through. */}
                  {[...LIQ_SERIES].reverse().map(({ key, stroke }) => (
                    <path
                      key={key}
                      d={liqPath(key)}
                      fill="none"
                      className={stroke}
                      strokeDasharray={key === "lpSupply" ? "6 5" : undefined}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {hovered && (
                    <line
                      x1={x(hovered.time)}
                      x2={x(hovered.time)}
                      y1={0}
                      y2={H2}
                      className="dvx:stroke-gray-400"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
                <span
                  className="dvx:absolute dvx:right-0 dvx:text-[9px] dvx:text-gray-400 dvx:pointer-events-none"
                  style={{ top: `${(y2(0) / H2) * 100}%`, transform: "translateY(-120%)" }}
                >
                  0%
                </span>
              </div>
              <p className="dvx:mt-1 dvx:text-[9px] dvx:text-gray-400 dvx:leading-relaxed">
                {lpUnchanged && <span className="dvx:font-semibold">{t("pools_liq_no_deposit")} </span>}
                {t("pools_liq_chart_hint")}
              </p>
            </div>
          )}
          <div className="dvx:flex dvx:justify-between dvx:mt-1 dvx:text-[9px] dvx:text-gray-400">
            <span>{fmtDate(t0, axisWithTime)}</span>
            <span>{fmtDate(t1, axisWithTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
