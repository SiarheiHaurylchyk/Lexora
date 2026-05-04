import React from 'react';

/**
 * Avatar — a round image (or initial letter) that represents a user.
 * If the user has no avatar URL, we draw a coloured circle with the first
 * letter of their name.
 */
interface Props {
  /** Display name or username. We take the first letter for the fallback. */
  name?: string;
  /** Optional image URL. */
  src?: string;
  size?: number;
}

export default function Avatar({ name = 'U', src, size = 40 }: Props) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          background: 'var(--bg3)',
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--brand), var(--accent))',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.max(12, Math.round(size * 0.42)),
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
