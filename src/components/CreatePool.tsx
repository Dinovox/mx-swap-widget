import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useLoadTranslations from '../hooks/useLoadTranslations';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig';
import { Address, Transaction } from '@multiversx/sdk-core';
import { GAS_PRICE } from '@multiversx/sdk-dapp/out/constants/mvx.constants';
import { signAndSendTransactions } from '../helpers/signAndSendTransactions';
import { useGetUserESDT } from '../hooks/useGetUserEsdt';
import { TokenSelect } from '../ui/TokenSelect';
import { useSwapConfig } from '../context/SwapConfigContext';

interface DexToken { identifier: string; ticker: string; decimals: number; logoUrl?: string | null; }
interface PoolInfo { address: string; tokenA: string; tokenB: string; isActive: boolean; }

const strToHex = (s: string) => Buffer.from(s, 'utf8').toString('hex');

export const CreatePool = () => {
  const { apiUrl, factoryAddress, routes } = useSwapConfig();
  const { t } = useTranslation('swap');
  useLoadTranslations('swap');
  const { address } = useGetAccount();
  const { network } = useGetNetworkConfig();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [hubTokens, setHubTokens] = useState<DexToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [lpTokenSet, setLpTokenSet] = useState<Set<string>>(new Set());
  const [tokenX, setTokenX] = useState<DexToken | null>(null);
  const [tokenY, setTokenY] = useState<DexToken | null>(null);

  const selectTokenX = (t: DexToken | null) => { setTokenX(t); setSearchParams(prev => { const p = new URLSearchParams(prev); t ? p.set('tokenX', t.identifier) : p.delete('tokenX'); return p; }, { replace: true }); };
  const selectTokenY = (t: DexToken | null) => { setTokenY(t); setSearchParams(prev => { const p = new URLSearchParams(prev); t ? p.set('tokenY', t.identifier) : p.delete('tokenY'); return p; }, { replace: true }); };

  const [lpName, setLpName] = useState('');
  const [lpTicker, setLpTicker] = useState('');
  const [existingPool, setExistingPool] = useState<PoolInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const allWalletTokensRaw = useGetUserESDT(undefined, { enabled: !!address });
  const [walletTokens, setWalletTokens] = useState<DexToken[]>([]);

  useEffect(() => {
    if (!allWalletTokensRaw || allWalletTokensRaw.length === 0) { setWalletTokens([]); return; }
    setWalletTokens(allWalletTokensRaw.filter((t: any) => !lpTokenSet.has(t.identifier)).map((t: any) => ({ identifier: t.identifier, ticker: t.ticker || t.identifier.split('-')[0], decimals: t.decimals ?? 18, logoUrl: t.assets?.svgUrl ?? t.assets?.pngUrl ?? null })));
  }, [allWalletTokensRaw, lpTokenSet]);

  useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);
    Promise.all([
      axios.get(`${apiUrl}/tokens/hub`).catch(() => ({ data: [] })),
      axios.get(`${apiUrl}/pools`).catch(() => ({ data: { pools: [] } })),
    ]).then(([hubRes, poolsRes]) => {
      setHubTokens((hubRes.data?.hubTokens || []).map((h: any) => ({ identifier: h.identifier, ticker: h.ticker || h.identifier.split('-')[0], decimals: h.decimals ?? 18, logoUrl: h.logoUrl ?? null })));
      setLpTokenSet(new Set((poolsRes.data.pools || []).map((p: any) => p.lpToken).filter(Boolean)));
    }).catch(console.error).finally(() => setTokensLoading(false));
  }, [apiUrl]);

  useEffect(() => {
    if (tokensLoading) return;
    const qX = searchParams.get('tokenX'); const qY = searchParams.get('tokenY');
    if (qX && !tokenX) { const f = hubTokens.find(t => t.identifier === qX); if (f) setTokenX(f); }
    if (qY && !tokenY) { const f = walletTokens.find(t => t.identifier === qY); if (f) setTokenY(f); }
  }, [tokensLoading, hubTokens, walletTokens]); // eslint-disable-line

  useEffect(() => {
    if (!tokenX || !tokenY) return;
    const clean = (s: string) => s.split('-')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tX = clean(tokenX.ticker); const tY = clean(tokenY.ticker);
    const splitBudget = (a: string, b: string, budget: number): [string, string] => a.length + b.length <= budget ? [a, b] : [a.slice(0, budget - Math.floor(budget / 2)), b.slice(0, Math.floor(budget / 2))];
    const [nX, nY] = splitBudget(tX, tY, 18); setLpName(nX + nY + 'LP');
    const [tkX, tkY] = splitBudget(tX, tY, 10); setLpTicker(tkX + tkY);
  }, [tokenX, tokenY]);

  const pollPools = async () => {
    if (!tokenX || !tokenY) return;
    try {
      const res = await axios.get(`${apiUrl}/pools/pair`, { params: { tokenA: tokenX.identifier, tokenB: tokenY.identifier } });
      setExistingPool(res.data?.address ? res.data : null);
    } catch (e: any) { if (e?.response?.status !== 404) console.error(e); setExistingPool(null); }
  };

  useEffect(() => { pollPools(); const i = setInterval(pollPools, 5000); return () => clearInterval(i); }, [tokenX, tokenY]); // eslint-disable-line

  const [fastPolling, setFastPolling] = React.useState(false);
  useEffect(() => {
    if (!fastPolling) return;
    const i = setInterval(async () => { await pollPools(); setExistingPool(prev => { if (prev) setFastPolling(false); return prev; }); }, 2000);
    return () => clearInterval(i);
  }, [fastPolling, tokenX, tokenY]); // eslint-disable-line

  const isValidName = lpName.length >= 3 && lpName.length <= 20 && /^[a-zA-Z0-9]+$/.test(lpName);
  const isValidTicker = lpTicker.length >= 3 && lpTicker.length <= 10 && /^[A-Z0-9]+$/.test(lpTicker);
  const canCreate = !!address && !!tokenX && !!tokenY && tokenX.identifier !== tokenY.identifier && isValidName && isValidTicker && !existingPool;
  const canIssue = !!address && !!existingPool && !existingPool.isActive;
  const disabled = isCreating || isIssuing;

  const handleCreatePair = async () => {
    if (!canCreate || !tokenX || !tokenY) return;
    setIsCreating(true);
    try {
      const txDataParts = ['createPair', strToHex(tokenX.identifier), strToHex(tokenY.identifier), strToHex(lpName), strToHex(lpTicker)];
      const transaction = new Transaction({ value: 0n, data: new TextEncoder().encode(txDataParts.join('@')), receiver: new Address(factoryAddress), sender: new Address(address), gasLimit: 300_000_000n, gasPrice: BigInt(GAS_PRICE), chainID: network.chainId, version: 1 });
      await signAndSendTransactions({ transactions: [transaction], transactionsDisplayInfo: { processingMessage: t('create_processing_pair'), errorMessage: t('create_error_pair'), successMessage: t('create_success_pair') } });
      setFastPolling(true);
    } catch (err) { console.error(err); } finally { setIsCreating(false); }
  };

  const handleIssueLp = async () => {
    if (!canIssue || !tokenX || !tokenY) return;
    setIsIssuing(true);
    try {
      const txDataParts = ['issueLpToken', strToHex(tokenX.identifier), strToHex(tokenY.identifier)];
      const transaction = new Transaction({ value: 50_000_000_000_000_000n, data: new TextEncoder().encode(txDataParts.join('@')), receiver: new Address(factoryAddress), sender: new Address(address), gasLimit: 150_000_000n, gasPrice: BigInt(GAS_PRICE), chainID: network.chainId, version: 1 });
      await signAndSendTransactions({ transactions: [transaction], transactionsDisplayInfo: { processingMessage: t('create_processing_lp'), errorMessage: t('create_error_lp'), successMessage: t('create_success_lp') } });
    } catch (err) { console.error(err); } finally { setIsIssuing(false); }
  };

  return (
    <div className='mx-auto max-w-lg px-4 py-8'>
      <div className='flex items-center gap-3 mb-6'>
        <button onClick={() => navigate(routes.liquidity)} className='p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition'>
          <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-300' />
        </button>
        <div>
          <h1 className='text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white'>{t('create_title')}</h1>
          <p className='text-xs text-gray-500 dark:text-gray-400'>{t('create_subtitle')}</p>
        </div>
      </div>

      <div className='space-y-4'>
        <div className='rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4 space-y-4'>
          <div>
            <label className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block'>{t('create_token1')}</label>
            <TokenSelect value={tokenX} onChange={disabled ? () => {} : selectTokenX} tokens={hubTokens} exclude={tokenY?.identifier} loading={tokensLoading} />
          </div>
          <div>
            <label className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block'>{t('create_token2')}</label>
            <TokenSelect value={tokenY} onChange={disabled ? () => {} : selectTokenY} tokens={walletTokens} exclude={tokenX?.identifier} loading={tokensLoading || (allWalletTokensRaw.length > 0 && walletTokens.length === 0)} />
          </div>
          <div>
            <label className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block'>{t('create_lp_name')}</label>
            <input type='text' value={lpName} onChange={e => setLpName(e.target.value)} disabled={disabled || !!existingPool}
              className={`w-full rounded-xl border bg-white dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!isValidName && lpName.length > 0 ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-[#444] focus:ring-amber-500'}`} />
          </div>
          <div>
            <label className='text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block'>{t('create_lp_ticker')}</label>
            <input type='text' value={lpTicker} onChange={e => setLpTicker(e.target.value.toUpperCase())} disabled={disabled || !!existingPool}
              className={`w-full rounded-xl border bg-white dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!isValidTicker && lpTicker.length > 0 ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-[#444] focus:ring-amber-500'}`} />
          </div>
        </div>

        {!existingPool ? (
          <>
            <button onClick={handleCreatePair} disabled={!canCreate || isCreating} className='dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed'>
              {isCreating ? t('create_tx_pending') : t('create_step1')}
            </button>
            {isCreating && <p className='text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse'>{t('create_tx_waiting')}</p>}
          </>
        ) : !existingPool.isActive ? (
          <div className='rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4 text-center'>
            <p className='text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3'>{t('create_pair_done')}</p>
            <p className='text-xs text-amber-600/80 dark:text-amber-400/80 mb-4 text-left'>{t('create_pair_desc')}</p>
            <button onClick={handleIssueLp} className='w-full px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition shadow-sm'>
              {isIssuing ? t('create_tx_pending') : t('create_step2')}
            </button>
            {isIssuing && <p className='text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse'>{t('create_tx_waiting')}</p>}
          </div>
        ) : (
          <div className='rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 mt-4 text-center'>
            <CheckCircle className='w-12 h-12 text-green-500 mx-auto mb-3' />
            <p className='text-base font-bold text-green-700 dark:text-green-400 mb-2'>{t('create_pool_active')}</p>
            <p className='text-sm text-green-600/80 dark:text-green-400/80 mb-4'>{t('create_pool_ready')}</p>
            <button onClick={() => navigate(`${routes.addLiquidity}?tokenA=${tokenX?.identifier}&tokenB=${tokenY?.identifier}`)} className='w-full px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm'>
              {t('create_add_liquidity')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
