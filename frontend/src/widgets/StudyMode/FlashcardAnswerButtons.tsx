import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { FLASHCARD_ANSWER_OPTIONS } from './flashcardAnswerOptions';

interface FlashcardAnswerButtonsProps {
  /** Called with the chosen option's "correct" flag and SRS rating. */
  onAnswer: (isCorrect: boolean, srsRating: number) => void;
}

const answerButtonClasses = tw`cursor-pointer rounded-[14px] px-5 py-3 text-base font-semibold transition-transform duration-200 hover:-translate-y-0.5`;

/**
 * Three rating buttons (Hard / Okay / Easy) shown under a flipped card.
 * Picking one of them stores the answer for SM-2 spaced repetition.
 */
export function FlashcardAnswerButtons({
  onAnswer,
}: FlashcardAnswerButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className='animate-fade grid grid-cols-3 gap-3 max-[640px]:grid-cols-1'>
      {FLASHCARD_ANSWER_OPTIONS.map(
        ({ labelKey, isCorrect, srsRating, textColor, backgroundColor }) => {
          const buttonStyle: CSSProperties = {
            background: backgroundColor,
            border: `1px solid ${textColor}44`,
            color: textColor,
          };
          return (
            <button
              key={labelKey}
              type='button'
              className={answerButtonClasses}
              style={buttonStyle}
              onClick={() => onAnswer(isCorrect, srsRating)}
            >
              {t(labelKey)}
            </button>
          );
        },
      )}
    </div>
  );
}
