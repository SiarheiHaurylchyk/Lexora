import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FlashcardNavArrowProps {
  /** Which side the arrow points to (and which neighbor card it opens). */
  direction: 'prev' | 'next';
  /** Hide the arrow when there is no neighbor card in that direction. */
  isDisabled: boolean;
  /** Accessible label for screen readers (already translated). */
  ariaLabel: string;
  onClick: () => void;
}

const navArrowClasses = tw`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text transition-colors duration-200 hover:not-disabled:border-brand hover:not-disabled:text-brand-light disabled:cursor-not-allowed disabled:opacity-30`;

/** Round chevron button on either side of the flashcard scene. */
export function FlashcardNavArrow({
  direction,
  isDisabled,
  ariaLabel,
  onClick,
}: FlashcardNavArrowProps) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;

  return (
    <button
      type='button'
      className={navArrowClasses}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
    >
      <Icon size={28} strokeWidth={2.25} aria-hidden />
    </button>
  );
}
