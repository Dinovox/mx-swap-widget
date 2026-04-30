import { useState, useEffect } from 'react';
import axios from 'axios';
import { useGoTo } from '../context/SwapViewContext';
import { useWidgetSearchParams } from '../hooks/useWidgetSearchParams';
import { ArrowLeft, ArrowDown } from 'lucide-react';
import { Address, Transaction } from '@multiversx/sdk-core';
import { GAS_PRICE } from '@multiversx/sdk-dapp/out/constants/mvx.constants';
import { signAndSendTransactions } from '../helpers/signAndSendTransactions';
import { useGetUserESDT } from '../hooks/useGetUserEsdt';
import { Card } from '../ui/Card';
import bigToHex from '../helpers/bigToHex';
import strToHex from '../helpers/strToHex';
import { useSwapConfig } from '../context/SwapConfigContext';
import BigNumber from 'bignumber.js';
import type { DexToken, LiquidityPool } from '../types';

function formatUsd(priceUsd: string, amount: string): string | null {
  const value = parseFloat(priceUsd) * parseFloat(amount);
  if (!value) return null;
  if (value < 0.01) return '<$0.01';
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const PRESETS = [25, 50, 75, 100];

export const RemoveLiquidity = () => {
  const { apiUrl, onConnect, address, networkApiAddress, chainId, onSignTransactions } = useSwapConfig();
  const goTo = useGoTo();
  const [searchParams] = useWidgetSearchParams();

  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [tokens, setTokens] = useState<Record<string, DexToken>>({});
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string>('');
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [lpTotalMinted, setLpTotalMinted] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    if (!apiUrl) return;
    axios.get(`${apiUrl}/tokens`).then((res) => {
      const tokenMap: Record<string, DexToken> = {};
      for (const t of (res.data.tokens || [])) {
        tokenMap[t.identifier] = { identifier: t.identifier, ticker: t.ticker || t.identifier.split('-')[0], decimals: t.decimals ?? 18, priceUsd: t.priceUsd ?? null };
      }
      setTokens(tokenMap);
    }).catch(console.error);
  }, [apiUrl]);

  useEffect(() => {
    if (!apiUrl) return;
    setPoolsLoading(true);
    axios.get(`${apiUrl}/pools`).then((res) => {
      const activePools = (res.data.pools || []).filter((p: LiquidityPool) => p.isActive);
      setPools(activePools);
      const qPool = searchParams.get('pool');
      if (qPool && activePools.some((p: LiquidityPool) => p.address === qPool)) setSelectedPoolAddress(qPool);
    }).catch(console.error).finally(() => setPoolsLoading(false));
  }, [apiUrl, searchParams]);

  const selectedPool = pools.find(p => p.address === selectedPoolAddress);

  useEffect(() => {
    if (!selectedPool?.lpToken || !networkApiAddress) { setLpTotalMinted(null); return; }
    axios.get(`/tokens/${selectedPool.lpToken}`, { baseURL: networkApiAddress })
      .then(res => setLpTotalMinted(res.data?.minted ?? null))
      .catch(() => setLpTotalMinted(null));
  }, [selectedPool?.lpToken, networkApiAddress]);

  // Reset percentage when pool changes
  useEffect(() => { setPercentage(0); }, [selectedPoolAddress]);

  const lpTokenBalances = useGetUserESDT(selectedPool?.lpToken ?? undefined, { enabled: !!selectedPool && !!address, address, networkApiAddress });
  const lpBalanceRaw = lpTokenBalances?.[0]?.balance ?? '0';

  const trueMinted = lpTotalMinted ?? selectedPool?.lpSupply ?? '0';
  const safeLpSupply = new BigNumber(trueMinted).isZero() ? new BigNumber(1) : new BigNumber(trueMinted);

  // LP amount derived from percentage
  const lpAmountRaw = new BigNumber(lpBalanceRaw).multipliedBy(percentage).dividedBy(100).toFixed(0, BigNumber.ROUND_DOWN);
  const lpAmountDisplay = new BigNumber(lpAmountRaw).shiftedBy(-18).toFixed(6, BigNumber.ROUND_DOWN);
  const lpBalanceDisplay = new BigNumber(lpBalanceRaw).shiftedBy(-18).toFixed(6, BigNumber.ROUND_DOWN);

  const decimalsA = tokens[selectedPool?.tokenA ?? '']?.decimals ?? 18;
  const decimalsB = tokens[selectedPool?.tokenB ?? '']?.decimals ?? 18;

  const outA = selectedPool && percentage > 0
    ? new BigNumber(lpAmountRaw).multipliedBy(selectedPool.reserveA).dividedBy(safeLpSupply).toFixed(0, BigNumber.ROUND_DOWN)
    : '0';
  const outB = selectedPool && percentage > 0
    ? new BigNumber(lpAmountRaw).multipliedBy(selectedPool.reserveB).dividedBy(safeLpSupply).toFixed(0, BigNumber.ROUND_DOWN)
    : '0';

  const outADisplay = new BigNumber(outA).shiftedBy(-decimalsA).toFixed(6, BigNumber.ROUND_DOWN);
  const outBDisplay = new BigNumber(outB).shiftedBy(-decimalsB).toFixed(6, BigNumber.ROUND_DOWN);

  const tickerA = tokens[selectedPool?.tokenA ?? '']?.ticker ?? selectedPool?.tokenA?.split('-')[0] ?? '';
  const tickerB = tokens[selectedPool?.tokenB ?? '']?.ticker ?? selectedPool?.tokenB?.split('-')[0] ?? '';
  const priceA = tokens[selectedPool?.tokenA ?? '']?.priceUsd;
  const priceB = tokens[selectedPool?.tokenB ?? '']?.priceUsd;
  const outAUsd = priceA && new BigNumber(outA).gt(0) ? formatUsd(priceA, outADisplay) : null;
  const outBUsd = priceB && new BigNumber(outB).gt(0) ? formatUsd(priceB, outBDisplay) : null;

  const handleTx = async () => {
    if (!selectedPool || !address || percentage <= 0) return;
    try {
      const lpAmt = BigInt(lpAmountRaw);
      const txDataParts = ['ESDTTransfer', strToHex(selectedPool.lpToken), bigToHex(lpAmt), strToHex('removeLiquidity'), bigToHex(0n), bigToHex(0n)];
      const transaction = new Transaction({
        value: 0n, data: new TextEncoder().encode(txDataParts.join('@')),
        receiver: new Address(selectedPool.address), sender: new Address(address),
        gasLimit: 12_000_000n, gasPrice: BigInt(GAS_PRICE), chainID: chainId!, version: 1,
      });
      await signAndSendTransactions({ onSignTransactions, transactions: [transaction], transactionsDisplayInfo: { processingMessage: 'Retrait en cours...', errorMessage: 'Le retrait a échoué', successMessage: 'Liquidité retirée !' } });
      setPercentage(0);
    } catch (err) { console.error(err); }
  };

  const canSubmit = !!selectedPool && percentage > 0 && new BigNumber(lpBalanceRaw).gt(0);

  return (
    <div className='flex flex-col w-full gap-6'>
      <Card
        className='border-2 border-cyan-500/20'
        title={
          <div className='flex items-center gap-3 w-full'>
            <button onClick={() => goTo('liquidity')} className='p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0'>
              <ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-300' />
            </button>
            <span className='text-xl'>🔓</span>
            <span className='text-lg font-black tracking-tight'>Retirer Liquidité</span>
          </div>
        }
        description="Retirez vos LP tokens pour récupérer vos actifs"
      >
        <div className='space-y-4 mt-4'>
          {/* Pool selector */}
          <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Sélectionner une Pool</p>
            <select className="w-full rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={selectedPoolAddress} onChange={e => setSelectedPoolAddress(e.target.value)} disabled={poolsLoading}>
              <option value="">{poolsLoading ? 'Chargement...' : 'Choisir une pool'}</option>
              {pools.map(p => (
                <option key={p.address} value={p.address}>{tokens[p.tokenA]?.ticker || p.tokenA} - {tokens[p.tokenB]?.ticker || p.tokenB}</option>
              ))}
            </select>
          </div>

          {/* Percentage slider */}
          {selectedPool && (
            <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant à retirer</p>
                <span className="text-[10px] text-gray-400">Balance : <span className="text-amber-500">{lpBalanceDisplay} LP</span></span>
              </div>

              {/* Big percentage display */}
              <div className="text-center">
                <span className="text-4xl font-black text-gray-900 dark:text-white">{percentage}</span>
                <span className="text-2xl font-black text-gray-400 ml-1">%</span>
                {percentage > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">{lpAmountDisplay} LP</p>
                )}
              </div>

              {/* Slider */}
              <input
                type="range" min={0} max={100} step={1} value={percentage}
                onChange={e => setPercentage(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-gray-200 dark:bg-[#333]"
              />

              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map(p => (
                  <button key={p} onClick={() => setPercentage(p)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      percentage === p
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                    }`}>
                    {p === 100 ? 'MAX' : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estimated receive */}
          {selectedPool && percentage > 0 && new BigNumber(outA).gt(0) && (
            <>
              <div className="flex justify-center -my-2 relative z-10">
                <div className="rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]">
                  <ArrowDown className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">Vous recevrez (estimation)</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{outADisplay} <span className="text-gray-400 font-medium">{tickerA}</span></p>
                    {outAUsd && <p className="text-[10px] text-gray-400 mt-0.5">≈ {outAUsd}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{outBDisplay} <span className="text-gray-400 font-medium">{tickerB}</span></p>
                    {outBUsd && <p className="text-[10px] text-gray-400 mt-0.5">≈ {outBUsd}</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          <button onClick={!address ? onConnect : handleTx}
            disabled={!address ? !onConnect : !canSubmit}
            className="dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed">
            {!address ? 'Connectez votre wallet' : !selectedPool ? 'Sélectionnez une pool' : percentage === 0 ? 'Sélectionnez un montant' : 'Retirer Liquidité'}
          </button>
        </div>
      </Card>
    </div>
  );
};
