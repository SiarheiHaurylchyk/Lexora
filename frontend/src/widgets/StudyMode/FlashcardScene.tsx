import { FlashcardBack } from './FlashcardBack';
import { FlashcardFront } from './FlashcardFront';

import type { DeckItem } from '@/shared/api/types';
import {
  type StudyCard,
  studyCardBackLang,
  studyCardFrontLang,
} from '@/shared/lib/studyPrompts';

interface FlashcardSceneProps {
  card: StudyCard;
  deck: DeckItem;
  /** When true the card is rotated to show its back side. */
  isFlipped: boolean;
  /** Click anywhere on the scene to flip the card. */
  onFlip: () => void;
}

const sceneClasses = tw`relative w-full cursor-pointer [perspective:1500px]`;
const innerClasses = tw`relative h-[420px] w-full transition-transform duration-700 [transform-style:preserve-3d]`;
const innerFlippedClasses = tw`[transform:rotateY(180deg)]`;
const faceClasses = tw`absolute inset-0 flex flex-col items-center justify-center rounded-[24px] border border-border p-8 [backface-visibility:hidden]`;
const frontFaceClasses = tw`bg-surface text-text`;
const backFaceClasses = tw`bg-gradient-to-br from-brand to-accent text-white [transform:rotateY(180deg)]`;

/**
 * 3D flip-card scene with both faces. The parent owns the `isFlipped`
 * state; this component is purely presentational.
 */
export function FlashcardScene({
  card,
  deck,
  isFlipped,
  onFlip,
}: FlashcardSceneProps) {
  const frontLanguage = studyCardFrontLang(deck, card);
  const backLanguage = studyCardBackLang(deck, card);

  return (
    <div className={sceneClasses} onClick={onFlip}>
      <div className={cn(innerClasses, isFlipped && innerFlippedClasses)}>
        <div className={cn(faceClasses, frontFaceClasses)}>
          <FlashcardFront card={card} languageLabel={frontLanguage} />
        </div>
        <div className={cn(faceClasses, backFaceClasses)}>
          <FlashcardBack card={card} languageLabel={backLanguage} />
        </div>
      </div>
    </div>
  );
}
