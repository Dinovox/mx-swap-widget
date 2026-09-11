import React from 'react';
import { useGoTo } from '../context/SwapViewContext';
import { useTranslation } from 'react-i18next';
import useLoadTranslations from '../hooks/useLoadTranslations';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { useSwapConfig } from '../context/SwapConfigContext';
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

  React.useEffect(() => {
    if (!apiUrl) return;
    setLoading(true);
    Promise.all([
      axios.get(`${apiUrl}/pools`, { params: { dexType: dexFilter } }),
      axios.get(`${apiUrl}/tokens`),
    ]).then(([poolsRes, tokensRes]) => {
      const activePools: LiquidityPool[] = (poolsRes.data.pools || []).filter((p: LiquidityPool) => p.isActive);
      setPools(activePools);
      // Already scoped to this exact dexType filter server-side — no
      // client-side re-aggregation needed when switching tabs.
      setSummary(poolsRes.data.summary ?? null);
      const map: Record<string, TokenMeta> = {};
      for (const t of (tokensRes.data.tokens || [])) {
        map[t.identifier] = { identifier: t.identifier, ticker: t.ticker ?? t.identifier.split('-')[0], decimals: t.decimals ?? 18, priceUsd: t.priceUsd ?? null };
      }
      setTokenMap(map);
    }).catch(console.error).finally(() => setLoading(false));
  }, [dexFilter, apiUrl]);

  const getTicker = (id: string) => tokenMap[id]?.ticker ?? id.split('-')[0];
  const getDecimals = (id: string) => tokenMap[id]?.decimals ?? 18;

  return (
    <div className='dvx:flex dvx:flex-col dvx:w-full dvx:gap-6'>
      <Card
        className='dvx:border-2 dvx:border-cyan-500/20'
        title={
          <div className='dvx:flex dvx:flex-col dvx:sm:flex-row dvx:items-start dvx:sm:items-center dvx:justify-between dvx:w-full dvx:gap-4'>
            <div className='dvx:flex dvx:items-center dvx:gap-3'>
              <span className='dvx:text-xl'>🌊</span>
              <span className='dvx:text-lg dvx:font-black dvx:tracking-tight'>{t('pools_title')}</span>
            </div>
            <div className='dvx:flex dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:shadow-inner dvx:w-full dvx:sm:w-auto dvx:overflow-x-auto'>
              <button
                onClick={() => goTo('swap')}
                className='dvx:flex-1 dvx:sm:flex-initial dvx:px-3 dvx:sm:px-4 dvx:py-2 dvx:text-sm dvx:font-bold dvx:rounded-lg dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-900 dvx:dark:hover:text-white dvx:transition-all dvx:hover:bg-white/50 dvx:dark:hover:bg-white/5 dvx:whitespace-nowrap'
              >
                {t('tab_swap')}
              </button>
              <button
                onClick={() => goTo('liquidity')}
                className='dvx:flex-1 dvx:sm:flex-initial dvx:px-3 dvx:sm:px-4 dvx:py-2 dvx:text-sm dvx:font-bold dvx:rounded-lg dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-900 dvx:dark:hover:text-white dvx:transition-all dvx:hover:bg-white/50 dvx:dark:hover:bg-white/5 dvx:whitespace-nowrap'
              >
                {t('tab_liquidity')}
              </button>
              <button className='dvx:flex-1 dvx:sm:flex-initial dvx:px-3 dvx:sm:px-4 dvx:py-2 dvx:text-sm dvx:font-black dvx:rounded-lg dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md dvx:transition-all dvx:whitespace-nowrap'>
                {t('pools_title')}
              </button>
            </div>
          </div>
        }
        description={loading ? t('pools_loading_desc') : t('pools_count', { count: pools.length })}
      >
        <div className='dvx:flex dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:mt-4 dvx:w-fit'>
          {(['DinoVox', 'XExchange', 'JExchange'] as DexFilter[]).map((dex) => (
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
          ) : pools.length === 0 ? (
            <p className='dvx:text-center dvx:text-sm dvx:text-gray-500 dvx:dark:text-gray-400 dvx:py-8'>{t('pools_empty')}</p>
          ) : (
            pools.map((pool) => {
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
                  <div className='dvx:flex dvx:items-center dvx:justify-between dvx:mb-3'>
                    <div className='dvx:flex dvx:items-center dvx:gap-2 dvx:flex-wrap'>
                      <span className='dvx:font-black dvx:text-gray-900 dvx:dark:text-white dvx:text-base'>{tickerA} / {tickerB}</span>
                      <span className='dvx:text-[10px] dvx:px-2 dvx:py-0.5 dvx:rounded-full dvx:bg-green-100 dvx:text-green-600 dvx:dark:bg-green-900/30 dvx:dark:text-green-400 dvx:font-semibold dvx:border dvx:border-green-200 dvx:dark:border-green-800 dvx:uppercase'>{t('pools_active')}</span>
                      {tvl != null && tvl > 0 && (
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
                    </div>
                    {dexFilter === 'DinoVox' && (
                      <button
                        onClick={() => goTo('add-liquidity', { tokenA: pool.tokenA, tokenB: pool.tokenB })}
                        className='dvx:text-xs dvx:font-bold dvx:text-amber-500 dvx:bg-transparent dvx:hover:text-amber-600 dvx:transition'
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
                </div>
              );
            })
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
