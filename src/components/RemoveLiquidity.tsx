import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useWidgetNavigate } from '../hooks/useWidgetNavigate';
import { useWidgetSearchParams } from '../hooks/useWidgetSearchParams';
import { ArrowLeft, ArrowDown } from 'lucide-react';
import { useGetAccount } from '@multiversx/sdk-dapp/out/react/account/useGetAccount';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig';
import { Address, Transaction } from '@multiversx/sdk-core';
import { GAS_PRICE } from '@multiversx/sdk-dapp/out/constants/mvx.constants';
import { FormatAmount } from '../helpers/FormatAmount';
import { signAndSendTransactions } from '../helpers/signAndSendTransactions';
import { useGetUserESDT } from '../hooks/useGetUserEsdt';
import { Card } from '../ui/Card';
import bigToHex from '../helpers/bigToHex';
import { useSwapConfig } from '../context/SwapConfigContext';
import BigNumber from 'bignumber.js';

interface DexToken { identifier: string; ticker: string; decimals: number; }
interface PoolInfo { address: string; tokenA: string; tokenB: string; lpToken: string; reserveA: string; reserveB: string; lpSupply: string; isActive: boolean; }

const strToHex = (s: string) => Buffer.from(s, 'utf8').toString('hex');

export const RemoveLiquidity = () => {
  const { apiUrl, routes } = useSwapConfig();
  const { t } = useTranslation();
  const { address } = useGetAccount();
  const { network } = useGetNetworkConfig();
  const navigate = useWidgetNavigate();

  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [tokens, setTokens] = useState<Record<string, DexToken>>({});
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string>('');
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [lpTotalMinted, setLpTotalMinted] = useState<string | null>(null);
  const [lpAmountInput, setLpAmountInput] = useState('');
  const [searchParams] = useWidgetSearchParams();

  useEffect(() => {
    if (!apiUrl) return;
    axios.get(`${apiUrl}/tokens`).then((res) => {
      const tokenMap: Record<string, DexToken> = {};
      for (const t of (res.data.tokens || [])) {
        tokenMap[t.identifier] = { identifier: t.identifier, ticker: t.ticker || t.identifier.split('-')[0], decimals: t.decimals ?? 18 };
      }
      setTokens(tokenMap);
    }).catch(console.error);
  }, [apiUrl]);

  useEffect(() => {
    if (!apiUrl) return;
    setPoolsLoading(true);
    axios.get(`${apiUrl}/pools`).then((res) => {
      const activePools = (res.data.pools || []).filter((p: PoolInfo) => p.isActive);
      setPools(activePools);
      const qPool = searchParams.get('pool');
      if (qPool && activePools.some((p: PoolInfo) => p.address === qPool)) setSelectedPoolAddress(qPool);
    }).catch(console.error).finally(() => setPoolsLoading(false));
  }, [apiUrl, searchParams]);

  const selectedPool = pools.find(p => p.address === selectedPoolAddress);

  useEffect(() => {
    if (!selectedPool?.lpToken || !network?.apiAddress) { setLpTotalMinted(null); return; }
    axios.get(`/tokens/${selectedPool.lpToken}`, { baseURL: network.apiAddress })
      .then(res => setLpTotalMinted(res.data?.minted ?? null))
      .catch(() => setLpTotalMinted(null));
  }, [selectedPool?.lpToken, network?.apiAddress]);

  const lpTokenBalances = useGetUserESDT(selectedPool?.lpToken ?? undefined, { enabled: !!selectedPool && !!address });
  const lpBalanceRaw = lpTokenBalances?.[0]?.balance ?? '0';
  const lpBalanceDisplay = new BigNumber(lpBalanceRaw).shiftedBy(-18).toFixed(6, BigNumber.ROUND_DOWN);

  const handleMax = () => {
    if (!lpBalanceRaw || lpBalanceRaw === '0') return;
    setLpAmountInput(new BigNumber(lpBalanceRaw).shiftedBy(-18).toFixed(18, BigNumber.ROUND_DOWN).replace(/\.?0+$/, ''));
  };

  const trueMinted = lpTotalMinted ?? selectedPool?.lpSupply ?? '0';
  const safeLpSupply = new BigNumber(trueMinted).isZero() ? new BigNumber(1) : new BigNumber(trueMinted);

  const outA = selectedPool && lpAmountInput ? BigInt(new BigNumber(lpAmountInput).shiftedBy(18).multipliedBy(selectedPool.reserveA).dividedBy(safeLpSupply).toFixed(0, BigNumber.ROUND_DOWN)) : 0n;
  const outB = selectedPool && lpAmountInput ? BigInt(new BigNumber(lpAmountInput).shiftedBy(18).multipliedBy(selectedPool.reserveB).dividedBy(safeLpSupply).toFixed(0, BigNumber.ROUND_DOWN)) : 0n;

  const handleTx = async () => {
    if (!selectedPool || !address || !lpAmountInput) return;
    try {
      const lpAmt = BigInt(new BigNumber(lpAmountInput).shiftedBy(18).toFixed(0));
      const txDataParts = ['ESDTTransfer', strToHex(selectedPool.lpToken), bigToHex(lpAmt), strToHex('removeLiquidity'), bigToHex(0n), bigToHex(0n)];
      const transaction = new Transaction({
        value: 0n, data: new TextEncoder().encode(txDataParts.join('@')),
        receiver: new Address(selectedPool.address), sender: new Address(address),
        gasLimit: 12_000_000n, gasPrice: BigInt(GAS_PRICE), chainID: network.chainId, version: 1,
      });
      await signAndSendTransactions({ transactions: [transaction], transactionsDisplayInfo: { processingMessage: 'Retrait en cours...', errorMessage: 'Le retrait a échoué', successMessage: 'Liquidité retirée !' } });
      setLpAmountInput('');
    } catch (err) { console.error(err); }
  };

  const lpErr = !!(lpAmountInput && new BigNumber(lpAmountInput).shiftedBy(18).isGreaterThan(lpBalanceRaw));

  return (
    <div className='flex flex-col w-full gap-6'>
      <Card
        className='border-2 border-cyan-500/20'
        title={
          <div className='flex items-center gap-3 w-full'>
            <button onClick={() => navigate(routes.liquidity)} className='p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0'>
              <ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-300' />
            </button>
            <span className='text-xl'>🔓</span>
            <span className='text-lg font-black tracking-tight'>Retirer Liquidité</span>
          </div>
        }
        description="Retirez vos LP tokens pour récupérer vos actifs"
      >
        <div className='space-y-4 mt-4'>
          <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Sélectionner une Pool</p>
            <select className="w-full rounded-xl border border-gray-200 dark:border-[#444] bg-white dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={selectedPoolAddress} onChange={e => setSelectedPoolAddress(e.target.value)} disabled={poolsLoading}>
              <option value="">{poolsLoading ? 'Chargement...' : 'Choisir une pool'}</option>
              {pools.map(p => (
                <option key={p.address} value={p.address}>{tokens[p.tokenA]?.ticker || p.tokenA} - {tokens[p.tokenB]?.ticker || p.tokenB}</option>
              ))}
            </select>
          </div>

          {selectedPool && (
            <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant LP à retirer</p>
                <button onClick={handleMax} className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 flex items-center gap-1">
                  MAX (<FormatAmount amount={new BigNumber(lpBalanceRaw.toString()).toFixed(0, BigNumber.ROUND_DOWN)} identifier={selectedPool.lpToken} />)
                </button>
              </div>
              <input type="number" min="0" placeholder="0.0" value={lpAmountInput} onChange={e => setLpAmountInput(e.target.value)}
                className={`w-full rounded-xl border bg-white dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${lpErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-[#444] focus:ring-amber-500'}`} />
              {lpErr && <p className="mt-1 text-xs text-red-500">Solde LP insuffisant</p>}
            </div>
          )}

          {selectedPool && lpAmountInput && outA > 0n && outB > 0n && !lpErr && (
            <>
              <div className="flex justify-center -my-2 relative z-10">
                <div className="rounded-full p-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]">
                  <ArrowDown className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1a1a1a] p-4 space-y-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">Vous recevrez (estimation)</p>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  <FormatAmount amount={new BigNumber(outA.toString()).toFixed(0, BigNumber.ROUND_DOWN)} identifier={selectedPool.tokenA} />
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  <FormatAmount amount={new BigNumber(outB.toString()).toFixed(0, BigNumber.ROUND_DOWN)} identifier={selectedPool.tokenB} />
                </div>
              </div>
            </>
          )}

          <button onClick={handleTx} disabled={!selectedPool || !address || !lpAmountInput || lpErr}
            className="dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed">
            {!address ? 'Connectez votre wallet' : !selectedPool ? 'Sélectionnez une pool' : !lpAmountInput ? 'Renseignez un montant' : lpErr ? 'Solde insuffisant' : 'Retirer Liquidité'}
          </button>
        </div>
      </Card>
    </div>
  );
};
