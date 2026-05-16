import { useTranslation } from 'react-i18next';

import type { CardForm } from './types';

import { shouldShowSpeakButton, useSpeech } from '@/shared/hooks/useSpeech';

interface Props {
  card: CardForm;
  sourceLanguage: string;
  /** Клик по строке: открыть inline-редактор у этой карточки. */
  onOpen: () => void;
  /** Удалить карточку. */
  onDelete: () => void;
}

const thumbCls = tw`border-border h-12 w-12 rounded-[10px] border object-cover`;
const thumbPlaceholderCls = tw`border-border bg-bg text-text3 flex h-12 w-12 items-center justify-center rounded-[10px] border border-dashed text-lg`;
const speakIconBtn = tw`btn btn-ghost btn-icon text-text3 text-base`;
const deleteIconBtn = tw`btn btn-ghost btn-icon text-text3 hover:text-danger text-base`;

/**
 * Свёрнутая строка карточки в списке редактора колоды.
 *
 * Слева — превью изображения, дальше «термин» и «перевод», справа —
 * кнопки озвучки и удаления. Клик по строке (вне кнопок) открывает
 * полноценный редактор карточки.
 */
export function CardRow({ card, sourceLanguage, onOpen, onDelete }: Props) {
  const { t } = useTranslation();
  const { speak } = useSpeech();
  const canSpeakTerm = shouldShowSpeakButton(card.term, sourceLanguage);

  return (
    <div
      className='grid cursor-pointer grid-cols-[56px_1fr_1fr_auto] items-center gap-4 px-5 py-3.5'
      onClick={onOpen}
    >
      {/* Превью картинки термина или плейсхолдер */}
      {card.termImageUrl ? (
        <img src={card.termImageUrl} alt='' className={thumbCls} />
      ) : (
        <div className={thumbPlaceholderCls} aria-hidden>
          🃏
        </div>
      )}

      {/* Термин (или подсказка «нажмите, чтобы заполнить») */}
      <div
        className={cn(
          'min-w-0 text-[15px] font-medium',
          card.term ? 'text-text' : 'text-text3',
        )}
      >
        {card.term || t('editDeck.clickEditTerm')}
      </div>

      {/* Перевод */}
      <div
        className={cn(
          'min-w-0 text-[15px]',
          card.definition ? 'text-text2' : 'text-text3',
        )}
      >
        {card.definition || t('editDeck.clickEditDef')}
      </div>

      {/* Иконки справа — клики по ним не должны открывать редактор */}
      <div
        className='flex shrink-0 items-center gap-0.5'
        onClick={(e) => e.stopPropagation()}
      >
        {!card.id && (
          <span className='badge badge-warning'>{t('editDeck.unsaved')}</span>
        )}
        {canSpeakTerm && (
          <>
            <button
              type='button'
              className={speakIconBtn}
              title={t('deck.pronounceTerm')}
              onClick={() => speak(card.term, sourceLanguage)}
            >
              🔊
            </button>
            <button
              type='button'
              className={speakIconBtn}
              title={t('deck.pronounceTermSlow')}
              onClick={() => speak(card.term, sourceLanguage, { slow: true })}
            >
              🐢
            </button>
          </>
        )}
        <button
          type='button'
          className={deleteIconBtn}
          title={t('editDeck.deleteCard')}
          onClick={onDelete}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
