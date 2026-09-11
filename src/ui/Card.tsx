import React from 'react';
import type { PropsWithChildren } from 'react';
import { Info } from 'lucide-react';
import { useSwapConfig } from '../context/SwapConfigContext';
import { getThemePalette } from './themePalette';

interface CardProps extends PropsWithChildren {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  reference?: string;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ id, title, children, description, reference, className = '', onClick }: CardProps) => {
  const { theme } = useSwapConfig();
  const p = getThemePalette(theme);

  const borderClass = className.includes('border') ? '' : 'dvx:border dvx:border-gray-100 dvx:dark:border-[#333]';

  return (
    <div
      id={id}
      onClick={onClick}
      style={p.card}
      className={`dvx:flex dvx:flex-col dvx:bg-[#ffffff] dvx:dark:bg-[#111] dvx:p-6 dvx:rounded-2xl dvx:shadow-sm dvx:transition-all ${borderClass} ${className}`}
    >
      <div className='dvx:flex dvx:items-start dvx:justify-between dvx:gap-3'>
        <h2 className='dvx:text-xl dvx:font-black dvx:tracking-tight dvx:text-gray-900 dvx:dark:text-white dvx:uppercase'
          style={theme ? { color: p.card.color } : {}}>
          {title}
        </h2>
        {reference ? (
          <a href={reference} target='_blank' rel='noreferrer'
            className='dvx:inline-flex dvx:items-center dvx:rounded-md dvx:px-2 dvx:py-1 dvx:text-xs dvx:font-medium dvx:text-slate-600 dvx:dark:text-slate-400 dvx:bg-transparent dvx:hover:text-slate-800 dvx:dark:hover:text-slate-200 dvx:hover:bg-slate-100/80 dvx:dark:hover:bg-white/10 dvx:transition-colors'
            title='More info'
          >
            <Info size={14} />
          </a>
        ) : null}
      </div>
      {description ? (
        <p className='dvx:mt-1.5 dvx:text-sm dvx:leading-relaxed dvx:text-gray-500 dvx:dark:text-gray-400 dvx:font-medium'
          style={theme === 'mid' ? { color: 'rgba(255,255,255,0.55)' } : {}}>
          {description}
        </p>
      ) : null}
      {description && children ? (
        <div className='dvx:my-4 dvx:h-px dvx:bg-gray-100 dvx:dark:bg-[#333]'
          style={theme === 'mid' ? { backgroundColor: '#695885' } : {}} />
      ) : (
        <div className='dvx:mt-3' />
      )}
      {children}
    </div>
  );
};
