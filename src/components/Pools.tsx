import React from 'react';
import { useGoTo } from '../context/SwapViewContext';
import { useTranslation } from 'react-i18next';
import useLoadTranslations from '../hooks/useLoadTranslations';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { ChevronDown, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { SectionTabs, LiquiditySubTabs } from '../ui/NavTabs';
import { TvlChart, TvlChange } from '../ui/TvlChart';
import { DcaBadge } from '../ui/DcaBadge';
import { useSwapConfig } from '../context/SwapConfigContext';
import { useWidgetSearchParams } from '../hooks/useWidgetSearchParams';
import type { DexFilter, LiquidityPool, TokenMeta } from '../types';

const VOXEGLD_IDENTIFIER = 'VOXEGLD-5872e5';

/** Aggregate over the exact pool set /pools returns — already scoped to the dexType filter. */
interface PoolsSummary {
  poolCount: number;
  poolCountPriced: number;
  tvlUsd: string | null;
  volume24hSwapCount: number;
}

function formatUsd(value: number): string {
  if (value < 0.01) return '<$0.01';
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

function formatReserve(raw: string, decimals: number): string {
  const bn = new BigNumber(raw).shiftedBy(-decimals);
  if (bn.isZero()) return '0';
  if (bn.gte(1_000_000)) return bn.toFormat(0) + '';
  if (bn.gte(1000)) return bn.toFormat(2);
  if (bn.gte(1)) return bn.toFormat(4);
  return bn.toFormat(6);
}

export const Pools = () => {
  const { apiUrl, explorerAddress } = useSwapConfig();
  const goTo = useGoTo();
  const { t } = useTranslation('swap');
  useLoadTranslations('swap');

  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
  const [summary, setSummary] = React.useState<PoolsSummary | null>(null);
  const [tokenMap, setTokenMap] = React.useState<Record<string, TokenMeta>>({});
  const [loading, setLoading] = React.useState(true);
  const [dexFilter, setDexFilter] = React.useState<DexFilter>('DinoVox');
  // Sorted server-side (desc) so it stays correct across "Load more" pages.
  const [sortBy, setSortBy] = React.useState<'tvlUsd' | 'aprPct'>('tvlUsd');
  // APR is only computed for DinoVox pools (null on external DEXes), so the
  // APR sort — and its toggle — only exist on that tab.
  const effectiveSortBy = dexFilter === 'DinoVox' ? sortBy : 'tvlUsd';
  // /pools is paginated (sorted by TVL or APR desc server-side). DinoVox: one page at
  // the API max covers it (and keeps the ?filter= below exhaustive); external
  // DEXes (1000+ pools) load 50 at a time behind "Load more".
  const pageSize = dexFilter === 'DinoVox' ? 200 : 50;
  const [total, setTotal] = React.useState<number | null>(null);
  const [fetchedCount, setFetchedCount] = React.useState(0);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const fetchPage = (offset: number) =>
    axios.get(`${apiUrl}/pools`, { params: { dexType: dexFilter, sortBy: effectiveSortBy, limit: pageSize, offset } });
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

  React.useEffect(() => {
    if (!apiUrl) return;
    setLoading(true);
    Promise.all([
      fetchPage(0),
      axios.get(`${apiUrl}/tokens`),
    ]).then(([poolsRes, tokensRes]) => {
      const page: LiquidityPool[] = poolsRes.data.pools || [];
      setPools(page.filter((p) => p.isActive));
      setFetchedCount(page.length);
      setTotal(poolsRes.data.pagination?.total ?? null);
      // Already scoped to this exact dexType filter server-side — no
      // client-side re-aggregation needed when switching tabs.
      setSummary(poolsRes.data.summary ?? null);
      const map: Record<string, TokenMeta> = {};
      for (const t of (tokensRes.data.tokens || [])) {
        map[t.identifier] = { identifier: t.identifier, ticker: t.ticker ?? t.identifier.split('-')[0], decimals: t.decimals ?? 18, priceUsd: t.priceUsd ?? null };
      }
      setTokenMap(map);
    }).catch(console.error).finally(() => setLoading(false));
  }, [dexFilter, effectiveSortBy, apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const getTicker = (id: string) => tokenMap[id]?.ticker ?? id.split('-')[0];
  const getDecimals = (id: string) => tokenMap[id]?.decimals ?? 18;

  // Token search (ticker or identifier, partial match), prefilled from
  // ?filter=<ticker|identifier>. Client-side over the loaded pools: exhaustive
  // on DinoVox (single 200-pool page), only the pages loaded so far elsewhere.
  const [searchParams] = useWidgetSearchParams();
  const [tokenSearch, setTokenSearch] = React.useState(() => searchParams.get('filter')?.trim() ?? '');
  const tokenFilter = tokenSearch.trim().toUpperCase() || null;
  const matchesToken = (id: string) =>
    !!tokenFilter && (id.toUpperCase().includes(tokenFilter) || getTicker(id).toUpperCase().includes(tokenFilter));
  const visiblePools = tokenFilter
    ? pools.filter((p) => matchesToken(p.tokenA) || matchesToken(p.tokenB))
    : pools;

  return (
    <div className='dvx:flex dvx:flex-col dvx:w-full dvx:gap-6'>
      <Card
        className='dvx:border-2 dvx:border-cyan-500/20'
        title={
          <div className='dvx:flex dvx:flex-col dvx:items-start dvx:w-full dvx:gap-4'>
            <SectionTabs active="liquidity" />
            <LiquiditySubTabs active="pools" />
          </div>
        }
        description={loading ? t('pools_loading_desc') : t('pools_count', { count: tokenFilter ? visiblePools.length : (total ?? visiblePools.length) })}
      >
        <div className='dvx:flex dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:mt-4 dvx:w-fit'>
          {(['DinoVox', 'XExchange', 'JExchange', 'OneDex'] as DexFilter[]).map((dex) => (
            <button
              key={dex}
              onClick={() => setDexFilter(dex)}
              className={`dvx:px-4 dvx:py-1.5 dvx:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all ${
                dexFilter === dex
                  ? 'dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md'
                  : 'dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white'
              }`}
            >
              {dex}
            </button>
          ))}
        </div>
        <div className='dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-2 dvx:mt-3'>
          <input
            type='text'
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            placeholder={t('pools_search_placeholder')}
            className='dvx:flex-1 dvx:min-w-[160px] dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-1.5 dvx:text-xs dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500'
          />
          {dexFilter === 'DinoVox' && (
          <div className='dvx:flex dvx:items-center dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl'>
            <span className='dvx:px-2 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400'>
              {t('pools_sort_label')}
            </span>
            {(['tvlUsd', 'aprPct'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`dvx:px-3 dvx:py-1 dvx:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all ${
                  sortBy === key
                    ? 'dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md'
                    : 'dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-white'
                }`}
              >
                {key === 'tvlUsd' ? 'TVL' : 'APR'}
              </button>
            ))}
          </div>
          )}
        </div>
        {summary && (
          <div className='dvx:rounded-2xl dvx:border dvx:border-amber-200 dvx:dark:border-amber-800/50 dvx:bg-amber-50 dvx:dark:bg-amber-900/10 dvx:px-4 dvx:py-3 dvx:mt-4 dvx:flex dvx:flex-wrap dvx:items-center dvx:justify-between dvx:gap-2'>
            <span className='dvx:text-xs dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-400 dvx:uppercase dvx:tracking-wider'>
              {t('pools_summary_tvl')}
            </span>
            <div className='dvx:flex dvx:items-center dvx:gap-3'>
              <span className='dvx:font-bold dvx:text-amber-600 dvx:dark:text-amber-400 dvx:text-base'>
                {summary.tvlUsd != null ? formatUsd(parseFloat(summary.tvlUsd)) : '—'}
              </span>
              <span className='dvx:text-[10px] dvx:text-gray-400'>
                {t('pools_summary_stats', {
                  poolCount: summary.poolCount,
                  swapCount: summary.volume24hSwapCount,
                })}
              </span>
            </div>
          </div>
        )}
        <div className='dvx:space-y-3 dvx:mt-4'>
          {loading ? (
            <div className='dvx:flex dvx:justify-center dvx:py-10'>
              <div className='dvx:w-6 dvx:h-6 dvx:border-2 dvx:border-amber-500 dvx:border-t-transparent dvx:rounded-full dvx:animate-spin' />
            </div>
          ) : visiblePools.length === 0 ? (
            <p className='dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400 dvx:py-8'>{t('pools_empty')}</p>
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
              const resAUsd = priceA ? new BigNumber(pool.reserveA).shiftedBy(-decA).toNumber() * parseFloat(priceA) : null;
              const resBUsd = priceB ? new BigNumber(pool.reserveB).shiftedBy(-decB).toNumber() * parseFloat(priceB) : null;
              const tvl = pool.lpTokenPriceUsd && pool.lpSupply
                ? parseFloat(pool.lpTokenPriceUsd) * new BigNumber(pool.lpSupply).shiftedBy(-18).toNumber()
                : (resAUsd != null && resBUsd != null) ? resAUsd + resBUsd : null;
              return (
                <div key={pool.address} className='dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4'>
                  <div className='dvx:flex dvx:items-start dvx:justify-between dvx:gap-3 dvx:mb-3'>
                    <div className='dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap'>
                      <span className='dvx:font-black dvx:text-gray-900 dvx:dark:text-white dvx:text-base'>{tickerA} / {tickerB}</span>
                      <span className='dvx:text-[10px] dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-green-100 dvx:text-green-600 dvx:dark:bg-green-900/30 dvx:dark:text-green-400 dvx:font-semibold dvx:border dvx:border-green-200 dvx:dark:border-green-800 dvx:uppercase'>{t('pools_active')}</span>
                      {pool.dcaReady && <DcaBadge tokenA={pool.tokenA} tokenB={pool.tokenB} />}
                      {/* DinoVox: TVL + 24h change live on the "TVL history" toggle row below. */}
                      {dexFilter !== 'DinoVox' && tvl != null && tvl > 0 && (
                        <span className='dvx:text-[10px] dvx:font-semibold dvx:text-gray-400'>
                          TVL {formatUsd(tvl)}
                        </span>
                      )}
                      {pool.apr?.aprPct != null && (
                        <span className='dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-bold dvx:text-green-600 dvx:dark:text-green-400'>
                          {t('pools_apr', { pct: parseFloat(pool.apr.aprPct).toFixed(2) })}
                          <span
                            className='dvx:cursor-help'
                            title={[
                              t('pools_apr_tooltip_intro'),
                              '',
                              `• ${t('pools_apr_tooltip_window', { days: pool.apr.windowDays })}`,
                              ...(pool.tokenA === VOXEGLD_IDENTIFIER || pool.tokenB === VOXEGLD_IDENTIFIER
                                ? ['', `• ${t('pools_apr_tooltip_voxegld')}`]
                                : []),
                            ].join('\n')}
                          >
                            <Info className='dvx:w-3 dvx:h-3 dvx:text-gray-400' />
                          </span>
                        </span>
                      )}
                      {pool.apr?.feesUsdLp != null && Number.isFinite(parseFloat(pool.apr.feesUsdLp)) && (
                        <span
                          className='dvx:inline-flex dvx:items-center dvx:gap-1 dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:cursor-help dvx:whitespace-nowrap'
                          title={t('pools_fees_lp_tooltip', { days: Math.round(pool.apr.windowDays) })}
                        >
                          {t('pools_fees_lp', { amount: parseFloat(pool.apr.feesUsdLp) === 0 ? '$0' : formatUsd(parseFloat(pool.apr.feesUsdLp)) })}
                          <Info className='dvx:w-3 dvx:h-3 dvx:text-gray-400' />
                        </span>
                      )}
                      {pool.volume24h != null && (
                        <span className='dvx:text-[10px] dvx:font-semibold dvx:text-gray-400'>
                          {t('pools_swaps_24h', { count: pool.volume24h.swapCount })}
                        </span>
                      )}
                    </div>
                    {dexFilter === 'DinoVox' && (
                      <button
                        onClick={() => goTo('add-liquidity', { tokenA: pool.tokenA, tokenB: pool.tokenB })}
                        className='dvx:shrink-0 dvx:mt-1 dvx:whitespace-nowrap dvx:text-xs dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition'
                      >
                        {t('pools_add')}
                      </button>
                    )}
                  </div>
                  <div className='dvx:grid dvx:grid-cols-2 dvx:gap-3'>
                    <div className='dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2'>
                      <p className='dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-0.5'>{t('pools_reserve')} {tickerA}</p>
                      <p className='dvx:font-bold dvx:text-gray-900 dvx:dark:text-white dvx:text-sm'>{resA} <span className='dvx:text-gray-400 dvx:font-medium'>{tickerA}</span></p>
                      {resAUsd != null && resAUsd > 0 && <p className='dvx:text-[10px] dvx:text-gray-400 dvx:mt-0.5'>{formatUsd(resAUsd)}</p>}
                    </div>
                    <div className='dvx:rounded-xl dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:border dvx:border-gray-100 dvx:dark:border-[#333] dvx:px-3 dvx:py-2'>
                      <p className='dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:mb-0.5'>{t('pools_reserve')} {tickerB}</p>
                      <p className='dvx:font-bold dvx:text-gray-900 dvx:dark:text-white dvx:text-sm'>{resB} <span className='dvx:text-gray-400 dvx:font-medium'>{tickerB}</span></p>
                      {resBUsd != null && resBUsd > 0 && <p className='dvx:text-[10px] dvx:text-gray-400 dvx:mt-0.5'>{formatUsd(resBUsd)}</p>}
                    </div>
                  </div>
                  <a
                    href={`${explorerAddress}/accounts/${pool.address}/tokens`}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={t('pools_view_explorer')}
                    className='dvx:block dvx:text-[10px] dvx:text-gray-400 dvx:hover:text-amber-500 dvx:hover:underline dvx:mt-2 dvx:font-mono dvx:truncate'
                  >
                    {pool.address}
                  </a>
                  {dexFilter === 'DinoVox' && (
                    <>
                      <button
                        type='button'
                        onClick={() => setChartPool(chartPool === pool.address ? null : pool.address)}
                        className='dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:mt-3 dvx:pt-2 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333] dvx:text-xs dvx:font-semibold dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-600 dvx:dark:hover:text-gray-200 dvx:transition-colors'
                      >
                        <span>{t('pools_tvl_chart_toggle')}</span>
                        <span className='dvx:flex dvx:items-center dvx:gap-2'>
                          {tvl != null && tvl > 0 && (
                            <span className='dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:whitespace-nowrap'>
                              TVL {formatUsd(tvl)}
                              <TvlChange pct={pool.tvlChange24hPct} suffix='24h' />
                            </span>
                          )}
                          <ChevronDown className={`dvx:h-3.5 dvx:w-3.5 dvx:transition-transform ${chartPool === pool.address ? 'dvx:rotate-180' : ''}`} />
                        </span>
                      </button>
                      {chartPool === pool.address && <TvlChart apiUrl={apiUrl} address={pool.address} tickerA={tickerA} tickerB={tickerB} />}
                    </>
                  )}
                </div>
              );
            })
          )}
          {!loading && total != null && fetchedCount < total && (
            <button
              type='button'
              onClick={loadMore}
              disabled={loadingMore}
              className='dvx:w-full dvx:py-2.5 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:text-sm dvx:font-semibold dvx:text-gray-500 dvx:dark:text-gray-300 dvx:bg-transparent dvx:hover:text-amber-500 dvx:hover:border-amber-400 dvx:transition-colors dvx:disabled:opacity-50'
            >
              {loadingMore ? t('pools_loading_more') : t('pools_load_more', { shown: fetchedCount, total })}
            </button>
          )}
          <button
            onClick={() => goTo('create-pool')}
            className='dvx:w-full dvx:py-3 dvx:rounded-xl dvx:border-2 dvx:border-amber-500 dvx:text-amber-500 dvx:font-bold dvx:bg-transparent dvx:hover:bg-amber-50 dvx:dark:hover:bg-amber-900/20 dvx:transition-colors dvx:mt-2'
          >
            {t('pools_create')}
          </button>
        </div>
      </Card>
    </div>
  );
};
