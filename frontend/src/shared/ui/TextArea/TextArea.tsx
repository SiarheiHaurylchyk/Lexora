import type { TextareaHTMLAttributes } from 'react';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function TextArea({ label, hint, className, ...rest }: TextAreaProps) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className='text-text2 mb-1.5 block text-[13px] font-medium'>
          {label}
        </span>
      )}
      <textarea
        className='input-field font-inherit min-h-[80px] resize-y'
        {...rest}
      />
      {hint && <span className='text-text3 mt-1 block text-xs'>{hint}</span>}
    </label>
  );
}
