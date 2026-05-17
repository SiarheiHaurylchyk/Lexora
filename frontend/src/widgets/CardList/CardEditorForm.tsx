import { useTranslation } from 'react-i18next';

import type { CardForm } from './types';

import { CardImagePicker } from '@/features/CardImagePicker';

import { useSpeech } from '@/shared/hooks/useSpeech';

interface Props {
  card: CardForm;
  sourceLanguage: string;
  targetLanguage: string;
  /** Изменить значение одного поля карточки. */
  onUpdate: (field: keyof CardForm, value: string) => void;
  /** Сохранить карточку на сервере; вернуть true при успехе. */
  onSave: () => Promise<boolean>;
  /** Закрыть редактор (с тихим автосейвом). */
  onClose: () => Promise<void>;
  /** Удалить карточку. */
  onDelete: () => void;
}

const smallLabelUpper = tw`mb-1.5 block text-xs uppercase tracking-[0.5px] text-text3`;
const smallLabelPlain = tw`mb-1.5 block text-xs text-text3`;
const speakBtn = tw`absolute top-1/2 -translate-y-1/2 bg-transparent text-base text-text3`;

/**
 * Inline-редактор одной карточки колоды.
 *
 * Поля:
 *  - термин и его произношение (с кнопками «🔊» и «🐢» — слово вслух);
 *  - перевод;
 *  - транскрипция и пример использования;
 *  - картинки для термина и перевода (CardImagePicker).
 *
 * Внизу — кнопки «Отмена», «Удалить» и «Сохранить».
 */
export function CardEditorForm({
  card,
  sourceLanguage,
  targetLanguage,
  onUpdate,
  onSave,
  onClose,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  return (
    <div className='px-5 pt-5 pb-4'>
      {/* Строка 1: термин (с озвучкой) и перевод */}
      <div className='mb-3 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <div>
          <label className={smallLabelUpper}>
            {t('editDeck.term', { lang: sourceLanguage })}
          </label>
          <div className='relative'>
            <input
              className='input-field !pr-[4.75rem]'
              value={card.term}
              onChange={(e) => onUpdate('term', e.target.value)}
              placeholder={t('editDeck.termPh')}
              autoFocus
            />
            <button
              type='button'
              className={cn(speakBtn, 'right-10')}
              title={t('deck.pronounceTermSlow')}
              onClick={() => speak(card.term, sourceLanguage, { slow: true })}
            >
              🐢
            </button>
            <button
              type='button'
              className={cn(speakBtn, 'right-2.5')}
              title={t('deck.pronounceTerm')}
              onClick={() => speak(card.term, sourceLanguage)}
            >
              🔊
            </button>
          </div>
        </div>

        <div>
          <label className={smallLabelUpper}>
            {t('editDeck.definition', { lang: targetLanguage })}
          </label>
          <input
            className='input-field'
            value={card.definition}
            onChange={(e) => onUpdate('definition', e.target.value)}
            placeholder={t('editDeck.defPh')}
          />
        </div>
      </div>

      {/* Строка 2: транскрипция и пример */}
      <div className='mb-3.5 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <div>
          <label className={smallLabelPlain}>
            {t('editDeck.transcription')}
          </label>
          <input
            className='input-field'
            value={card.transcription}
            onChange={(e) => onUpdate('transcription', e.target.value)}
            placeholder='/ˈæp.əl/'
          />
        </div>
        <div>
          <label className={smallLabelPlain}>{t('editDeck.example')}</label>
          <input
            className='input-field'
            value={card.example}
            onChange={(e) => onUpdate('example', e.target.value)}
            placeholder={t('editDeck.examplePh')}
          />
        </div>
      </div>

      {/* Строка 3: две картинки — для термина и для перевода */}
      <div className='border-border mb-[18px] grid grid-cols-2 gap-4 border-t border-dashed pt-3.5 max-[600px]:grid-cols-1'>
        <CardImagePicker
          label={t('editDeck.termImage')}
          prompt={card.term || card.definition}
          context={card.definition || undefined}
          value={card.termImageUrl}
          onChange={(url) => onUpdate('termImageUrl', url)}
        />
        <CardImagePicker
          label={t('editDeck.defImage')}
          prompt={card.definition || card.term}
          context={card.term || undefined}
          value={card.definitionImageUrl}
          onChange={(url) => onUpdate('definitionImageUrl', url)}
        />
      </div>

      {/* Кнопки управления карточкой */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={() => void onClose()}
        >
          {t('common.cancel')}
        </button>
        <div className='ml-auto flex gap-2'>
          <button
            type='button'
            className='btn btn-ghost btn-sm text-danger'
            onClick={onDelete}
          >
            🗑 {t('common.delete')}
          </button>
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={() => void onSave()}
          >
            {t('editDeck.saveCard')}
          </button>
        </div>
      </div>
    </div>
  );
}
