import { useTranslation } from 'react-i18next';

import type { StudyCard } from '@/shared/lib/studyPrompts';

interface FlashcardBackProps {
  card: StudyCard;
  /** Language label shown at the top (e.g. "ru"). */
  languageLabel: string;
}

/**
 * Back side of the flashcard. Shows the translation/definition in big
 * font with an optional illustration (definition image, or term image as
 * a fallback when only the term has one).
 */
export function FlashcardBack({ card, languageLabel }: FlashcardBackProps) {
  const { t } = useTranslation();

  const backImageUrl = card.definitionImageUrl || card.termImageUrl;

  return (
    <>
      <div className='mb-3 text-xs tracking-[0.08em] uppercase opacity-80'>
        {t('study.flashcard.translationLabel', { lang: languageLabel })}
      </div>

      {backImageUrl && (
        <img
          src={backImageUrl}
          alt={card.definition}
          className='mb-4 max-h-[120px] rounded-[12px] object-cover'
        />
      )}

      <div className='font-display text-center text-[40px] leading-[1.1] font-bold'>
        {card.definition}
      </div>
    </>
  );
}
