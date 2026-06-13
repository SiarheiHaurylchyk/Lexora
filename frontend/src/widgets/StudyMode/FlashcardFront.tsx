import { useTranslation } from 'react-i18next';

import type { StudyCard } from '@/shared/lib/studyPrompts';

interface FlashcardFrontProps {
  card: StudyCard;
  /** Language label shown at the top (e.g. "en"). */
  languageLabel: string;
  /** True when this card has been marked Hard before and is being repeated. */
  isRepeat?: boolean;
}

/**
 * Front side of the flashcard. Shows the term in big font, optional
 * transcription, optional example sentence and a short hint to flip.
 * When `isRepeat` is true, a small "repeat" badge appears in the top-right
 * corner so the user knows this card is cycling back.
 */
export function FlashcardFront({
  card,
  languageLabel,
  isRepeat,
}: FlashcardFrontProps) {
  const { t } = useTranslation();

  return (
    <>
      {isRepeat && (
        <span className='bg-warning/15 text-warning absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold'>
          🔁 {t('study.flashcard.repeatBadge')}
        </span>
      )}

      <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
        {t('study.flashcard.reveal', { lang: languageLabel })}
      </div>

      {card.termImageUrl && (
        <img
          src={card.termImageUrl}
          alt={card.term}
          className='mb-4 max-h-[120px] rounded-[12px] object-cover'
        />
      )}

      <div className='font-display text-center text-[44px] leading-[1.1] font-bold'>
        {card.term}
      </div>

      {card.transcription && (
        <div className='text-text3 mt-2 text-sm'>{card.transcription}</div>
      )}

      {card.example && (
        <div className='text-text3 mt-3 text-sm italic'>
          &ldquo;{card.example}&rdquo;
        </div>
      )}

      <div className='text-text3 mt-auto pt-4 text-xs'>
        {t('study.flashcard.flipHint')}
      </div>
    </>
  );
}
