import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  isLoading?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

const baseClasses = tw`inline-flex items-center gap-2 whitespace-nowrap font-body font-medium cursor-pointer transition-[background,transform,box-shadow,border-color,color,opacity] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:opacity-60 disabled:cursor-not-allowed`;

const variantClasses: Record<ButtonVariant, string> = {
  primary: tw`bg-brand text-white shadow-brand hover:bg-brand-light hover:-translate-y-px active:translate-y-0`,
  secondary: tw`bg-surface2 text-text border border-border2 hover:bg-bg4 hover:border-brand`,
  ghost: tw`bg-transparent text-text2 hover:bg-surface hover:text-text`,
  danger: tw`bg-danger text-white hover:opacity-90`,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: tw`px-3.5 py-1.5 text-[13px] rounded-lg`,
  md: tw`px-5 py-2.5 text-sm rounded-[12px]`,
  lg: tw`px-7 py-3.5 text-base rounded-[14px]`,
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: tw`p-1.5 rounded-lg`,
  md: tw`p-2 rounded-lg`,
  lg: tw`p-2.5 rounded-[12px]`,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      iconOnly = false,
      isLoading = false,
      leftSlot,
      rightSlot,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        iconOnly ? iconSizeClasses[size] : sizeClasses[size],
        isLoading && 'pointer-events-none',
        className,
      )}
      {...rest}
    >
      {leftSlot}
      {children}
      {rightSlot}
    </button>
  ),
);

Button.displayName = 'Button';
