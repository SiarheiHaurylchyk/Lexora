import { type CSSProperties, type FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Modal } from '@ui';

import { deckApi } from '@/shared/api/api-legacy';
import type { DeckItem } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';

const COLORS = [
  '#7C3AED',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
];
const EMOJIS = [
  '📚',
  '🌍',
  '💬',
  '🔤',
  '🎓',
  '✍️',
  '🧠',
  '🗣️',
  '📖',
  '🌐',
  '🎯',
  '⚡',
  '🔑',
  '🏆',
  '✨',
];
const LANG_CODES = [
  'en',
  'ru',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'zh',
  'ja',
  'ko',
  'tr',
  'pl',
  'uk',
  'ar',
] as const;

interface Props {
  onClose: () => void;
  onCreated: (deck: DeckItem) => void;
}

const labelClasses = tw`mb-1.5 block text-[13px] font-medium text-text2`;
const fieldClasses = tw`mb-4`;

export function CreateDeckModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    coverColor: COLORS[0],
    emoji: EMOJIS[0],
    visibility: 'PRIVATE',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t('createDeck.titleRequired'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await deckApi.createDeck(form);
      toast.success(t('createDeck.created'));
      onCreated(data);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || t('createDeck.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const langName = (code: string) => t(`languages.${code}`);

  const previewStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${form.coverColor}22, ${form.coverColor}11)`,
    border: `1px solid ${form.coverColor}44`,
  };
  const previewIconStyle: CSSProperties = {
    background: `${form.coverColor}33`,
  };

  return (
    <Modal title={t('createDeck.modalTitle')} onClose={onClose}>
      <div
        className='mb-5 flex items-center gap-3 rounded-[14px] px-4 py-3'
        style={previewStyle}
      >
        <div
          className='flex h-12 w-12 items-center justify-center rounded-[12px] text-2xl'
          style={previewIconStyle}
        >
          {form.emoji}
        </div>
        <div>
          <div className='font-display text-base font-bold'>
            {form.title || t('createDeck.previewTitle')}
          </div>
          <div className='text-text3 text-xs'>
            {langName(form.sourceLanguage)} → {langName(form.targetLanguage)}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={fieldClasses}>
          <label className={labelClasses}>{t('createDeck.titleStar')}</label>
          <input
            className='input-field'
            placeholder={t('createDeck.titlePh')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className={fieldClasses}>
          <label className={labelClasses}>{t('createDeck.description')}</label>
          <textarea
            className='input-field min-h-[72px] resize-y'
            placeholder={t('createDeck.descPh')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className='mb-4 grid grid-cols-2 gap-3'>
          <div>
            <label className={labelClasses}>{t('createDeck.fromLang')}</label>
            <select
              className='input-field'
              value={form.sourceLanguage}
              onChange={(e) =>
                setForm({ ...form, sourceLanguage: e.target.value })
              }
            >
              {LANG_CODES.map((code) => (
                <option key={code} value={code}>
                  {langName(code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>{t('createDeck.toLang')}</label>
            <select
              className='input-field'
              value={form.targetLanguage}
              onChange={(e) =>
                setForm({ ...form, targetLanguage: e.target.value })
              }
            >
              {LANG_CODES.map((code) => (
                <option key={code} value={code}>
                  {langName(code)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={fieldClasses}>
          <label className={labelClasses}>{t('createDeck.color')}</label>
          <div className='flex flex-wrap gap-2'>
            {COLORS.map((c) => {
              const style: CSSProperties = {
                background: c,
                outline: form.coverColor === c ? `3px solid ${c}` : 'none',
              };
              return (
                <button
                  key={c}
                  type='button'
                  onClick={() => setForm({ ...form, coverColor: c })}
                  className={cn(
                    'h-7 w-7 cursor-pointer rounded-full border-2 border-transparent p-0',
                    form.coverColor === c && 'border-[3px] border-white',
                  )}
                  style={style}
                  aria-label={c}
                />
              );
            })}
          </div>
        </div>

        <div className={fieldClasses}>
          <label className={labelClasses}>{t('createDeck.icon')}</label>
          <div className='flex flex-wrap gap-2'>
            {EMOJIS.map((em) => (
              <button
                key={em}
                type='button'
                onClick={() => setForm({ ...form, emoji: em })}
                className={cn(
                  'border-border bg-bg3 h-9 w-9 cursor-pointer rounded-lg border text-xl',
                  form.emoji === em && 'border-brand bg-brand-dim border-2',
                )}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className={fieldClasses}>
          <label className={labelClasses}>{t('createDeck.visibility')}</label>
          <div className='grid grid-cols-2 gap-3'>
            {[
              {
                value: 'PRIVATE',
                label: t('editDeck.optPrivate'),
                desc: t('common.onlyYou'),
              },
              {
                value: 'PUBLIC',
                label: t('editDeck.optPublic'),
                desc: t('common.everyone'),
              },
            ].map(({ value, label, desc }) => (
              <button
                key={value}
                type='button'
                onClick={() => setForm({ ...form, visibility: value })}
                className={cn(
                  'border-border bg-bg3 hover:border-border2 cursor-pointer rounded-[12px] border p-3 text-left transition-colors duration-200',
                  form.visibility === value && 'border-brand bg-brand-dim',
                )}
              >
                <div className='text-sm font-semibold'>{label}</div>
                <div className='text-text3 mt-0.5 text-xs'>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className='mt-5 flex justify-end gap-2.5'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type='submit' className='btn btn-primary' disabled={loading}>
            {loading ? t('createDeck.creating') : t('createDeck.createBtn')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
