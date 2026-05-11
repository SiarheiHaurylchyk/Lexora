import type { InputHTMLAttributes } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextInput({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: TextInputProps) {
  const inputId =
    id ||
    (label ? `text-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className='text-text2 mb-1.5 block text-[13px] font-medium'>
          {label}
        </span>
      )}
      <input
        id={inputId}
        className={cn('input-field', error && '!border-danger')}
        {...rest}
      />
      {error ? (
        <span className='text-danger mt-1 block text-xs'>{error}</span>
      ) : hint ? (
        <span className='text-text3 mt-1 block text-xs'>{hint}</span>
      ) : null}
    </label>
  );
}
