import React from 'react';

/**
 * Spinner — a small circle that spins to show "loading".
 * Pass `size` to make it bigger or smaller.
 */
export default function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid rgba(255,255,255,0.15)`,
        borderTopColor: 'var(--brand-light)',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}
