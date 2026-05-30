import { useTranslation } from 'react-i18next';

import type { StudyCard } from '@/shared/lib/studyPrompts';

interface FlashcardFrontProps {
  card: StudyCard;
  /** Language label shown at the top (e.g. "en"). */
  languageLabel: string;
}

/**
 * Front side of the flashcard. Shows the term in big font, optional
 * transcription, optional example sentence and a short hint to flip.
 */
export function FlashcardFront({ card, languageLabel }: FlashcardFrontProps) {
  const { t } = useTranslation();

  return (
    <>
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
