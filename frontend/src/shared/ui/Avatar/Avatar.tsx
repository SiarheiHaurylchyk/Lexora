import type { CSSProperties } from 'react';

export interface AvatarProps {
  /** Display name or username. We take the first letter for the fallback. */
  name?: string;
  /** Optional image URL. */
  src?: string;
  size?: number;
  className?: string;
}

/**
 * Avatar — a round image (or initial letter) that represents a user.
 * If the user has no avatar URL, we draw a coloured circle with the first
 * letter of their name.
 */
export function Avatar({ name = 'U', src, size = 40, className }: AvatarProps) {
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('bg-bg3 shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  const fontSize = Math.max(12, Math.round(size * 0.42));
  const style: CSSProperties = { width: size, height: size, fontSize };
  return (
    <div
      aria-hidden
      className={cn(
        'from-brand to-accent flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white',
        className,
      )}
      style={style}
    >
      {initial}
    </div>
  );
}
