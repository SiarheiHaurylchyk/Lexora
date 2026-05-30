/**
 * Three rating options shown on the back of a flashcard.
 *
 * The values match the SM-2 spaced-repetition algorithm scale used by the
 * backend (`/api/study/answer`):
 *   - 1 → "Hard"  (incorrect, short next interval)
 *   - 3 → "Okay"  (correct but not easy)
 *   - 4 → "Easy"  (correct and effortless)
 */
export interface FlashcardAnswerOption {
  /** i18n key for the button label. */
  labelKey: string;
  /** Whether picking this option counts as a correct answer. */
  isCorrect: boolean;
  /** Numeric rating sent to the SRS engine (SM-2 grade). */
  srsRating: number;
  /** CSS color for the button text. */
  textColor: string;
  /** CSS background color for the button. */
  backgroundColor: string;
}

export const FLASHCARD_ANSWER_OPTIONS: readonly FlashcardAnswerOption[] = [
  {
    labelKey: 'landing.hard',
    isCorrect: false,
    srsRating: 1,
    textColor: 'var(--danger)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  {
    labelKey: 'landing.okay',
    isCorrect: true,
    srsRating: 3,
    textColor: 'var(--warning)',
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  {
    labelKey: 'landing.easy',
    isCorrect: true,
    srsRating: 4,
    textColor: 'var(--success)',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
] as const;
