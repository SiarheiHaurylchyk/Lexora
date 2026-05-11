import type { ButtonHTMLAttributes } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tooltip text. Also used as `aria-label` for screen readers. */
  label: string;
}

export function IconButton({
  label,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn('btn btn-ghost btn-icon', className)}
      {...rest}
    />
  );
}
