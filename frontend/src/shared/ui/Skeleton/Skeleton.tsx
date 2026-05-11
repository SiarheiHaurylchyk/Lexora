import type { CSSProperties } from 'react';

export interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  rounded?: number | string;
  className?: string;
}

/**
 * Skeleton — a gray shimmering box that takes the place of content while it
 * is loading. Use it in lists / cards so the page does not jump when real
 * data arrives.
 */
export function Skeleton({
  height = 80,
  width = '100%',
  rounded = 12,
  className,
}: SkeletonProps) {
  const style: CSSProperties = { height, width, borderRadius: rounded };
  return <div className={cn('skeleton', className)} style={style} />;
}
