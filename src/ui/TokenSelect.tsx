import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSwapConfig } from '../context/SwapConfigContext';
import { getThemePalette } from './themePalette';

function useIsDark(ref: React.RefObject<HTMLElement | null>) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(!!ref.current?.closest('.dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: false });
    return () => observer.disconnect();
  }, [ref]);
  return isDark;
}

export interface TokenSelectToken {
  identifier: string;
  ticker: string;
  logoUrl?: string | null;
  priceUsd?: string | null;
}

/** Wallet holding info for a token, keyed by identifier and passed to TokenSelect for display/sorting. */
export interface TokenBalanceInfo {
  /** Human-readable balance (already divided by decimals). */
  amount: number;
  /** USD value of the holding, or null when the token has no known price. */
  usd: number | null;
}

function formatTokenPrice(priceUsd: string): string {
  const p = parseFloat(priceUsd);
  if (!p) return '';
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  if (p < 1000) return `$${p.toFixed(2)}`;
  return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatTokenAmount(amount: number): string {
  if (!amount) return '0';
  if (amount < 0.000001) return amount.toExponential(2);
  if (amount < 1) return amount.toFixed(6);
  if (amount < 1000) return amount.toFixed(4);
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatUsdValue(value: number): string {
  if (value < 0.01) return '<$0.01';
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

interface TokenSelectProps<T extends TokenSelectToken> {
  value: T | null;
  onChange: (t: T | null) => void;
  tokens: T[];
  exclude?: string;
  loading: boolean;
  className?: string;
  /**
   * Wallet balances keyed by token identifier. When provided, tokens are expected to
   * already be sorted wallet-holdings-first (largest USD value first), and the dropdown
   * shows the held amount / USD value instead of the unit price, grouped under
   * "in wallet" / "other tokens" headers.
   */
  balances?: Record<string, TokenBalanceInfo>;
}

function TokenLogo({ url, ticker }: { url?: string | null; ticker: string }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
        {ticker.slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={ticker}
      className="w-6 h-6 rounded-full object-contain shrink-0"
      onError={() => setError(true)}
    />
  );
}

export function TokenSelect<T extends TokenSelectToken>({
  value,
  onChange,
  tokens,
  exclude,
  loading,
  className = '',
  balances,
}: TokenSelectProps<T>) {
  const { t } = useTranslation('swap');
  const { theme } = useSwapConfig();
  const p = getThemePalette(theme);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const isDark = useIsDark(ref);
  const dropdownBg = p.dropdown.backgroundColor ?? (isDark ? '#2a2a2a' : '#ffffff');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = tokens
    .filter((t) => t.identifier !== exclude)
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.ticker.toLowerCase().includes(q) || t.identifier.toLowerCase().includes(q);
    });

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    setTimeout(() => searchRef.current?.focus(), 50);
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative flex-1 ${className}`}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        style={p.tokenBtn}
        className="w-full flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex-1 text-left text-gray-400">{t('token_loading')}</span>
        ) : value ? (
          <>
            <TokenLogo url={value.logoUrl} ticker={value.ticker} />
            <span className="flex-1 text-left">{value.ticker}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-400">{t('token_select')}</span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          style={{ backgroundColor: dropdownBg, ...p.dropdown, minWidth: '260px' }}
          className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-[#444] shadow-lg overflow-hidden"
        >
          <div className="px-2 pt-2 pb-1">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('token_search')}
              style={p.searchInput}
              className="w-full rounded-lg border border-gray-200 dark:border-[#555] bg-gray-50 dark:bg-[#1e1e1e] px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">{t('token_no_results')}</p>
            ) : (
              (() => {
                const hasHeldTokens = !!balances && filtered.some((tok) => balances[tok.identifier]);
                let walletHeaderShown = false;
                let otherHeaderShown = false;

                return filtered.map((tok) => {
                  const isSelected = value?.identifier === tok.identifier;
                  const itemStyle = isSelected
                    ? theme === 'mid' ? { backgroundColor: 'rgba(189,55,236,0.2)', color: '#BD37EC' } : {}
                    : theme === 'mid' ? { color: '#ffffff' } : {};
                  const bal = balances?.[tok.identifier];

                  let header: React.ReactNode = null;
                  if (hasHeldTokens && bal && !walletHeaderShown) {
                    walletHeaderShown = true;
                    header = (
                      <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {t('token_group_wallet')}
                      </p>
                    );
                  } else if (hasHeldTokens && !bal && !otherHeaderShown) {
                    otherHeaderShown = true;
                    header = (
                      <p className="px-3 pt-2.5 pb-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-t border-gray-100 dark:border-[#333]">
                        {t('token_group_other')}
                      </p>
                    );
                  }

                  return (
                    <React.Fragment key={tok.identifier}>
                      {header}
                      <button
                        type="button"
                        onClick={() => { onChange(tok); setOpen(false); }}
                        style={itemStyle}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 dark:hover:bg-[#333] ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-[#333]'
                            : ''
                        }`}
                      >
                        <TokenLogo url={tok.logoUrl} ticker={tok.ticker} />
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-sm font-bold truncate leading-tight ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                            {tok.ticker}
                          </p>
                          <p className="text-[10px] text-gray-400 font-normal leading-tight">{tok.identifier.split('-')[1] ?? ''}</p>
                        </div>
                        {bal ? (
                          <div className="text-right shrink-0 leading-tight">
                            <p className={`text-xs font-semibold ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'}`}>
                              {formatTokenAmount(bal.amount)}
                            </p>
                            {bal.usd != null && (
                              <p className="text-[10px] text-gray-400 font-normal">{formatUsdValue(bal.usd)}</p>
                            )}
                          </div>
                        ) : tok.priceUsd ? (
                          <span className="text-[11px] text-gray-400 font-medium shrink-0">{formatTokenPrice(tok.priceUsd)}</span>
                        ) : null}
                      </button>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
