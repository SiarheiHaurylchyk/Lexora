import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  label: string;
  /** Kept for API compatibility — no longer used for generation. */
  prompt?: string;
  /** Kept for API compatibility — no longer used for generation. */
  context?: string;
  onChange: (url: string) => void;
}

export function CardImagePicker({ value, label, onChange }: Props) {
  const { t } = useTranslation();
  const [customUrl, setCustomUrl] = useState('');

  const submitCustomUrl = () => {
    if (!customUrl.trim()) return;
    onChange(customUrl.trim());
    setCustomUrl('');
  };

  return (
    <div>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <span className='text-text3 text-xs font-semibold tracking-[0.05em] uppercase'>
          {label}
        </span>
        {value && (
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => onChange('')}
            title={t('image.remove')}
          >
            {t('image.remove')}
          </button>
        )}
      </div>

      <div className='flex flex-wrap items-stretch gap-3'>
        {value ? (
          <img
            src={value}
            alt={label}
            className='border-border h-[100px] w-[100px] rounded-[12px] border object-cover'
            referrerPolicy='no-referrer'
          />
        ) : (
          <div className='border-border bg-bg3 text-text3 flex h-[100px] w-[100px] flex-col items-center justify-center rounded-[12px] border border-dashed'>
            <div className='text-3xl'>🖼️</div>
            <div className='mt-1 text-xs'>{t('image.empty')}</div>
          </div>
        )}

        <div className='flex flex-1 flex-col gap-2'>
          <input
            className='input-field'
            placeholder={t('image.pastePh')}
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitCustomUrl();
              }
            }}
          />
          <button
            type='button'
            className='btn btn-secondary btn-sm self-start'
            onClick={submitCustomUrl}
            disabled={!customUrl.trim()}
          >
            {t('image.use')}
          </button>
        </div>
      </div>
    </div>
  );
}
