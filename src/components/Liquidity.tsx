import React from 'react';
import { Card } from '../ui/Card';
import { useTranslation } from 'react-i18next';
import { useWidgetNavigate } from '../hooks/useWidgetNavigate';
import useLoadTranslations from '../hooks/useLoadTranslations';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig';
import { useGetUserESDT } from '../hooks/useGetUserEsdt';
import axios from 'axios';
import { useSwapConfig } from '../context/SwapConfigContext';
import BigNumber from 'bignumber.js';
import type { LiquidityPool, UserPosition } from '../types';

export const Liquidity = () => {
  const { apiUrl, routes } = useSwapConfig();
  const { t } = useTranslation('swap');
  useLoadTranslations('swap');
  const navigate = useWidgetNavigate();
  const { address } = useGetAccount();
  const { network } = useGetNetworkConfig();

  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
  const [poolsLoading, setPoolsLoading] = React.useState(true);
  const [userPositions, setUserPositions] = React.useState<UserPosition[]>([]);

  React.useEffect(() => {
    if (!apiUrl) return;
    setPoolsLoading(true);
    axios.get(`${apiUrl}/pools`).then((res) => {
      setPools(res.data.pools || []);
    }).catch(console.error).finally(() => setPoolsLoading(false));
  }, [apiUrl]);

  const walletTokens = useGetUserESDT(undefined, { enabled: !!address });

  React.useEffect(() => {
    if (!walletTokens || walletTokens.length === 0 || pools.length === 0 || !network?.apiAddress) {
      setUserPositions([]);
      return;
    }
    const held = pools.flatMap(pool => {
      const balanceObj = walletTokens.find((wt: any) => wt.identifier === pool.lpToken);
      if (balanceObj && new BigNumber(balanceObj.balance).gt(0)) {
        return [{ pool, balance: balanceObj.balance as string }];
      }
      return [];
    });
    if (held.length === 0) { setUserPositions([]); return; }
    Promise.all(
      held.map(async ({ pool, balance }) => {
        const [lpRes, tokenARes, tokenBRes] = await Promise.all([
          axios.get(`/tokens/${pool.lpToken}`, { baseURL: network.apiAddress }),
          axios.get(`/tokens/${pool.tokenA}`, { baseURL: network.apiAddress }).catch(() => null),
          axios.get(`/tokens/${pool.tokenB}`, { baseURL: network.apiAddress }).catch(() => null),
        ]);
        return { pool, balance, lpTotalSupply: lpRes.data?.minted ?? '1', decimalsA: tokenARes?.data?.decimals ?? 18, decimalsB: tokenBRes?.data?.decimals ?? 18 } as UserPosition;
      })
    ).then(setUserPositions).catch(console.error);
  }, [walletTokens, pools, network?.apiAddress]);

  return (
    <div className='flex flex-col w-full gap-6'>
      <Card
        className='border-2 border-cyan-500/20'
        title={
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4'>
            <div className='flex items-center gap-3'>
              <span className='text-xl'>💧</span>
              <span className='text-lg font-black tracking-tight'>{t('liquidity_title')}</span>
            </div>
            <div className='flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto'>
              <button onClick={() => navigate(routes.swap)} className='flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5'>
                Swap
              </button>
              <button className='flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all'>
                {t('tab_liquidity')}
              </button>
              <button onClick={() => navigate(routes.pools)} className='flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5'>
                Pools
              </button>
            </div>
          </div>
        }
        description={t('liquidity_card_desc')}
      >
        <div className='space-y-4 mt-4'>
          {!poolsLoading && userPositions.length === 0 ? (
            <div className='rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-6 text-center'>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>{t('liquidity_empty')}</p>
              <button onClick={() => navigate(routes.addLiquidity)} className='dinoButton w-full !py-3 text-base'>
                {t('liquidity_add')}
              </button>
            </div>
          ) : (
            <div className='space-y-4'>
              {userPositions.map((pos: UserPosition) => {
                const lpTokenTicker = pos.pool.lpToken.split('-')[0];
                const displayBalance = new BigNumber(pos.balance).shiftedBy(-18).toFixed(6, BigNumber.ROUND_DOWN);
                const totalSupplyBN = new BigNumber(pos.lpTotalSupply);
                const safeTotalSupply = totalSupplyBN.isZero() ? new BigNumber(1) : totalSupplyBN;
                const estimatedA = new BigNumber(pos.balance).multipliedBy(pos.pool.reserveA).dividedBy(safeTotalSupply).shiftedBy(-pos.decimalsA).toFixed(6, BigNumber.ROUND_DOWN);
                const estimatedB = new BigNumber(pos.balance).multipliedBy(pos.pool.reserveB).dividedBy(safeTotalSupply).shiftedBy(-pos.decimalsB).toFixed(6, BigNumber.ROUND_DOWN);
                return (
                  <div key={pos.pool.address} className='rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#2a2a2a] p-4'>
                    <div className='flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-3'>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2 mb-0.5'>
                          <span className='font-bold text-gray-900 dark:text-white uppercase truncate'>{lpTokenTicker}</span>
                          <span className='text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 flex-shrink-0'>LP</span>
                        </div>
                        <p className='text-xs text-gray-500 font-medium truncate'>{pos.pool.tokenA.split('-')[0]} / {pos.pool.tokenB.split('-')[0]}</p>
                      </div>
                      <div className='xs:text-right w-full xs:w-auto'>
                        <p className='font-bold text-gray-900 dark:text-white mb-1'>{displayBalance} LP</p>
                        <div className='flex gap-3 xs:justify-end'>
                          <button onClick={() => navigate(`${routes.addLiquidity}?tokenA=${pos.pool.tokenA}&tokenB=${pos.pool.tokenB}`)} className='text-xs font-bold text-green-500 hover:text-green-600 transition underline decoration-dashed'>{t('liquidity_add_btn')}</button>
                          <button onClick={() => navigate(`${routes.removeLiquidity}?pool=${pos.pool.address}`)} className='text-xs font-bold text-red-500 hover:text-red-600 transition underline decoration-dashed'>{t('liquidity_remove_btn')}</button>
                        </div>
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs'>
                        <p className='text-gray-400 mb-0.5'>≈ {pos.pool.tokenA.split('-')[0]}</p>
                        <p className='font-bold text-gray-900 dark:text-white'>{estimatedA}</p>
                      </div>
                      <div className='rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs'>
                        <p className='text-gray-400 mb-0.5'>≈ {pos.pool.tokenB.split('-')[0]}</p>
                        <p className='font-bold text-gray-900 dark:text-white'>{estimatedB}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => navigate(routes.addLiquidity)} className='dinoButton w-full !py-3 text-base'>{t('liquidity_add')}</button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
