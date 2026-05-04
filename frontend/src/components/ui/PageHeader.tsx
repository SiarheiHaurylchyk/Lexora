import React from 'react';

/**
 * PageHeader — a big page title with an optional subtitle and right-side actions.
 * Used at the top of full-screen pages (Dashboard, Students, Lessons, ...).
 */
interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontSize: 32, marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text2)', fontSize: 15 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </header>
  );
}
