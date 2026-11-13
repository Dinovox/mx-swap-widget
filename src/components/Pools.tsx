import React from "react";
import { useGoTo } from "../context/SwapViewContext";
import { useTranslation } from "react-i18next";
import useLoadTranslations from "../hooks/useLoadTranslations";
import axios from "axios";
import BigNumber from "bignumber.js";
import { ArrowUpDown, ChevronDown, Info } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionTabs } from "../ui/NavTabs";
import { TvlChart, TvlChange } from "../ui/TvlChart";
import { DcaBadge, LimitBadge } from "../ui/DcaBadge";
import { FarmBadge } from "../ui/FarmBadge";
import {
  fetchRewardedStakedTokens,
  fetchUserFarmedBalances,
} from "../helpers/farms";
import { fetchFarmPositionsApi } from "../helpers/farmsApi";
import { RecentSwaps } from "../ui/RecentSwaps";
// ExternalLpWithdraw (JEXchange withdraw block) is hidden for now — only the
// tab badge is shown; render <ExternalLpWithdraw {...jexLp} /> to bring it back.
import { useJexLpPositions } from "../ui/ExternalLpWithdraw";
import { JexAddLiquidity } from "../ui/JexAddLiquidity";
import { PriceChart, type BookLevel } from "../ui/PriceChart";
import { OrderBookDepth } from "../ui/OrderBookDepth";
import { useFeatureFlags, JEX_ADD_ENABLED } from "../featureFlags";
import { orderForQuoteDisplay } from "../helpers/quotePriority";
import {
  fetchChartable,
  chartEntryForPool,
  type ChartableEntry,
} from "../helpers/charts";
import { useSwapConfig } from "../context/SwapConfigContext";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { fetchAllPools } from "../helpers/fetchAllPools";
import type { DexFilter, LiquidityPool, TokenMeta } from "../types";

const VOXEGLD_IDENTIFIER = "VOXEGLD-5872e5";

/** Aggregate over the exact pool set /pools returns — already scoped to the dexType filter. */
interface PoolsSummary {
  poolCount: number;
  poolCountPriced: number;
  /** AMM reserves only. */
  tvlUsd: string | null;
  /** Funds of the active limit orders (DinoVox pools) — undefined on an older API. */
  bookTvlUsd?: string | null;
  /** tvlUsd + bookTvlUsd — undefined on an older API. */
  totalTvlUsd?: string | null;
  volume24hSwapCount: number;
}

/** APR display: 2 decimals below 100%, grouped integer above (farm APRs can be huge on tiny TVL). */
function fmtPct(v: number): string {
  return v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2);
}

function formatUsd(value: number): string {
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

function formatReserve(raw: string, decimals: number): string {
  return formatAmount(new BigNumber(raw).shiftedBy(-decimals));
}

function formatAmount(bn: BigNumber): string {
  if (bn.isZero()) return "0";
  if (bn.gte(1_000_000)) return bn.toFormat(0) + "";
  if (bn.gte(1000)) return bn.toFormat(2);
  if (bn.gte(1)) return bn.toFormat(4);
  return bn.toFormat(6);
}

/**
 * The single "Liquidity" view (#liquidity and #pools): every pool of the
 * selected DEX, merged with the connected wallet's LP positions — pools the
 * user holds LP in come first and additionally show the position value, pool
 * share, estimated fees, per-token share and a Remove action.
 */
/**
 * Split of a USD total at a glance (AMM vs order books, LP vs farmed): a thin
 * two-colour bar + legend with amounts and shares. Inline sizes/colours:
 * readable even with a stale host CSS.
 */
const SplitBar = ({
  parts,
  align,
  title,
}: {
  parts: { color: string; label: string; usd: number }[];
  align: "start" | "end";
  title?: string;
}) => {
  parts = parts.filter((p) => p.usd > 0);
  const total = parts.reduce((acc, p) => acc + p.usd, 0);
  const pct = (usd: number) => (total > 0 ? (usd / total) * 100 : 0);
  return (
    <div
      className={title ? "dvx:cursor-help" : undefined}
      title={title}
      style={{ display: "flex", flexDirection: "column", alignItems: `flex-${align}`, gap: 4, margin: "4px 0 2px" }}
    >
      <div style={{ display: "flex", width: 180, maxWidth: "100%", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(127,127,127,0.2)" }}>
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${pct(p.usd)}%`, background: p.color }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: `flex-${align}`, columnGap: 10, rowGap: 2, fontSize: 11 }}>
        {parts.map((p) => (
          <span key={p.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
            <span className="dvx:text-gray-500 dvx:dark:text-gray-400">{p.label}</span>
            <span className="dvx:font-semibold dvx:text-gray-800 dvx:dark:text-gray-100">{formatUsd(p.usd)}</span>
            <span className="dvx:text-gray-400">{Math.round(pct(p.usd))}%</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export const Pools = () => {
  const {
    apiUrl,
    explorerAddress,
    address,
    networkApiAddress,
    farmsAddress,
    chainId,
  } = useSwapConfig();
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");

  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
  const [summary, setSummary] = React.useState<PoolsSummary | null>(null);
  const [tokenMap, setTokenMap] = React.useState<Record<string, TokenMeta>>({});
  const [loading, setLoading] = React.useState(true);
  const [dexFilter, setDexFilter] = React.useState<DexFilter>("DinoVox");
  // Sorted server-side (desc) so it stays correct across "Load more" pages.
  // aprPct = LP-fee APR only; totalAprPct = fee APR + farm APR (server-side sort).
  const [sortBy, setSortBy] = React.useState<
    "tvlUsd" | "aprPct" | "totalAprPct"
  >("tvlUsd");
  // APR is only computed for DinoVox pools (null on external DEXes), so the
  // APR sort — and its toggle — only exist on that tab.
  const effectiveSortBy = dexFilter === "DinoVox" ? sortBy : "tvlUsd";
  // /pools is paginated (sorted by TVL or APR desc server-side). DinoVox: one page at
  // the API max covers it (and keeps the ?filter= below exhaustive); external
  // DEXes (1000+ pools) load 50 at a time behind "Load more".
  const pageSize = dexFilter === "DinoVox" ? 200 : 50;
  const [total, setTotal] = React.useState<number | null>(null);
  const [fetchedCount, setFetchedCount] = React.useState(0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const fetchPage = (offset: number) =>
    axios.get(`${apiUrl}/pools`, {
      params: {
        dexType: dexFilter,
        sortBy: effectiveSortBy,
        limit: pageSize,
        offset,
      },
    });
  const loadMore = () => {
    setLoadingMore(true);
    fetchPage(fetchedCount)
      .then((res) => {
        const page: LiquidityPool[] = res.data.pools || [];
        setPools((prev) => [...prev, ...page.filter((p) => p.isActive)]);
        setFetchedCount((c) => c + page.length);
        setTotal(res.data.pagination?.total ?? null);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  };
  // Pool whose TVL chart is expanded (DinoVox only — history isn't tracked for external DEXes).
  const [chartPool, setChartPool] = React.useState<string | null>(null);
  // Pool whose order-book depth chart is open (fetched on open only).
  const [depthPool, setDepthPool] = React.useState<string | null>(null);
  const flags = useFeatureFlags();
  // Manual base/quote flip for the open depth chart — reset whenever a
  // different pool's depth is opened (cf. the toggle button's onClick).
  const [depthInverted, setDepthInverted] = React.useState(false);
  // Levels of the open depth chart (1 base = price quote) — overlaid on the
  // same pool's price chart while both sections are open.
  const [depthLevels, setDepthLevels] = React.useState<{ pool: string; base: string; levels: BookLevel[] } | null>(null);
  // Pool whose price chart is expanded + the chartable pairs (one fetch, cached).
  const [pricePool, setPricePool] = React.useState<string | null>(null);
  const [chartable, setChartable] = React.useState<ChartableEntry[]>([]);
  React.useEffect(() => {
    if (!apiUrl) return;
    fetchChartable(apiUrl)
      .then(setChartable)
      .catch(() => setChartable([]));
  }, [apiUrl]);
  // Pool whose recent-swaps list is expanded.
  const [swapsPool, setSwapsPool] = React.useState<string | null>(null);
  // JEXchange shutdown: LP still held in the wallet → withdraw block + tab badge.
  const jexLp = useJexLpPositions();
  // JEXchange pool whose inline add-liquidity form is open.
  const [jexAddPool, setJexAddPool] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!apiUrl) return;
    setLoading(true);
    Promise.all([fetchPage(0), axios.get(`${apiUrl}/tokens`)])
      .then(([poolsRes, tokensRes]) => {
        const page: LiquidityPool[] = poolsRes.data.pools || [];
        setPools(page.filter((p) => p.isActive));
        setFetchedCount(page.length);
        setTotal(poolsRes.data.pagination?.total ?? null);
        // Already scoped to this exact dexType filter server-side — no
        // client-side re-aggregation needed when switching tabs.
        setSummary(poolsRes.data.summary ?? null);
        const map: Record<string, TokenMeta> = {};
        for (const t of tokensRes.data.tokens || []) {
          map[t.identifier] = {
            identifier: t.identifier,
            ticker: t.ticker ?? t.identifier.split("-")[0],
            decimals: t.decimals ?? 18,
            priceUsd: t.priceUsd ?? null,
          };
        }
        setTokenMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dexFilter, effectiveSortBy, apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Wallet LP positions ---- */
  // Held pools come from the FULL pool set (all DEXes, all pages), not the
  // loaded page: a position must show (and count in the total) even when its
  // pool isn't in the first page of the current tab.
  const walletTokens = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
  });
  const [allPools, setAllPools] = React.useState<LiquidityPool[]>([]);
  React.useEffect(() => {
    if (!apiUrl || !address) {
      setAllPools([]);
      return;
    }
    fetchAllPools(apiUrl).then(setAllPools).catch(console.error);
  }, [apiUrl, address]);
  /* ---- User's active limit orders: tokens escrowed in the order books ----
     Remaining amount per escrowed token (a partially filled order counts for
     its remainder only — fills are paid to the user directly), aggregated by
     the backend in /orderbook/orders/summary `escrowed`. Older API without
     it: summed here from /buckets, one call per pair with active orders. */
  const [myBookRaw, setMyBookRaw] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    setMyBookRaw({});
    if (!apiUrl || !address || !flags.orderBook) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<{
          pairs: { pairAddr: string; activeCount: number }[];
          escrowed?: { token: string; amount: string }[];
        }>(`${apiUrl}/orderbook/orders/summary`, { params: { address } });
        if (data.escrowed) {
          if (!cancelled) setMyBookRaw(Object.fromEntries(data.escrowed.map((e) => [e.token, e.amount])));
          return;
        }
        const active = (data.pairs ?? []).filter((p) => p.activeCount > 0);
        const perPair = await Promise.all(
          active.map((p) =>
            axios
              .get<{ buckets: { tokenIn: string; totalAmountRemaining: string }[] }>(`${apiUrl}/orderbook/orders/buckets`, {
                params: { address, pairAddr: p.pairAddr },
              })
              .then((res) => res.data.buckets ?? [])
              .catch(() => []),
          ),
        );
        const sums: Record<string, BigNumber> = {};
        for (const b of perPair.flat()) sums[b.tokenIn] = (sums[b.tokenIn] ?? new BigNumber(0)).plus(b.totalAmountRemaining);
        if (!cancelled) setMyBookRaw(Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, v.toFixed(0)])));
      } catch {
        /* older API without the order-book routes: no book share */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, address, flags.orderBook]);
  const myBookUsd = Object.entries(myBookRaw).reduce((acc, [id, raw]) => {
    const price = tokenMap[id]?.priceUsd;
    return price != null ? acc + new BigNumber(raw).shiftedBy(-(tokenMap[id]?.decimals ?? 18)).toNumber() * parseFloat(price) : acc;
  }, 0);

  /* ---- Farms: LP staked in farms (counts as the user's liquidity, 1:1 via
     the position token) + which LP tokens have live farm rewards ---- */
  const [farmed, setFarmed] = React.useState<Record<string, string>>({});
  // Fallback only: LP tokens with live rewards read on-chain, used when the
  // /pools response predates the `farm` field.
  const [rewardedLpsOnChain, setRewardedLpsOnChain] = React.useState<
    Set<string>
  >(new Set());
  const poolsHaveFarmField = pools.some((p) => p.farm !== undefined);
  React.useEffect(() => {
    if (
      poolsHaveFarmField ||
      loading ||
      !farmsAddress ||
      !networkApiAddress ||
      !chainId
    )
      return;
    fetchRewardedStakedTokens(networkApiAddress, chainId, farmsAddress)
      .then(setRewardedLpsOnChain)
      .catch(() => {});
  }, [poolsHaveFarmField, loading, farmsAddress, networkApiAddress, chainId]);
  const hasLiveFarm = (pool: LiquidityPool) =>
    pool.farm !== undefined
      ? !!pool.farm?.rewards.some((r) => !r.paused && r.balance !== "0")
      : rewardedLpsOnChain.has(pool.lpToken);
  React.useEffect(() => {
    if (!farmsAddress || !address) {
      setFarmed({});
      return;
    }
    // LP staked in farms = position-token balance (1:1), from /farms/positions;
    // on-chain read of the position MetaESDTs only if that route fails.
    fetchFarmPositionsApi(apiUrl, address)
      .then((map) =>
        setFarmed(
          Object.fromEntries(
            Object.entries(map).map(([lp, p]) => [
              lp,
              p.positionTokenBalance ?? "0",
            ]),
          ),
        ),
      )
      .catch(() => {
        if (!networkApiAddress || !chainId) return setFarmed({});
        fetchUserFarmedBalances(
          networkApiAddress,
          chainId,
          farmsAddress,
          address,
        )
          .then(setFarmed)
          .catch(() => setFarmed({}));
      });
  }, [apiUrl, farmsAddress, networkApiAddress, chainId, address]);

  // Wallet LP only — what Remove liquidity can actually spend.
  const walletLp = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const w of (walletTokens ?? []) as Array<{
      identifier?: string;
      balance?: string;
    }>) {
      if (w?.identifier && w?.balance && new BigNumber(w.balance).gt(0))
        map.set(w.identifier, w.balance);
    }
    return map;
  }, [walletTokens]);
  // Total LP owned = wallet + staked in farms.
  const lpBalances = React.useMemo(() => {
    const map = new Map(walletLp);
    for (const [lp, raw] of Object.entries(farmed)) {
      if (new BigNumber(raw).gt(0))
        map.set(lp, new BigNumber(map.get(lp) ?? "0").plus(raw).toFixed(0));
    }
    return map;
  }, [walletLp, farmed]);
  const lpBalanceOf = (pool: LiquidityPool) =>
    pool.lpToken ? (lpBalances.get(pool.lpToken) ?? null) : null;
  // LP tokens are 18 decimals on every supported pair.
  const positionUsd = (pool: LiquidityPool, balance: string) =>
    pool.lpTokenPriceUsd
      ? new BigNumber(balance).shiftedBy(-18).toNumber() *
        parseFloat(pool.lpTokenPriceUsd)
      : null;
  const heldPools = React.useMemo(
    () =>
      allPools
        .filter((p) => p.isActive && lpBalanceOf(p))
        .sort(
          (a, b) =>
            (positionUsd(b, lpBalanceOf(b)!) ?? -1) -
            (positionUsd(a, lpBalanceOf(a)!) ?? -1),
        ),
    [allPools, lpBalances], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const positionsTotalUsd = heldPools.reduce(
    (acc, p) => acc + (positionUsd(p, lpBalanceOf(p)!) ?? 0),
    0,
  );
  // Part of it staked in farms (the rest sits in the wallet as plain LP).
  const positionsFarmedUsd = heldPools.reduce(
    (acc, p) => acc + (p.lpToken && farmed[p.lpToken] ? (positionUsd(p, farmed[p.lpToken]) ?? 0) : 0),
    0,
  );
  // Header TVL = AMM + order book (summary.totalTvlUsd) while the order-book
  // UI is on (flags.orderBook, same gate as the depth chart); AMM reserves
  // alone otherwise, or against an older API without these fields.
  const summaryBookUsd =
    flags.orderBook && summary?.bookTvlUsd != null
      ? parseFloat(summary.bookTvlUsd)
      : 0;
  const summaryTvl =
    flags.orderBook && summary?.totalTvlUsd != null
      ? summary.totalTvlUsd
      : (summary?.tvlUsd ?? null);

  const getTicker = (id: string) => tokenMap[id]?.ticker ?? id.split("-")[0];
  const getDecimals = (id: string) => tokenMap[id]?.decimals ?? 18;

  // Token search (ticker or identifier, partial match), prefilled from
  // ?filter=<ticker|identifier>. Client-side over the loaded pools: exhaustive
  // on DinoVox (single 200-pool page), only the pages loaded so far elsewhere.
  const [searchParams] = useWidgetSearchParams();
  const [tokenSearch, setTokenSearch] = React.useState(
    () => searchParams.get("filter")?.trim() ?? "",
  );
  const tokenFilter = tokenSearch.trim().toUpperCase() || null;
  const matchesToken = (id: string) =>
    !!tokenFilter &&
    (id.toUpperCase().includes(tokenFilter) ||
      getTicker(id).toUpperCase().includes(tokenFilter));
  // Held pools of this DEX first (by position value), then the loaded page minus those.
  // "My positions on top" (default on, remembered per browser). Off = the
  // native server order (TVL / APR), positions stay decorated where they fall.
  const [positionsFirst, setPositionsFirst] = React.useState(() => {
    try {
      return localStorage.getItem("dvx-pools-positions-first") !== "0";
    } catch {
      return true;
    }
  });
  const togglePositionsFirst = (on: boolean) => {
    setPositionsFirst(on);
    try {
      localStorage.setItem("dvx-pools-positions-first", on ? "1" : "0");
    } catch {
      /* storage unavailable — keep it in memory only */
    }
  };
  const heldHere = heldPools.filter(
    (p) => (p.dexType ?? dexFilter) === dexFilter,
  );
  const heldAddrs = new Set(heldHere.map((p) => p.address));
  const ordered = positionsFirst
    ? [...heldHere, ...pools.filter((p) => !heldAddrs.has(p.address))]
    : pools;
  const visiblePools = tokenFilter
    ? ordered.filter((p) => matchesToken(p.tokenA) || matchesToken(p.tokenB))
    : ordered;

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4">
            <SectionTabs active="liquidity" />
          </div>
        }
        description={
          loading
            ? t("pools_loading_desc")
            : t("pools_count", {
                count: tokenFilter
                  ? visiblePools.length
                  : (total ?? visiblePools.length),
              })
        }
      >
        {/* Full width with equal columns on mobile (5 DEX names must fit), compact from sm up. */}
        <div className="dvx:flex dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:mt-4 dvx:w-full dvx:sm:w-fit">
          {(["DinoVox", "XExchange", "JExchange", "OneDex", "AshSwapStable"] as DexFilter[]).map(
            (dex) => (
              <button
                key={dex}
                onClick={() => {
                  setDexFilter(dex);
                }}
                title={
                  dex === "JExchange" && jexLp.positions.length > 0
                    ? t("ext_lp_tab_hint", { count: jexLp.positions.length })
                    : undefined
                }
                style={{ position: "relative" }}
                className={`dvx:flex-1 dvx:sm:flex-initial dvx:min-w-0 dvx:truncate dvx:px-1.5 dvx:sm:px-4 dvx:py-1.5 dvx:text-[11px] dvx:sm:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all ${
                  dexFilter === dex
                    ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md"
                    : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
                }`}
              >
                {dex === "AshSwapStable" ? "AshSwap" : dex}
                {dex === "JExchange" && jexLp.positions.length > 0 && (
                  // Badge: LP to withdraw (inside the button box so truncate can't clip it).
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      minWidth: 14,
                      height: 14,
                      padding: "0 3px",
                      borderRadius: 9999,
                      background: "#f59e0b",
                      color: "#000",
                      fontSize: 9,
                      fontWeight: 800,
                      lineHeight: "14px",
                      textAlign: "center",
                    }}
                  >
                    {jexLp.positions.length}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
        <div className="dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-2 dvx:mt-3">
          <input
            type="text"
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            placeholder={t("pools_search_placeholder")}
            className="dvx:flex-1 dvx:min-w-[160px] dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-1.5 dvx:text-xs dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
          />
          {dexFilter === "DinoVox" && (
            <div className="dvx:flex dvx:items-center dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl">
              <span className="dvx:px-2 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                {t("pools_sort_label")}
              </span>
              {(["tvlUsd", "aprPct", "totalAprPct"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`dvx:px-3 dvx:py-1 dvx:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all ${
                    sortBy === key
                      ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md"
                      : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white"
                  }`}
                >
                  {key === "tvlUsd"
                    ? "TVL"
                    : key === "aprPct"
                      ? "APR"
                      : t("pools_sort_total_apr")}
                </button>
              ))}
            </div>
          )}
        </div>
        {summary && (
          /* One line: the user's positions on the left (only if any), the
             pools' total TVL on the right. */
          <div
            className="dvx:rounded-2xl dvx:border dvx:border-amber-200 dvx:dark:border-amber-800/50 dvx:bg-amber-50 dvx:dark:bg-amber-900/10 dvx:px-4 dvx:py-3 dvx:mt-4"
            // Two equal columns (positions | TVL) that stack below ~460px: each
            // split-bar legend wraps inside its own column instead of pushing
            // the TVL block to the next line. Inline: stale-host-CSS proof.
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", alignItems: "end", columnGap: 24, rowGap: 12 }}
          >
            {positionsTotalUsd + myBookUsd > 0 ? (
              <div className="dvx:flex dvx:flex-col" style={{ minWidth: 0 }}>
                <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-400 dvx:uppercase dvx:tracking-wider">
                  {t("pools_your_positions")}
                </span>
                <span className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:text-base">
                  {formatUsd(positionsTotalUsd + myBookUsd)}
                </span>
                {/* LP in the wallet / LP staked in farms / tokens escrowed in limit orders. */}
                {[positionsTotalUsd - positionsFarmedUsd, positionsFarmedUsd, myBookUsd].filter((v) => v > 0).length > 1 && (
                  <SplitBar
                    align="start"
                    title={t("pools_positions_split_tooltip")}
                    parts={[
                      { color: "#f59e0b", label: t("pools_positions_lp"), usd: Math.max(0, positionsTotalUsd - positionsFarmedUsd) },
                      { color: "#4ade80", label: t("pools_positions_farmed"), usd: positionsFarmedUsd },
                      { color: "#22d3ee", label: t("pools_summary_books"), usd: myBookUsd },
                    ]}
                  />
                )}
                <label className="dvx:inline-flex dvx:items-center dvx:gap-1.5 dvx:text-[10px] dvx:text-gray-400 dvx:cursor-pointer dvx:select-none">
                  <input
                    type="checkbox"
                    checked={positionsFirst}
                    onChange={(e) => togglePositionsFirst(e.target.checked)}
                    className="dvx:accent-amber-500 dvx:cursor-pointer"
                  />
                  {t("pools_positions_first")}
                </label>
              </div>
            ) : (
              <span />
            )}
            <div className="dvx:flex dvx:flex-col dvx:items-end dvx:text-right" style={{ minWidth: 0 }}>
              <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-400 dvx:uppercase dvx:tracking-wider">
                {t("pools_summary_tvl")}
              </span>
              <span className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:text-base">
                {summaryTvl != null
                  ? formatUsd(parseFloat(summaryTvl))
                  : "—"}
              </span>
              {summaryBookUsd > 0 && summaryTvl != null && (
                // AMM vs order books at a glance.
                <SplitBar
                  align="end"
                  title={t("pools_summary_book_tooltip")}
                  parts={[
                    { color: "#f59e0b", label: t("pools_summary_amm"), usd: Math.max(0, parseFloat(summaryTvl) - summaryBookUsd) },
                    { color: "#22d3ee", label: t("pools_summary_books"), usd: summaryBookUsd },
                  ]}
                />
              )}
              <span className="dvx:text-[10px] dvx:text-gray-400">
                {t("pools_summary_stats", {
                  poolCount: summary.poolCount,
                  swapCount: summary.volume24hSwapCount,
                })}
              </span>
            </div>
          </div>
        )}
        <div className="dvx:space-y-3 dvx:mt-4">
          {loading ? (
            <div className="dvx:flex dvx:justify-center dvx:py-10">
              <div className="dvx:w-6 dvx:h-6 dvx:border-2 dvx:border-amber-500 dvx:border-t-transparent dvx:rounded-full dvx:animate-spin" />
            </div>
          ) : visiblePools.length === 0 ? (
            <p className="dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400 dvx:py-8">
              {t("pools_empty")}
            </p>
          ) : (
            visiblePools.map((pool) => {
              const tickerA = getTicker(pool.tokenA);
              const tickerB = getTicker(pool.tokenB);
              const decA = getDecimals(pool.tokenA);
              const decB = getDecimals(pool.tokenB);
              const resA = formatReserve(pool.reserveA, decA);
              const resB = formatReserve(pool.reserveB, decB);
              const priceA = tokenMap[pool.tokenA]?.priceUsd;
              const priceB = tokenMap[pool.tokenB]?.priceUsd;
              const resAUsd = priceA
                ? new BigNumber(pool.reserveA).shiftedBy(-decA).toNumber() *
                  parseFloat(priceA)
                : null;
              const resBUsd = priceB
                ? new BigNumber(pool.reserveB).shiftedBy(-decB).toNumber() *
                  parseFloat(priceB)
                : null;
              const tvl =
                pool.lpTokenPriceUsd && pool.lpSupply
                  ? parseFloat(pool.lpTokenPriceUsd) *
                    new BigNumber(pool.lpSupply).shiftedBy(-18).toNumber()
                  : resAUsd != null && resBUsd != null
                    ? resAUsd + resBUsd
                    : null;

              // ---- Wallet position in this pool (if any) ----
              // Farm APR on top of the LP-fee APR. A participant can only follow
              // `slots` streams at once, so the farm APR is the best `slots`
              // streams cumulated — server value (farm.farmAprPct); the same
              // top-N sum is computed here only for an older API without it.
              const liveFarmRewards = (pool.farm?.rewards ?? [])
                .filter(
                  (r) =>
                    !r.paused &&
                    r.balance !== "0" &&
                    r.aprPct != null &&
                    Number.isFinite(parseFloat(r.aprPct)),
                )
                .sort((a, b) => parseFloat(b.aprPct!) - parseFloat(a.aprPct!));
              const slots =
                pool.farm?.maxActiveRewardsPerPosition ??
                liveFarmRewards.length;
              const countedRewards = liveFarmRewards.slice(0, slots);
              const farmAprPct =
                pool.farm?.farmAprPct !== undefined
                  ? pool.farm.farmAprPct != null
                    ? parseFloat(pool.farm.farmAprPct)
                    : null
                  : countedRewards.length
                    ? countedRewards.reduce(
                        (acc, r) => acc + parseFloat(r.aprPct!),
                        0,
                      )
                    : null;
              const farmAprTooltip = [
                t("pools_farm_apr_tooltip", { n: slots }),
                ...liveFarmRewards.map(
                  (r, i) =>
                    `• ${getTicker(r.token)} : ${fmtPct(parseFloat(r.aprPct!))}%${i >= slots ? ` (${t("pools_farm_apr_not_counted")})` : ""}`,
                ),
              ].join("\n");
              const lpBalance = lpBalanceOf(pool);
              const walletLpRaw = pool.lpToken
                ? (walletLp.get(pool.lpToken) ?? null)
                : null;
              const farmedRaw = pool.lpToken
                ? (farmed[pool.lpToken] ?? null)
                : null;
              const farmedPct =
                farmedRaw && lpBalance && new BigNumber(lpBalance).gt(0)
                  ? new BigNumber(farmedRaw)
                      .dividedBy(lpBalance)
                      .multipliedBy(100)
                      .toNumber()
                  : null;
              const supplyBN = new BigNumber(pool.lpSupply);
              const share =
                lpBalance && supplyBN.gt(0)
                  ? new BigNumber(lpBalance).dividedBy(supplyBN)
                  : null;
              const posUsd = lpBalance ? positionUsd(pool, lpBalance) : null;
              const sharePct = share
                ? share.multipliedBy(100).toNumber()
                : null;
              const myA = share
                ? new BigNumber(pool.reserveA)
                    .multipliedBy(share)
                    .shiftedBy(-decA)
                : null;
              const myB = share
                ? new BigNumber(pool.reserveB)
                    .multipliedBy(share)
                    .shiftedBy(-decB)
                : null;
              const myAUsd =
                myA && priceA ? myA.toNumber() * parseFloat(priceA) : null;
              const myBUsd =
                myB && priceB ? myB.toNumber() * parseFloat(priceB) : null;
              // Estimated LP fees over 30 days at the CURRENT share: the pool's LP
              // fees over its APR window, normalised to 30 days, × the share.
              const feesWindowUsd =
                pool.apr?.feesUsdLp != null
                  ? parseFloat(pool.apr.feesUsdLp)
                  : NaN;
              const windowDays = pool.apr?.windowDays ?? 0;
              const estFees30dUsd =
                share && Number.isFinite(feesWindowUsd) && windowDays > 0
                  ? (feesWindowUsd / windowDays) * 30 * share.toNumber()
                  : null;
              const usdOrZero = (v: number) => (v === 0 ? "$0" : formatUsd(v));
              // Funds escrowed by this pair's active limit orders: shown apart
              // from the reserves, never added to the pool's TVL (makers earn
              // no LP fees — the APR stays on the reserves alone).
              const book =
                flags.orderBook && pool.book && pool.book.orderCount > 0
                  ? pool.book
                  : null;
              const bookAmounts = book
                ? [
                    new BigNumber(book.amountA).gt(0)
                      ? `${formatReserve(book.amountA, decA)} ${tickerA}`
                      : null,
                    new BigNumber(book.amountB).gt(0)
                      ? `${formatReserve(book.amountB, decB)} ${tickerB}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" + ")
                : "";
              const bookUsd =
                book?.tvlUsd != null ? parseFloat(book.tvlUsd) : null;
              // Limit orders live in DinoVox pairs only.
              const limitReady = flags.orderBook && dexFilter === "DinoVox";
              const reserveBox = (
                ticker: string,
                res: string,
                resUsd: number | null,
                mine: BigNumber | null,
                mineUsd: number | null,
              ) => (
                <div className="dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2">
                  <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-0.5">
                    {t("pools_reserve")} {ticker}
                  </p>
                  <p className="dvx:font-bold dvx:text-gray-900 dvx:dark:text-white dvx:text-sm">
                    {res}{" "}
                    <span className="dvx:text-gray-400 dvx:font-medium">
                      {ticker}
                    </span>
                  </p>
                  {resUsd != null && resUsd > 0 && (
                    <p className="dvx:text-[10px] dvx:text-gray-400 dvx:mt-0.5">
                      {formatUsd(resUsd)}
                    </p>
                  )}
                  {mine && (
                    <p className="dvx:text-[10px] dvx:mt-1.5 dvx:pt-1.5 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333] dvx:text-gray-400">
                      {t("liquidity_your_share")}{" "}
                      <span className="dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                        {formatAmount(mine)} {ticker}
                      </span>
                      {mineUsd != null && mineUsd > 0 && (
                        <span> · {formatUsd(mineUsd)}</span>
                      )}
                    </p>
                  )}
                </div>
              );
              return (
                <div
                  key={pool.address}
                  className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4"
                  // Pool the wallet holds LP in: same base card, plus a gold outline
                  // (box-shadow — host CSS can't flatten it like a border) and a soft
                  // gold wash from the top-left corner layered OVER the base color, so
                  // the card gets brighter, never duller than the others.
                  style={
                    lpBalance
                      ? {
                          boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.55)",
                          backgroundImage:
                            "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0) 55%)",
                        }
                      : undefined
                  }
                >
                  {/* Title: pair · DCA · (position value · pool share) · APR | + Add · − Remove */}
                  <div className="dvx:flex dvx:items-start dvx:justify-between dvx:gap-3 dvx:mb-3">
                    <div className="dvx:flex dvx:flex-col dvx:gap-1 dvx:min-w-0">
                      <div className="dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap">
                        <span className="dvx:font-black dvx:text-gray-900 dvx:dark:text-white dvx:text-base">
                          {tickerA} / {tickerB}
                        </span>
                        {posUsd != null && posUsd > 0 && (
                          <span className="dvx:text-sm dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400">
                            ≈ {formatUsd(posUsd)}
                          </span>
                        )}
                        {sharePct != null && (
                          <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400">
                            {t("liquidity_pool_share", {
                              pct:
                                sharePct > 0 && sharePct < 0.01
                                  ? "<0.01"
                                  : sharePct.toFixed(2),
                            })}
                          </span>
                        )}
                        {farmedPct != null && farmedPct > 0 && (
                          <span
                            className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:whitespace-nowrap"
                            title={t("liquidity_farmed_tooltip")}
                          >
                            🌾{" "}
                            {t("liquidity_farmed", {
                              pct:
                                farmedPct >= 99.995
                                  ? "100"
                                  : farmedPct.toFixed(0),
                            })}
                          </span>
                        )}
                        {/* DinoVox: TVL + 24h change live on the "TVL history" toggle row below. */}
                        {dexFilter !== "DinoVox" && tvl != null && tvl > 0 && (
                          <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400">
                            TVL {formatUsd(tvl)}
                          </span>
                        )}
                        {farmAprPct != null && pool.apr?.aprPct == null && (
                          // No LP-fee APR yet: show the farm APR alone.
                          <span
                            className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400 dvx:whitespace-nowrap dvx:cursor-help"
                            title={farmAprTooltip}
                          >
                            APR 🌾 {fmtPct(farmAprPct)}%
                          </span>
                        )}
                        {pool.apr?.aprPct != null && (
                          <span className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400 dvx:whitespace-nowrap">
                            {t("pools_apr", {
                              pct: parseFloat(pool.apr.aprPct).toFixed(2),
                            })}
                            <span
                              className="dvx:cursor-help"
                              title={[
                                t("pools_apr_tooltip_intro"),
                                "",
                                `• ${t("pools_apr_tooltip_window", { days: pool.apr.windowDays })}`,
                                ...(pool.tokenA === VOXEGLD_IDENTIFIER ||
                                pool.tokenB === VOXEGLD_IDENTIFIER
                                  ? ["", `• ${t("pools_apr_tooltip_voxegld")}`]
                                  : []),
                              ].join("\n")}
                            >
                              <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                            </span>
                            {farmAprPct != null && (
                              <span
                                className="dvx:cursor-help"
                                title={farmAprTooltip}
                              >
                                + 🌾 {fmtPct(farmAprPct)}%
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {/* Subtitle: pool LP fees · (my estimated fees) · swaps 24h */}
                      <div className="dvx:flex dvx:items-center dvx:gap-3 dvx:flex-wrap">
                        {pool.apr?.feesUsdLp != null &&
                          Number.isFinite(feesWindowUsd) && (
                            <span
                              className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:cursor-help dvx:whitespace-nowrap"
                              title={t("pools_fees_lp_tooltip", {
                                days: Math.round(windowDays),
                              })}
                            >
                              {t("pools_fees_lp", {
                                amount: usdOrZero(feesWindowUsd),
                              })}
                              <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                            </span>
                          )}
                        {estFees30dUsd != null && (
                          <span
                            className="dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:cursor-help dvx:whitespace-nowrap"
                            title={t("liquidity_est_fees_tooltip", {
                              days: Math.round(windowDays),
                            })}
                          >
                            {t("liquidity_est_fees", {
                              amount: usdOrZero(estFees30dUsd),
                            })}
                            <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                          </span>
                        )}
                        {pool.volume24h != null && (
                          <button
                            type="button"
                            onClick={() =>
                              setSwapsPool(
                                swapsPool === pool.address
                                  ? null
                                  : pool.address,
                              )
                            }
                            title={t("pools_recent_swaps_toggle")}
                            className="dvx:inline-flex dvx:items-center dvx:gap-0.5 dvx:p-0 dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors dvx:whitespace-nowrap"
                          >
                            {t("pools_swaps_24h", {
                              count: pool.volume24h.swapCount,
                            })}
                            <ChevronDown
                              className={`dvx:h-3 dvx:w-3 dvx:transition-transform ${swapsPool === pool.address ? "dvx:rotate-180" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Right column: actions, DCA shortcut underneath (keeps the title line short). */}
                    <div className="dvx:flex dvx:flex-col dvx:items-end dvx:gap-1.5 dvx:shrink-0 dvx:mt-1">
                      <div className="dvx:flex dvx:gap-3">
                        {dexFilter === "DinoVox" && (
                          <button
                            onClick={() =>
                              goTo("add-liquidity", {
                                tokenA: pool.tokenA,
                                tokenB: pool.tokenB,
                              })
                            }
                            className="dvx:whitespace-nowrap dvx:text-xs dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition"
                          >
                            {t("pools_add")}
                          </button>
                        )}
                        {JEX_ADD_ENABLED &&
                          dexFilter === "JExchange" &&
                          address && (
                            <button
                              onClick={() =>
                                setJexAddPool(
                                  jexAddPool === pool.address
                                    ? null
                                    : pool.address,
                                )
                              }
                              className="dvx:whitespace-nowrap dvx:text-xs dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition"
                            >
                              {t("pools_add")}
                            </button>
                          )}
                        {walletLpRaw && (
                          <button
                            onClick={() =>
                              goTo("remove-liquidity", { pool: pool.address })
                            }
                            className="dvx:whitespace-nowrap dvx:text-xs dvx:font-bold dvx:text-red-500 dvx:bg-transparent dvx:hover:text-red-600 dvx:transition"
                          >
                            − {t("liquidity_remove_btn")}
                          </button>
                        )}
                      </div>
                      {(pool.dcaReady || hasLiveFarm(pool) || limitReady) && (
                        <div className="dvx:flex dvx:gap-1.5">
                          {hasLiveFarm(pool) && (
                            <FarmBadge pool={pool.address} />
                          )}
                          {pool.dcaReady && (
                            <DcaBadge
                              tokenA={pool.tokenA}
                              tokenB={pool.tokenB}
                            />
                          )}
                          {limitReady && (
                            <LimitBadge
                              tokenA={pool.tokenA}
                              tokenB={pool.tokenB}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {dexFilter === "JExchange" && jexAddPool === pool.address && (
                    <JexAddLiquidity
                      pool={pool}
                      tickerA={tickerA}
                      tickerB={tickerB}
                      decimalsA={decA}
                      decimalsB={decB}
                      balanceA={walletLp.get(pool.tokenA) ?? "0"}
                      balanceB={walletLp.get(pool.tokenB) ?? "0"}
                      onSent={() => setJexAddPool(null)}
                    />
                  )}
                  {swapsPool === pool.address && (
                    <div className="dvx:-mt-1 dvx:mb-3">
                      <RecentSwaps
                        apiUrl={apiUrl}
                        address={pool.address}
                        explorerAddress={explorerAddress}
                        tokenMap={tokenMap}
                      />
                    </div>
                  )}
                  <div className="dvx:grid dvx:grid-cols-2 dvx:gap-3">
                    {reserveBox(tickerA, resA, resAUsd, myA, myAUsd)}
                    {reserveBox(tickerB, resB, resBUsd, myB, myBUsd)}
                  </div>
                  {book && (
                    <p
                      className="dvx:flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:mt-2 dvx:cursor-help"
                      title={t("pools_book_tooltip", { amounts: bookAmounts })}
                    >
                      {t("pools_book", {
                        count: book.orderCount,
                        // No USD price for the escrowed side → token amounts instead.
                        amount:
                          bookUsd != null && bookUsd > 0
                            ? formatUsd(bookUsd)
                            : bookAmounts,
                      })}
                      <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                    </p>
                  )}
                  <a
                    href={`${explorerAddress}/accounts/${pool.address}/tokens`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("pools_view_explorer")}
                    className="dvx:block dvx:text-[10px] dvx:text-gray-400 dvx:hover:text-amber-500 dvx:hover:underline dvx:mt-2 dvx:font-mono dvx:truncate"
                  >
                    {pool.address}
                  </a>
                  {dexFilter === "DinoVox" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setChartPool(
                            chartPool === pool.address ? null : pool.address,
                          )
                        }
                        className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:mt-3 dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333] dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors"
                      >
                        <span>{t("pools_tvl_chart_toggle")}</span>
                        <span className="dvx:flex dvx:items-center dvx:gap-2">
                          {tvl != null && tvl > 0 && (
                            <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:whitespace-nowrap">
                              TVL {formatUsd(tvl)}
                              <TvlChange
                                pct={pool.tvlChange24hPct}
                                suffix="24h"
                              />
                            </span>
                          )}
                          <ChevronDown
                            className={`dvx:h-3.5 dvx:w-3.5 dvx:transition-transform ${chartPool === pool.address ? "dvx:rotate-180" : ""}`}
                          />
                        </span>
                      </button>
                      {chartPool === pool.address && (
                        <TvlChart
                          apiUrl={apiUrl}
                          address={pool.address}
                          tickerA={tickerA}
                          tickerB={tickerB}
                        />
                      )}
                      {(() => {
                        // Price evolution — every DinoVox pair; elsewhere only
                        // VOXEGLD vs USDC / WEGLD.
                        const priceEntry = chartEntryForPool(chartable, pool, { anyPair: dexFilter === "DinoVox" });
                        if (!priceEntry) return null;
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPricePool(
                                  pricePool === pool.address
                                    ? null
                                    : pool.address,
                                )
                              }
                              className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:mt-3 dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333] dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors"
                            >
                              <span>{t("pools_price_chart_toggle")}</span>
                              <span className="dvx:flex dvx:items-center dvx:gap-2">
                                <span className="dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:whitespace-nowrap">
                                  {getTicker(priceEntry.token)} /{" "}
                                  {getTicker(priceEntry.quote)}
                                </span>
                                <ChevronDown
                                  className={`dvx:h-3.5 dvx:w-3.5 dvx:transition-transform ${pricePool === pool.address ? "dvx:rotate-180" : ""}`}
                                />
                              </span>
                            </button>
                            {pricePool === pool.address && (
                              <PriceChart
                                apiUrl={apiUrl}
                                entries={[priceEntry]}
                                tickerOf={getTicker}
                                embedded
                                bookLevels={
                                  flags.orderBook && depthPool === pool.address && depthLevels?.pool === pool.address
                                    ? depthLevels.levels.map((l) => ({
                                        side: l.side,
                                        // Chart = price of entry.token in entry.quote; the book's may be the other way.
                                        price: priceEntry.token === depthLevels.base ? l.price : 1 / l.price,
                                      }))
                                    : undefined
                                }
                              />
                            )}
                          </>
                        );
                      })()}
                      {/* Order-book depth (limit orders escrowed in this pair) — off on mainnet for now (useFeatureFlags). */}
                      {flags.orderBook && (
                      <>
                      <button
                        type="button"
                        onClick={() => {
                          setDepthPool(depthPool === pool.address ? null : pool.address);
                          setDepthInverted(false);
                        }}
                        className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:mt-3 dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333] dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors"
                      >
                        <span>{t("depth_toggle")}</span>
                        <ChevronDown
                          className={`dvx:h-3.5 dvx:w-3.5 dvx:transition-transform ${depthPool === pool.address ? "dvx:rotate-180" : ""}`}
                        />
                      </button>
                      {depthPool === pool.address &&
                        (() => {
                          // Souche (USDC/WEGLD/VOXEGLD...) toujours affichée en
                          // référence (quote) par défaut ; paire arbitraire
                          // (OLV/BOD...) : ordre on-chain inchangé. Inversable
                          // manuellement via le bouton ci-dessous.
                          const { base, quote } = orderForQuoteDisplay(
                            { identifier: pool.tokenA, ticker: tickerA, decimals: decA },
                            { identifier: pool.tokenB, ticker: tickerB, decimals: decB },
                            depthInverted,
                          );
                          const rBase = new BigNumber(base.identifier === pool.tokenA ? pool.reserveA : pool.reserveB).shiftedBy(-base.decimals);
                          const rQuote = new BigNumber(quote.identifier === pool.tokenA ? pool.reserveA : pool.reserveB).shiftedBy(-quote.decimals);
                          return (
                            <>
                              <div className="dvx:flex dvx:justify-end dvx:mt-2">
                                <button
                                  type="button"
                                  onClick={() => setDepthInverted((v) => !v)}
                                  className="dvx:flex dvx:items-center dvx:gap-1 dvx:bg-transparent dvx:p-0 dvx:text-[11px] dvx:font-semibold dvx:text-gray-400 dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200"
                                  title={t("depth_invert")}
                                >
                                  <ArrowUpDown className="dvx:h-3 dvx:w-3" />
                                  {base.ticker}/{quote.ticker}
                                </button>
                              </div>
                              <OrderBookDepth
                                apiUrl={apiUrl}
                                pairAddr={pool.address}
                                tokenA={base.identifier}
                                tokenB={quote.identifier}
                                decimalsA={base.decimals}
                                decimalsB={quote.decimals}
                                tickerA={base.ticker}
                                tickerB={quote.ticker}
                                spotAinB={rBase.gt(0) && rQuote.gt(0) ? rQuote.div(rBase).toNumber() : null}
                                onLevels={(levels) => setDepthLevels({ pool: pool.address, base: base.identifier, levels })}
                              />
                            </>
                          );
                        })()}
                      </>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
          {!loading && total != null && fetchedCount < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="dvx:w-full dvx:py-2.5 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:text-sm dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-300 dvx:bg-transparent dvx:hover:text-amber-500 dvx:hover:border-amber-400 dvx:transition-colors dvx:disabled:opacity-50"
            >
              {loadingMore
                ? t("pools_loading_more")
                : t("pools_load_more", { shown: fetchedCount, total })}
            </button>
          )}
          <button
            onClick={() => goTo("create-pool")}
            className="dvx:w-full dvx:py-3 dvx:rounded-xl dvx:border-2 dvx:border-amber-500 dvx:text-amber-500 dvx:font-bold dvx:bg-transparent dvx:hover:bg-amber-50 dvx:dark:hover:bg-amber-900/20 dvx:transition-colors dvx:mt-2"
          >
            {t("pools_create")}
          </button>
        </div>
      </Card>
    </div>
  );
};
