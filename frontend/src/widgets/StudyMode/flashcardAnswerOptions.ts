/**
 * Two answer options shown on the back of a flashcard.
 *
 * "Again" (Hard) → the card goes to the end of the session queue and will be
 * shown again until the user marks it "Got it".
 *
 * "Got it" (Easy) → card is mastered for this session, not repeated.
 *
 * SM-2 ratings sent to the server:
 *   1 → Again (incorrect, shortest next interval)
 *   4 → Got it (correct and confident)
 *
 * "Okay / Норм" is intentionally removed — two clear options are less confusing
 * than three, and it matches the mental model of top flashcard apps.
 */
export interface FlashcardAnswerOption {
  /** Unique key used to pick the right handler in the buttons component. */
  action: 'hard' | 'easy';
  /** i18n key for the button label. */
  labelKey: string;
  /** Numeric rating forwarded to the SRS engine (SM-2 grade). */
  srsRating: number;
  /** CSS color for the button text and border. */
  textColor: string;
  /** CSS background color for the button. */
  backgroundColor: string;
}

export const FLASHCARD_ANSWER_OPTIONS: readonly FlashcardAnswerOption[] = [
  {
    action: 'hard',
    labelKey: 'study.flashcard.again',
    srsRating: 1,
    textColor: 'var(--danger)',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  {
    action: 'easy',
    labelKey: 'study.flashcard.know',
    srsRating: 4,
    textColor: 'var(--success)',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
] as const;
