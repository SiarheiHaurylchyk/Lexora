import { forwardRef, type InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const baseClasses = tw`w-full px-4 py-3 bg-bg3 border border-border rounded-[12px] text-text text-[15px] outline-none transition-[background,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-text3 focus:border-brand focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] disabled:opacity-60 disabled:cursor-not-allowed`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(baseClasses, className)} {...rest} />
  ),
);

Input.displayName = 'Input';
