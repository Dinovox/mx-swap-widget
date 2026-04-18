import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import useLoadTranslations from '../hooks/useLoadTranslations';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig';
import { Address, Transaction } from '@multiversx/sdk-core';
import { GAS_PRICE } from '@multiversx/sdk-dapp/out/constants/mvx.constants';
import { signAndSendTransactions } from '../helpers/signAndSendTransactions';
import { useGetUserESDT } from '../hooks/useGetUserEsdt';
import { Card } from '../ui/Card';
import { TokenSelect } from '../ui/TokenSelect';
import bigToHex from '../helpers/bigToHex';
import { useSwapConfig } from '../context/SwapConfigContext';
import BigNumber from 'bignumber.js';

interface DexToken { identifier: string; ticker: string; poolCount: number; decimals: number; logoUrl?: string | null; }
interface PoolInfo { address: string; tokenA: string; tokenB: string; lpToken: string; reserveA: string; reserveB: string; lpSupply: string; isActive: boolean; }

const strToHex = (s: string) => Buffer.from(s, 'utf8').toString('hex');

function intSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = n; let y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}

export const AddLiquidity = () => {
  const { apiUrl, routes } = useSwapConfig();
  const { t } = useTranslation('swap');
  useLoadTranslations('swap');
  const { address } = useGetAccount();
  const { network } = useGetNetworkConfig();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tokens, setTokens] = useState<DexToken[]>([]);
  const [hubTokens, setHubTokens] = useState<DexToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokenA, setTokenA] = useState<DexToken | null>(null);
  const [tokenB, setTokenB] = useState<DexToken | null>(null);

  const selectTokenA = (t: DexToken | null) => { setTokenA(t); setSearchParams(prev => { const p = new URLSearchParams(prev); t ? p.set('tokenA', t.identifier) : p.delete('tokenA'); return p; }, { replace: true }); };
  const selectTokenB = (t: DexToken | null) => { setTokenB(t); setSearchParams(prev => { const p = new URLSearchParams(prev); t ? p.set('tokenB', t.identifier) : p.delete('tokenB'); return p; }, { replace: true }); };

  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const lastEdited = useRef<'A' | 'B'>('A');
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [lpTotalMinted, setLpTotalMinted] = useState<string | null>(null);
  const [lpPreview, setLpPreview] = useState<bigint | null>(null);
  const [refundA, setRefundA] = useState(0n);
  const [refundB, setRefundB] = useState(0n);
  const [lpTokenSet, setLpTokenSet] = useState<Set<string>>(new Set());

  const allWalletTokensRaw = useGetUserESDT(undefined, { enabled: !!address });
  const [walletTokens, setWalletTokens] = useState<DexToken[]>([]);

  const tokenBChoices = React.useMemo(() => {
    const base = walletTokens.length > 0 ? walletTokens : [];
    if (tokenB && !base.some(t => t.identifier === tokenB.identifier)) return [tokenB, ...base];
    return base;
  }, [walletTokens, tokenB]);

  useEffect(() => {
    if (!allWalletTokensRaw || allWalletTokensRaw.length === 0) { setWalletTokens([]); return; }
    const mapped: DexToken[] = allWalletTokensRaw.filter((t: any) => !lpTokenSet.has(t.identifier)).map((t: any) => ({
      identifier: t.identifier, ticker: t.ticker || t.identifier.split('-')[0], poolCount: 0, decimals: t.decimals ?? 18, logoUrl: t.assets?.svgUrl ?? t.assets?.pngUrl ?? null,
    }));
    setWalletTokens(mapped);
  }, [allWalletTokensRaw, lpTokenSet]);

  const balancesA = useGetUserESDT(tokenA?.identifier ?? undefined, { enabled: !!tokenA && !!address });
  const balancesB = useGetUserESDT(tokenB?.identifier ?? undefined, { enabled: !!tokenB && !!address });
  const balanceRawA = balancesA?.[0]?.balance ?? '0';
  const balanceRawB = balancesB?.[0]?.balance ?? '0';
  const balanceDisplayA = tokenA && balanceRawA ? new BigNumber(balanceRawA).shiftedBy(-tokenA.decimals).toFixed(6, BigNumber.ROUND_DOWN) : '0';
  const balanceDisplayB = tokenB && balanceRawB ? new BigNumber(balanceRawB).shiftedBy(-tokenB.decimals).toFixed(6, BigNumber.ROUND_DOWN) : '0';

  useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);
    const fetchTokens = async () => {
      try {
        const [tokensRes, hubTokensRes, poolsRes] = await Promise.all([
          axios.get(`${apiUrl}/tokens`),
          axios.get(`${apiUrl}/tokens/hub`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/pools`).catch(() => ({ data: { pools: [] } })),
        ]);
        const allLpTokens: string[] = (poolsRes.data.pools || []).map((p: any) => p.lpToken).filter(Boolean);
        setLpTokenSet(new Set(allLpTokens));
        const raw = tokensRes.data.tokens || [];
        const hubItems = hubTokensRes.data?.hubTokens || [];
        const hubList: string[] = hubItems.map((h: any) => h.identifier);
        const combinedRaw = [...raw];
        for (const ht of hubItems) if (!combinedRaw.find((t: any) => t.identifier === ht.identifier)) combinedRaw.push({ ...ht, poolCount: 0 });
        const validTokens: DexToken[] = combinedRaw.map((t: any) => ({ identifier: t.identifier, ticker: t.ticker || t.identifier.split('-')[0], poolCount: t.poolCount ?? 0, decimals: t.decimals ?? 18, logoUrl: t.logoUrl ?? null }));
        setTokens(validTokens);
        setHubTokens(validTokens.filter(t => hubList.includes(t.identifier)));
      } catch (err) { console.error(err); } finally { setTokensLoading(false); }
    };
    fetchTokens();
  }, [apiUrl]); // eslint-disable-line

  useEffect(() => {
    if (tokens.length === 0) return;
    const qA = searchParams.get('tokenA');
    const qB = searchParams.get('tokenB');
    if (qA && !tokenA) setTokenA(tokens.find(t => t.identifier === qA) || null);
    if (qB && !tokenB) setTokenB(tokens.find(t => t.identifier === qB) || null);
  }, [tokens]); // eslint-disable-line

  useEffect(() => {
    if (!tokenA || !tokenB) { setPool(null); setLpTotalMinted(null); return; }
    setPoolLoading(true);
    axios.get(`${apiUrl}/pools`).then(async (res) => {
      const pools: PoolInfo[] = res.data.pools || [];
      const found = pools.find(p => (p.tokenA === tokenA.identifier && p.tokenB === tokenB.identifier) || (p.tokenA === tokenB.identifier && p.tokenB === tokenA.identifier));
      setPool(found || null);
      if (found?.lpToken && network?.apiAddress) {
        try {
          const lpRes = await axios.get(`/tokens/${found.lpToken}`, { baseURL: network.apiAddress });
          setLpTotalMinted(lpRes.data?.minted ?? null);
        } catch { setLpTotalMinted(null); }
      } else setLpTotalMinted(null);
    }).catch(console.error).finally(() => setPoolLoading(false));
  }, [tokenA, tokenB]); // eslint-disable-line

  const handleAmountA = (val: string) => {
    setAmountA(val); lastEdited.current = 'A';
    if (!pool || !tokenA || !tokenB || !val) return;
    const isA = pool.tokenA === tokenA.identifier;
    const resA = new BigNumber(isA ? pool.reserveA : pool.reserveB);
    const resB = new BigNumber(isA ? pool.reserveB : pool.reserveA);
    if (resA.isZero() || resB.isZero()) return;
    setAmountB(new BigNumber(val).shiftedBy(tokenA.decimals).multipliedBy(resB).dividedBy(resA).shiftedBy(-tokenB.decimals).toFixed(6, BigNumber.ROUND_UP));
  };

  const handleAmountB = (val: string) => {
    setAmountB(val); lastEdited.current = 'B';
    if (!pool || !tokenA || !tokenB || !val) return;
    const isA = pool.tokenA === tokenA.identifier;
    const resA = new BigNumber(isA ? pool.reserveA : pool.reserveB);
    const resB = new BigNumber(isA ? pool.reserveB : pool.reserveA);
    if (resA.isZero() || resB.isZero()) return;
    setAmountA(new BigNumber(val).shiftedBy(tokenB.decimals).multipliedBy(resA).dividedBy(resB).shiftedBy(-tokenA.decimals).toFixed(6, BigNumber.ROUND_UP));
  };

  useEffect(() => {
    if (!tokenA || !tokenB || !amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) { setLpPreview(null); setRefundA(0n); setRefundB(0n); return; }
    const aAmt = BigInt(new BigNumber(amountA).shiftedBy(tokenA.decimals).toFixed(0));
    const bAmt = BigInt(new BigNumber(amountB).shiftedBy(tokenB.decimals).toFixed(0));
    const resAbn = pool ? new BigNumber(pool.reserveA) : new BigNumber(0);
    const resBbn = pool ? new BigNumber(pool.reserveB) : new BigNumber(0);
    const poolHasLiquidity = pool && resAbn.gt(0) && resBbn.gt(0);
    if (!poolHasLiquidity) { setLpPreview(intSqrt(aAmt * bAmt)); setRefundA(0n); setRefundB(0n); return; }
    const isA = pool.tokenA === tokenA.identifier;
    const pAmtA = isA ? aAmt : bAmt; const pAmtB = isA ? bAmt : aAmt;
    const resA = BigInt(resAbn.toFixed(0)); const resB = BigInt(resBbn.toFixed(0));
    const lpSupply = BigInt(new BigNumber(lpTotalMinted ?? '0').isZero() ? '1' : new BigNumber(lpTotalMinted!).toFixed(0));
    const lpFromA = resA > 0n ? (pAmtA * lpSupply) / resA : 0n;
    const lpFromB = resB > 0n ? (pAmtB * lpSupply) / resB : 0n;
    if (lpFromA <= lpFromB) { setLpPreview(lpFromA); const uB = resA > 0n ? (pAmtA * resB) / resA : 0n; setRefundA(0n); setRefundB(isA ? pAmtB - uB : pAmtA - uB); }
    else { setLpPreview(lpFromB); const uA = resB > 0n ? (pAmtB * resA) / resB : 0n; setRefundA(isA ? pAmtA - uA : pAmtB - uA); setRefundB(0n); }
  }, [amountA, amountB, pool, tokenA, tokenB, lpTotalMinted]);

  const handleTx = async () => {
    if (!pool || !tokenA || !tokenB || !address || !amountA || !amountB) return;
    try {
      const aAmt = BigInt(new BigNumber(amountA).shiftedBy(tokenA.decimals).toFixed(0));
      const bAmt = BigInt(new BigNumber(amountB).shiftedBy(tokenB.decimals).toFixed(0));
      const senderAddr = new Address(address);
      const txDataParts = ['MultiESDTNFTTransfer', new Address(pool.address).toHex(), '02', strToHex(tokenA.identifier), '00', bigToHex(aAmt), strToHex(tokenB.identifier), '00', bigToHex(bAmt), strToHex('addLiquidity'), bigToHex(0n), bigToHex(0n)];
      const transaction = new Transaction({ value: 0n, data: new TextEncoder().encode(txDataParts.join('@')), receiver: senderAddr, sender: senderAddr, gasLimit: 15_000_000n, gasPrice: BigInt(GAS_PRICE), chainID: network.chainId, version: 1 });
      await signAndSendTransactions({ transactions: [transaction], transactionsDisplayInfo: { processingMessage: t('add_processing'), errorMessage: t('add_error'), successMessage: t('add_success') } });
      setAmountA(''); setAmountB('');
    } catch (err) { console.error(err); }
  };

  const aErr = !!(amountA && new BigNumber(amountA).shiftedBy(tokenA?.decimals ?? 18).isGreaterThan(balanceRawA));
  const bErr = !!(amountB && new BigNumber(amountB).shiftedBy(tokenB?.decimals ?? 18).isGreaterThan(balanceRawB));
  const poolHasLiquidity = !!(pool && new BigNumber(pool.reserveA).gt(0) && new BigNumber(pool.reserveB).gt(0));

  return (
    <div className='flex flex-col w-full gap-6'>
      <Card className='border-2 border-cyan-500/20'
        title={
          <div className='flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full'>
            <div className='flex items-center gap-3'>
              <button onClick={() => navigate(routes.liquidity)} className='p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0'>
                <ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-300' />
              </button>
              <span className='text-xl'>➕</span>
              <span className='text-lg font-black tracking-tight whitespace-nowrap'>{t('add_card_title')}</span>
            </div>
          </div>
        }
        description={t('add_card_desc')}
      >
        <div className='space-y-2 mt-4'>
          <div className='rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>{t('add_token1')}</p>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-semibold uppercase tracking-wider text-gray-500'>{t('balance')}: <span className='text-amber-500'>{balanceDisplayA}</span></span>
                {tokenA && balanceRawA !== '0' && (
                  <button onClick={() => handleAmountA(new BigNumber(balanceRawA).shiftedBy(-tokenA.decimals).toFixed(tokenA.decimals, BigNumber.ROUND_DOWN))} className='text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition'>MAX</button>
                )}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <TokenSelect value={tokenA} onChange={selectTokenA} tokens={hubTokens} exclude={tokenB?.identifier} loading={tokensLoading} />
              <input type='number' min='0' placeholder='0.0' value={amountA} onChange={e => handleAmountA(e.target.value)}
                className={`w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-white dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${aErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-[#444] focus:ring-amber-500'}`} />
            </div>
          </div>

          <div className='flex justify-center -my-3 relative z-10'>
            <div className='rounded-full p-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]'><Plus className='w-4 h-4 text-amber-500' /></div>
          </div>

          <div className='rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>{t('add_token2')}</p>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-semibold uppercase tracking-wider text-gray-500'>{t('balance')}: <span className='text-amber-500'>{balanceDisplayB}</span></span>
                {tokenB && balanceRawB !== '0' && (
                  <button onClick={() => handleAmountB(new BigNumber(balanceRawB).shiftedBy(-tokenB.decimals).toFixed(tokenB.decimals, BigNumber.ROUND_DOWN))} className='text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition'>MAX</button>
                )}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <TokenSelect value={tokenB} onChange={selectTokenB} tokens={tokenBChoices} exclude={tokenA?.identifier} loading={tokensLoading || (allWalletTokensRaw.length > 0 && walletTokens.length === 0)} />
              <input type='number' min='0' placeholder='0.0' value={amountB} onChange={e => handleAmountB(e.target.value)}
                className={`w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-white dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${bErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-[#444] focus:ring-amber-500'}`} />
            </div>
          </div>

          {poolLoading && <p className='text-center text-xs text-gray-500 mt-4 animate-pulse'>{t('add_pool_searching')}</p>}

          {!poolLoading && tokenA && tokenB && !pool && (
            <div className='rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4'>
              <p className='text-sm font-semibold text-amber-600 dark:text-amber-400'>{t('add_no_pool_title')}</p>
              <p className='text-xs text-amber-500 mt-1'>{t('add_no_pool_desc')}</p>
              <button onClick={() => navigate(`${routes.createPool}?tokenX=${tokenA?.identifier ?? ''}&tokenY=${tokenB?.identifier ?? ''}`)} className='mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition'>
                {t('add_no_pool_btn')}
              </button>
            </div>
          )}

          {pool && lpPreview !== null && (
            <div className='rounded-2xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] p-4 mt-4 space-y-2'>
              <div className='flex justify-between text-sm'><span className='text-gray-500'>{t('add_lp_preview')}</span><span className='font-bold text-amber-500'>{new BigNumber(lpPreview.toString()).shiftedBy(-18).toFixed(6)} LP</span></div>
              {refundA > 0n && <div className='flex justify-between text-xs'><span className='text-gray-500'>{t('add_refund', { ticker: tokenA?.ticker })}</span><span className='font-medium text-gray-700 dark:text-gray-300'>{new BigNumber(refundA.toString()).shiftedBy(-(tokenA?.decimals ?? 18)).toFixed(6)}</span></div>}
              {refundB > 0n && <div className='flex justify-between text-xs'><span className='text-gray-500'>{t('add_refund', { ticker: tokenB?.ticker })}</span><span className='font-medium text-gray-700 dark:text-gray-300'>{new BigNumber(refundB.toString()).shiftedBy(-(tokenB?.decimals ?? 18)).toFixed(6)}</span></div>}
              {lpPreview < 1000n && !poolHasLiquidity && <p className='text-xs text-red-500 mt-2'>{t('add_min_deposit')}</p>}
            </div>
          )}

          <button onClick={handleTx} disabled={!pool || !pool.isActive || aErr || bErr || !amountA || !amountB || (lpPreview !== null && lpPreview < 1000n && !poolHasLiquidity)}
            className='dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed'>
            {!address ? t('add_btn_connect') : !pool ? t('add_btn_no_pool') : !pool.isActive ? t('add_btn_inactive') : aErr || bErr ? t('add_btn_insufficient') : !amountA || !amountB ? t('add_btn_enter_amount') : (lpPreview !== null && lpPreview < 1000n && !poolHasLiquidity) ? t('add_btn_min') : t('add_btn_submit')}
          </button>
        </div>
      </Card>
    </div>
  );
};
