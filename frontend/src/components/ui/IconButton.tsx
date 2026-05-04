import React from 'react';
import { classNames } from '../../lib/classNames';

/**
 * IconButton — a small square button that holds a single icon (emoji or SVG).
 * It is "ghost" by default (transparent background, hover only).
 */
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip text. Also used as `aria-label` for screen readers. */
  label: string;
}

export default function IconButton({ label, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={classNames('btn', 'btn-ghost', 'btn-icon', className)}
      {...rest}
    />
  );
}
