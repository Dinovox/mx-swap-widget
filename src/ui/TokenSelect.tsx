import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSwapConfig } from '../context/SwapConfigContext';
import { getThemePalette } from './themePalette';

export interface TokenSelectToken {
  identifier: string;
  ticker: string;
  logoUrl?: string | null;
}

interface TokenSelectProps<T extends TokenSelectToken> {
  value: T | null;
  onChange: (t: T | null) => void;
  tokens: T[];
  exclude?: string;
  loading: boolean;
  className?: string;
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
}: TokenSelectProps<T>) {
  const { t } = useTranslation('swap');
  const { theme } = useSwapConfig();
  const p = getThemePalette(theme);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
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
          style={{ backgroundColor: '#ffffff', ...p.dropdown }}
          className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-[#444] dark:bg-[#2a2a2a] shadow-lg overflow-hidden"
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
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">{t('token_no_results')}</p>
            ) : (
              filtered.map((t) => {
                const isSelected = value?.identifier === t.identifier;
                const itemStyle = isSelected
                  ? theme === 'mid' ? { backgroundColor: 'rgba(189,55,236,0.2)', color: '#BD37EC' } : {}
                  : theme === 'mid' ? { color: '#ffffff' } : {};
                return (
                  <button
                    key={t.identifier}
                    type="button"
                    onClick={() => { onChange(t); setOpen(false); }}
                    style={itemStyle}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-amber-50 dark:hover:bg-[#333] ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-[#333] text-amber-600 dark:text-amber-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <TokenLogo url={t.logoUrl} ticker={t.ticker} />
                    <span className="flex-1 text-left">{t.ticker}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{t.identifier.split('-')[1] ?? ''}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
