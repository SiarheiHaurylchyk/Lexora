import React from 'react';

/**
 * EmptyState — a centered block we show when a list has no items
 * (no decks, no students, no lessons). It contains an icon, a title,
 * a short description, and an optional action button (`children`).
 */
interface Props {
  icon: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, children }: Props) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 12 }}>{icon}</div>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h2>
      {description && (
        <p style={{ color: 'var(--text2)', marginBottom: children ? 24 : 0 }}>{description}</p>
      )}
      {children}
    </div>
  );
}
