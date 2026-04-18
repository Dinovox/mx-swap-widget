import React from 'react';
import type { PropsWithChildren } from 'react';
import { Info } from 'lucide-react';

interface CardProps extends PropsWithChildren {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  reference?: string;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ id, title, children, description, reference, className = '', onClick }: CardProps) => {
  const borderClass = className.includes('border') ? '' : 'border border-gray-100 dark:border-[#333]';
  return (
    <div
      id={id}
      onClick={onClick}
      className={`flex flex-col bg-white dark:bg-[#111] p-6 rounded-2xl shadow-sm transition-all ${borderClass} ${className}`}
    >
      <div className='flex items-start justify-between gap-3'>
        <h2 className='text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase'>
          {title}
        </h2>
        {reference ? (
          <a href={reference} target='_blank' rel='noreferrer'
            className='inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors'
            title='More info'
          >
            <Info size={14} />
          </a>
        ) : null}
      </div>
      {description ? (
        <p className='mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400 font-medium'>
          {description}
        </p>
      ) : null}
      {description && children ? (
        <div className='my-4 h-px bg-gray-100 dark:bg-[#333]' />
      ) : (
        <div className='mt-3' />
      )}
      {children}
    </div>
  );
};
