import type { ReactNode } from 'react';

export interface SectionCardProps {
  title?: string;
  description?: string;
  /** Buttons or controls to show on the right side of the title. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * SectionCard — a rounded box with an optional title at the top.
 * Use it to group related fields or content (settings, a list, etc.).
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn('card mb-5', className)}>
      {(title || actions) && (
        <header
          className={cn(
            'flex items-center justify-between gap-3',
            description ? 'mb-1' : 'mb-4',
          )}
        >
          {title && <h2 className='text-lg font-bold'>{title}</h2>}
          {actions && <div className='flex gap-2'>{actions}</div>}
        </header>
      )}
      {description && <p className='text-text2 mb-4 text-sm'>{description}</p>}
      {children}
    </section>
  );
}
