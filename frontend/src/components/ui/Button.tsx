import React from 'react';
import { classNames } from '../../lib/classNames';

/**
 * Button — a normal clickable button.
 *
 * Use `kind` to pick a look:
 *   - "primary"   : main action, brand color (default)
 *   - "secondary" : supporting action, gray/outline
 *   - "ghost"     : flat, no background until hover
 *   - "danger"    : red, for "delete" or destructive actions
 *
 * Use `size` to pick a size: "sm", "md" (default), "lg".
 *
 * The button uses global classes (`btn`, `btn-primary`, ...) defined in `index.css`.
 */
export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ButtonKind;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export default function Button({
  kind = 'primary',
  size = 'md',
  fullWidth,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = classNames(
    'btn',
    `btn-${kind}`,
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    fullWidth && 'btn-full-width',
    className,
  );
  return (
    <button
      type={type}
      className={classes}
      style={fullWidth ? { width: '100%', justifyContent: 'center' } : undefined}
      {...rest}
    />
  );
}
