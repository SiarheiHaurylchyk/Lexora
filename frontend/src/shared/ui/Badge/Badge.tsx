import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children?: ReactNode;
}

const baseClasses = tw`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-xs font-medium`;

const toneClasses: Record<BadgeTone, string> = {
  brand: tw`bg-brand-dim text-brand`,
  success: tw`bg-success-dim text-success`,
  warning: tw`bg-warning-dim text-warning`,
  danger: tw`bg-danger-dim text-danger`,
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = 'brand', className, children, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(baseClasses, toneClasses[tone], className)}
      {...rest}
    >
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
