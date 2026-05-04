import React from 'react';
import { classNames } from '../../lib/classNames';

/**
 * Skeleton — a gray shimmering box that takes the place of content while it is loading.
 * Use it in lists / cards so the page does not jump when real data arrives.
 */
interface Props {
  height?: number | string;
  width?: number | string;
  rounded?: number | string;
  className?: string;
}

export default function Skeleton({ height = 80, width = '100%', rounded = 12, className }: Props) {
  return (
    <div
      className={classNames('skeleton', className)}
      style={{ height, width, borderRadius: rounded }}
    />
  );
}
