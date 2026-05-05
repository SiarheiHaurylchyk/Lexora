import React from 'react';
import { classNames } from '../../lib/classNames';

/**
 * SectionCard — a rounded box with an optional title at the top.
 * Use it to group related fields or content (settings, a list, etc.).
 */
interface Props {
  title?: string;
  description?: string;
  /** Buttons or controls to show on the right side of the title. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ title, description, actions, children, className }: Props) {
  return (
    <section className={classNames('card', className)} style={{ marginBottom: 20 }}>
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: description ? 4 : 16,
          }}
        >
          {title && <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>}
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </header>
      )}
      {description && (
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>{description}</p>
      )}
      {children}
    </section>
  );
}
