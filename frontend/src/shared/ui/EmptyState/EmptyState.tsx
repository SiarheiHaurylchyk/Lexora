import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * EmptyState — a centered block we show when a list has no items
 * (no decks, no students, no lessons). Contains an icon, a title,
 * a short description, and an optional action button (`children`).
 */
export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className='border-border bg-surface rounded-[20px] border px-5 py-[60px] text-center'>
      <div className='mb-3 text-[56px]'>{icon}</div>
      <h2 className='mb-2 text-xl'>{title}</h2>
      {description && (
        <p className={cn('text-text2', children && 'mb-6')}>{description}</p>
      )}
      {children}
    </div>
  );
}
