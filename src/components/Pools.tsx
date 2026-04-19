import React from 'react';
import { useWidgetNavigate } from '../hooks/useWidgetNavigate';
import { useTranslation } from 'react-i18next';
import useLoadTranslations from '../hooks/useLoadTranslations';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { Card } from '../ui/Card';
import { useSwapConfig } from '../context/SwapConfigContext';
import type { DexFilter, LiquidityPool, TokenMeta } from '../types';

function formatReserve(raw: string, decimals: number): string {
  const bn = new BigNumber(raw).shiftedBy(-decimals);
  if (bn.isZero()) return '0';
  if (bn.gte(1_000_000)) return bn.toFormat(0) + '';
  if (bn.gte(1000)) return bn.toFormat(2);
  if (bn.gte(1)) return bn.toFormat(4);
  return bn.toFormat(6);
}

export const Pools = () => {
  const { apiUrl, routes } = useSwapConfig();
  const { t } = useTranslation('swap');
  useLoadTranslations('swap');
  const navigate = useWidgetNavigate();

  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
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
      const map: Record<string, TokenMeta> = {};
      for (const t of (tokensRes.data.tokens || [])) {
        map[t.identifier] = { identifier: t.identifier, ticker: t.ticker ?? t.identifier.split('-')[0], decimals: t.decimals ?? 18 };
      }
      setTokenMap(map);
    }).catch(console.error).finally(() => setLoading(false));
  }, [dexFilter, apiUrl]);

  const getTicker = (id: string) => tokenMap[id]?.ticker ?? id.split('-')[0];
  const getDecimals = (id: string) => tokenMap[id]?.decimals ?? 18;

  return (
    <div className='flex flex-col w-full gap-6'>
      <Card
        className='border-2 border-cyan-500/20'
        title={
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4'>
            <div className='flex items-center gap-3'>
              <span className='text-xl'>🌊</span>
              <span className='text-lg font-black tracking-tight'>{t('pools_title')}</span>
            </div>
            <div className='flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto overflow-x-auto'>
              <button
                onClick={() => navigate(routes.swap)}
                className='flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5 whitespace-nowrap'
              >
                {t('tab_swap')}
              </button>
              <button
                onClick={() => navigate(routes.liquidity)}
                className='flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5 whitespace-nowrap'
              >
                {t('tab_liquidity')}
              </button>
              <button className='flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all whitespace-nowrap'>
                {t('pools_title')}
              </button>
            </div>
          </div>
        }
        description={loading ? t('pools_loading_desc') : t('pools_count', { count: pools.length })}
      >
        <div className='flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl mt-4 w-fit'>
          {(['DinoVox', 'XExchange'] as DexFilter[]).map((dex) => (
            <button
              key={dex}
              onClick={() => setDexFilter(dex)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                dexFilter === dex
                  ? 'bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'
              }`}
            >
              {dex}
            </button>
          ))}
        </div>
        <div className='space-y-3 mt-4'>
          {loading ? (
            <div className='flex justify-center py-10'>
              <div className='w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin' />
            </div>
          ) : pools.length === 0 ? (
            <p className='text-center text-sm text-gray-500 dark:text-gray-400 py-8'>{t('pools_empty')}</p>
          ) : (
            pools.map((pool) => {
              const tickerA = getTicker(pool.tokenA);
              const tickerB = getTicker(pool.tokenB);
              const decA = getDecimals(pool.tokenA);
              const decB = getDecimals(pool.tokenB);
              const resA = formatReserve(pool.reserveA, decA);
              const resB = formatReserve(pool.reserveB, decB);
              return (
                <div key={pool.address} className='rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                      <span className='font-black text-gray-900 dark:text-white text-base'>{tickerA} / {tickerB}</span>
                      <span className='text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800 uppercase'>{t('pools_active')}</span>
                    </div>
                    {dexFilter === 'DinoVox' && (
                      <button
                        onClick={() => navigate(`${routes.addLiquidity}?tokenA=${pool.tokenA}&tokenB=${pool.tokenB}`)}
                        className='text-xs font-bold text-amber-500 hover:text-amber-600 transition'
                      >
                        {t('pools_add')}
                      </button>
                    )}
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2'>
                      <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5'>{t('pools_reserve')} {tickerA}</p>
                      <p className='font-bold text-gray-900 dark:text-white text-sm'>{resA} <span className='text-gray-400 font-medium'>{tickerA}</span></p>
                    </div>
                    <div className='rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2'>
                      <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5'>{t('pools_reserve')} {tickerB}</p>
                      <p className='font-bold text-gray-900 dark:text-white text-sm'>{resB} <span className='text-gray-400 font-medium'>{tickerB}</span></p>
                    </div>
                  </div>
                  <p className='text-[10px] text-gray-400 mt-2 font-mono truncate'>{pool.address}</p>
                </div>
              );
            })
          )}
          <button
            onClick={() => navigate(routes.createPool)}
            className='w-full py-3 rounded-xl border-2 border-amber-500 text-amber-500 font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors mt-2'
          >
            {t('pools_create')}
          </button>
        </div>
      </Card>
    </div>
  );
};
