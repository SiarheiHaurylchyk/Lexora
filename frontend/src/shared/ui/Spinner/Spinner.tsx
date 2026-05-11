import type { CSSProperties } from 'react';

export interface SpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Spinner — a small circle that spins to show "loading".
 * Pass `size` to make it bigger or smaller.
 */
export function Spinner({ size = 18, className }: SpinnerProps) {
  const style: CSSProperties = { width: size, height: size };
  return (
    <span
      role='status'
      aria-label='Loading'
      className={cn(
        'border-t-brand-light animate-spin-slow inline-block rounded-full border-2 border-[rgba(255,255,255,0.15)]',
        className,
      )}
      style={style}
    />
  );
}
