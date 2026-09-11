import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSwapConfig } from '../context/SwapConfigContext';
import { getThemePalette } from './themePalette';
import { getNearestThemeAncestor } from '../helpers/domTheme';

function useIsDark(ref: React.RefObject<HTMLElement | null>) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(getNearestThemeAncestor(ref.current) === 'dark');
    check();
    // subtree: true — a host may toggle .dark/.light somewhere below <html>,
    // not just on document.documentElement itself.
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
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

export function TokenLogo({ url, ticker }: { url?: string | null; ticker: string }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <span className="dvx:w-6 dvx:h-6 dvx:rounded-full dvx:bg-amber-100 dvx:dark:bg-amber-900 dvx:flex dvx:items-center dvx:justify-center dvx:text-[10px] dvx:font-bold dvx:text-amber-700 dvx:dark:text-amber-300 dvx:shrink-0">
        {ticker.slice(0, 2)}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={ticker}
      className="dvx:w-6 dvx:h-6 dvx:rounded-full dvx:object-contain dvx:shrink-0"
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
    <div ref={ref} className={`dvx:relative dvx:flex-1 ${className}`}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        style={p.tokenBtn}
        className="dvx:w-full dvx:flex dvx:items-center dvx:gap-2 dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-sm dvx:font-medium dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500 dvx:disabled:opacity-50"
      >
        {loading ? (
          <span className="dvx:flex-1 dvx:text-left dvx:text-gray-400">{t('token_loading')}</span>
        ) : value ? (
          <>
            <TokenLogo url={value.logoUrl} ticker={value.ticker} />
            <span className="dvx:flex-1 dvx:text-left">{value.ticker}</span>
          </>
        ) : (
          <span className="dvx:flex-1 dvx:text-left dvx:text-gray-400">{t('token_select')}</span>
        )}
        <svg
          className={`dvx:w-4 dvx:h-4 dvx:text-gray-400 dvx:transition-transform dvx:shrink-0 ${open ? 'dvx:rotate-180' : ''}`}
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
          className="dvx:absolute dvx:z-50 dvx:mt-1 dvx:w-full dvx:rounded-xl dvx:border dvx:border-gray-200 dvx:dark:border-[#444] dvx:shadow-lg dvx:overflow-hidden"
        >
          <div className="dvx:px-2 dvx:pt-2 dvx:pb-1">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('token_search')}
              style={p.searchInput}
              className="dvx:w-full dvx:rounded-lg dvx:border dvx:border-gray-200 dvx:dark:border-[#555] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:px-3 dvx:py-1.5 dvx:text-sm dvx:text-gray-900 dvx:dark:text-white dvx:placeholder-gray-400 dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500"
            />
          </div>
          <div className="dvx:max-h-64 dvx:overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="dvx:px-3 dvx:py-3 dvx:text-sm dvx:text-gray-400 dvx:text-center">{t('token_no_results')}</p>
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
                      <p className="dvx:px-3 dvx:pt-2.5 dvx:pb-1 dvx:text-[10px] dvx:font-bold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                        {t('token_group_wallet')}
                      </p>
                    );
                  } else if (hasHeldTokens && !bal && !otherHeaderShown) {
                    otherHeaderShown = true;
                    header = (
                      <p className="dvx:px-3 dvx:pt-2.5 dvx:pb-1 dvx:mt-1 dvx:text-[10px] dvx:font-bold dvx:uppercase dvx:tracking-wider dvx:text-gray-400 dvx:border-t dvx:border-gray-100 dvx:dark:border-[#333]">
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
                        className={`dvx:w-full dvx:min-h-[52px] dvx:flex dvx:items-center dvx:gap-2.5 dvx:px-3 dvx:py-2 dvx:bg-transparent dvx:hover:bg-amber-50 dvx:dark:hover:bg-[#333] ${
                          isSelected
                            ? 'dvx:bg-amber-50 dvx:dark:bg-[#333]'
                            : ''
                        }`}
                      >
                        <TokenLogo url={tok.logoUrl} ticker={tok.ticker} />
                        <div className="dvx:flex-1 dvx:min-w-0 dvx:text-left">
                          <p className={`dvx:text-sm dvx:font-bold dvx:truncate dvx:leading-tight ${isSelected ? 'dvx:text-amber-600 dvx:dark:text-amber-400' : 'dvx:text-gray-900 dvx:dark:text-white'}`}>
                            {tok.ticker}
                          </p>
                          <p className="dvx:text-[10px] dvx:text-gray-400 dvx:font-normal dvx:leading-tight">{tok.identifier.split('-')[1] ?? ''}</p>
                        </div>
                        {bal ? (
                          <div className="dvx:text-right dvx:shrink-0 dvx:leading-tight">
                            <p className={`dvx:text-xs dvx:font-semibold ${isSelected ? 'dvx:text-amber-600 dvx:dark:text-amber-400' : 'dvx:text-gray-700 dvx:dark:text-gray-200'}`}>
                              {formatTokenAmount(bal.amount)}
                            </p>
                            {bal.usd != null && (
                              <p className="dvx:text-[10px] dvx:text-gray-400 dvx:font-normal">{formatUsdValue(bal.usd)}</p>
                            )}
                          </div>
                        ) : tok.priceUsd ? (
                          <span className="dvx:text-[11px] dvx:text-gray-400 dvx:font-medium dvx:shrink-0">{formatTokenPrice(tok.priceUsd)}</span>
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
