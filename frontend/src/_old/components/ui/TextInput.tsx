import React from 'react';
import { classNames } from '../../lib/classNames';

/**
 * TextInput — a labelled text input.
 *
 * Use it for any one-line text field: title, email, password, search, etc.
 * The label (and optional hint) sit above the input so the user always knows
 * what to type.
 */
interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export default function TextInput({ label, hint, error, className, id, ...rest }: Props) {
  const inputId = id || (label ? `text-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={classNames('text-input', className)} style={{ display: 'block' }}>
      {label && (
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
          {label}
        </span>
      )}
      <input
        id={inputId}
        className={classNames('input-field', error && 'input-field-error')}
        style={error ? { borderColor: 'var(--danger)' } : undefined}
        {...rest}
      />
      {error ? (
        <span style={{ display: 'block', fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{error}</span>
      ) : hint ? (
        <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{hint}</span>
      ) : null}
    </label>
  );
}
