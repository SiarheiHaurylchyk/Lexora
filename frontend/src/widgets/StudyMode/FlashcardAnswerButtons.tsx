import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { FLASHCARD_ANSWER_OPTIONS } from './flashcardAnswerOptions';

interface FlashcardAnswerButtonsProps {
  /** Called when user marks the card as too hard — it will repeat later. */
  onHard: () => void;
  /** Called when user marks the card as known — session moves on. */
  onEasy: () => void;
}

const answerButtonClasses = tw`cursor-pointer rounded-[18px] px-6 py-4 text-lg font-bold transition-all duration-150 hover:-translate-y-0.5 active:scale-95`;

/**
 * Two large answer buttons shown under a flipped flashcard.
 *
 * "Again" (red)  — card repeats at the end of the queue.
 * "Got it" (green) — card is done for this session.
 */
export function FlashcardAnswerButtons({
  onHard,
  onEasy,
}: FlashcardAnswerButtonsProps) {
  const { t } = useTranslation();

  const handlers: Record<'hard' | 'easy', () => void> = {
    hard: onHard,
    easy: onEasy,
  };

  return (
    <div className='animate-fade grid grid-cols-2 gap-4'>
      {FLASHCARD_ANSWER_OPTIONS.map(
        ({ action, labelKey, textColor, backgroundColor }) => {
          const buttonStyle: CSSProperties = {
            background: backgroundColor,
            border: `2px solid ${textColor}55`,
            color: textColor,
          };
          return (
            <button
              key={action}
              type='button'
              className={answerButtonClasses}
              style={buttonStyle}
              onClick={handlers[action]}
            >
              {t(labelKey)}
            </button>
          );
        },
      )}
    </div>
  );
}
