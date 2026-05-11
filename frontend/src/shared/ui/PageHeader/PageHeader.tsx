import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * PageHeader — a big page title with an optional subtitle and right-side actions.
 * Used at the top of full-screen pages (Dashboard, Students, Lessons, ...).
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className='mb-6 flex flex-wrap items-end justify-between gap-4'>
      <div>
        <h1 className='mb-1 text-[32px]'>{title}</h1>
        {subtitle && <p className='text-text2 text-[15px]'>{subtitle}</p>}
      </div>
      {actions && <div className='flex gap-2.5'>{actions}</div>}
    </header>
  );
}
