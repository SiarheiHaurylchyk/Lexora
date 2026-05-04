import React from 'react';
import { classNames } from '../../lib/classNames';

/**
 * TextArea — a labelled multi-line text input.
 * Use it for descriptions, notes, article excerpts, etc.
 */
interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export default function TextArea({ label, hint, className, ...rest }: Props) {
  return (
    <label className={classNames('text-area', className)} style={{ display: 'block' }}>
      {label && (
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
          {label}
        </span>
      )}
      <textarea
        className="input-field"
        style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
        {...rest}
      />
      {hint && (
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{hint}</span>
      )}
    </label>
  );
}
