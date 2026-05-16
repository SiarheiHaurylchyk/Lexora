import { type CSSProperties, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DECK_COLORS, DECK_EMOJIS, type DeckMeta, LANG_CODES } from './types';

interface Props {
  meta: DeckMeta;
  /** Идёт сохранение настроек на сервере (для disabled у кнопки). */
  saving: boolean;
  /** Колбэк для замены meta целиком (родитель хранит state). */
  onChange: (meta: DeckMeta) => void;
  /** Сохранить настройки колоды на сервере. */
  onSave: () => Promise<void>;
}

const labelCls = tw`mb-1.5 block text-[13px] font-medium text-text2`;

/**
 * Форма настроек колоды.
 *
 * Управляет всеми мета-полями: название, описание, языки источника и
 * перевода, цвет обложки, эмодзи-иконка, видимость (PRIVATE/PUBLIC).
 *
 * State хранит родитель — этот компонент только показывает значения и
 * вызывает `onChange` при правках.
 */
export function DeckSettingsForm({ meta, saving, onChange, onSave }: Props) {
  const { t } = useTranslation();

  /** Обновить одно или несколько полей meta частичным патчем. */
  const updateMetaFields = useCallback(
    (patch: Partial<DeckMeta>) => onChange({ ...meta, ...patch }),
    [meta, onChange],
  );

  /** Локализованное название языка по коду (например, "ru" → "Русский"). */
  const getLanguageName = (code: string) => t(`languages.${code}`);

  return (
    <div className='card mb-7'>
      <h2 className='font-display mb-5 text-lg'>
        {t('editDeck.settingsTitle')}
      </h2>

      {/* Название и видимость в одну строку */}
      <div className='mb-4 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <div>
          <label className={labelCls}>{t('editDeck.titleLabel')}</label>
          <input
            className='input-field'
            value={meta.title}
            onChange={(e) => updateMetaFields({ title: e.target.value })}
            placeholder={t('editDeck.titlePh')}
          />
        </div>
        <div>
          <label className={labelCls}>{t('editDeck.visibility')}</label>
          <select
            className='input-field'
            value={meta.visibility}
            onChange={(e) => updateMetaFields({ visibility: e.target.value })}
          >
            <option value='PRIVATE'>{t('editDeck.optPrivate')}</option>
            <option value='PUBLIC'>{t('editDeck.optPublic')}</option>
          </select>
        </div>
      </div>

      {/* Описание — многострочный текст */}
      <div className='mb-4'>
        <label className={labelCls}>{t('editDeck.description')}</label>
        <textarea
          className='input-field min-h-[60px] resize-y'
          value={meta.description}
          onChange={(e) => updateMetaFields({ description: e.target.value })}
        />
      </div>

      {/* Пара языков: исходный и целевой */}
      <div className='mb-4 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <div>
          <label className={labelCls}>{t('editDeck.fromLang')}</label>
          <select
            className='input-field'
            value={meta.sourceLanguage}
            onChange={(e) =>
              updateMetaFields({ sourceLanguage: e.target.value })
            }
          >
            {LANG_CODES.map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('editDeck.toLang')}</label>
          <select
            className='input-field'
            value={meta.targetLanguage}
            onChange={(e) =>
              updateMetaFields({ targetLanguage: e.target.value })
            }
          >
            {LANG_CODES.map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Палитра цвета обложки */}
      <div className='mb-4'>
        <label className={labelCls}>{t('editDeck.color')}</label>
        <div className='flex flex-wrap gap-2'>
          {DECK_COLORS.map((color) => {
            const isSelected = meta.coverColor === color;
            const style: CSSProperties = {
              background: color,
              outline: isSelected ? `3px solid ${color}` : 'none',
            };
            return (
              <button
                key={color}
                type='button'
                onClick={() => updateMetaFields({ coverColor: color })}
                className={cn(
                  'h-7 w-7 cursor-pointer rounded-full border-2 border-transparent p-0',
                  isSelected && 'border-[3px] border-white',
                )}
                style={style}
                aria-label={color}
              />
            );
          })}
        </div>
      </div>

      {/* Иконка-эмодзи колоды */}
      <div className='mb-6'>
        <label className={labelCls}>{t('editDeck.icon')}</label>
        <div className='flex flex-wrap gap-2'>
          {DECK_EMOJIS.map((emoji) => {
            const isSelected = meta.emoji === emoji;
            return (
              <button
                key={emoji}
                type='button'
                onClick={() => updateMetaFields({ emoji })}
                className={cn(
                  'border-border bg-bg3 h-9 w-9 cursor-pointer rounded-lg border text-xl',
                  isSelected && 'border-brand bg-brand-dim border-2',
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Кнопка сохранения настроек колоды */}
      <div className='flex justify-end'>
        <button
          type='button'
          className='btn btn-primary'
          onClick={() => void onSave()}
          disabled={saving}
        >
          {saving ? t('editDeck.saving') : t('editDeck.saveSettings')}
        </button>
      </div>
    </div>
  );
}
