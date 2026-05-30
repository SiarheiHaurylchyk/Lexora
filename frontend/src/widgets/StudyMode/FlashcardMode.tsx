import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FlashcardAnswerButtons } from './FlashcardAnswerButtons';
import { FlashcardNavArrow } from './FlashcardNavArrow';
import { FlashcardScene } from './FlashcardScene';
import { ProgressBar } from './ProgressBar';
import type { StudyModeProps } from './types';

import { useFlashcardKeyboard } from '@/shared/hooks/useFlashcardKeyboard';
import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

type StudyAnswer = ReturnType<typeof okResult>;

/**
 * Study mode "Flashcards".
 *
 * Big 3D card the user can flip (click or space). Once flipped, three
 * rating buttons appear (Hard / Okay / Easy). The rating is sent to the
 * server for SM-2 spaced repetition and stored in the session results.
 */
export function FlashcardMode({
  cards,
  deck,
  sessionId,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [collectedAnswers, setCollectedAnswers] = useState<StudyAnswer[]>([]);

  const currentCard = cards[currentCardIndex];
  const hasPreviousCard = currentCardIndex > 0;
  const hasNextCard = currentCardIndex < cards.length - 1;
  const isLastCard = currentCardIndex + 1 >= cards.length;

  const flipCard = () => setIsCardFlipped((wasFlipped) => !wasFlipped);

  const goToPreviousCard = () => {
    if (!hasPreviousCard) return;
    setCurrentCardIndex((index) => index - 1);
    setIsCardFlipped(false);
  };

  const goToNextCard = () => {
    if (!hasNextCard) return;
    setCurrentCardIndex((index) => index + 1);
    setIsCardFlipped(false);
  };

  /** Save the answer for the current card and advance (or finish). */
  const submitAnswer = (isCorrect: boolean, srsRating: number) => {
    sendStudyAnswer(sessionId, currentCard.id, isCorrect, srsRating);

    const newAnswer = isCorrect
      ? okResult(currentCard.id)
      : mistakeResult(currentCard.id, currentCard.term, currentCard.definition);

    const answersWithoutPrevious = collectedAnswers.filter(
      (answer) => answer.cardId !== currentCard.id,
    );
    const updatedAnswers = [...answersWithoutPrevious, newAnswer];
    setCollectedAnswers(updatedAnswers);
    setIsCardFlipped(false);

    setTimeout(() => {
      if (isLastCard) {
        onComplete(updatedAnswers);
      } else {
        setCurrentCardIndex((index) => index + 1);
      }
    }, 200);
  };

  useEffect(() => {
    const textToSpeak = isCardFlipped
      ? currentCard.definition
      : currentCard.term;
    speakEnglishIfPossible(speak, textToSpeak);
  }, [isCardFlipped, currentCard.term, currentCard.definition, speak]);

  useFlashcardKeyboard({
    flipped: isCardFlipped,
    onFlip: flipCard,
    onPrevCard: goToPreviousCard,
    onNextCard: goToNextCard,
    onHard: () => submitAnswer(false, 1),
    onEasy: () => submitAnswer(true, 4),
  });

  return (
    <div className='mx-auto w-full max-w-[760px]'>
      <div className='flex items-center gap-4 max-[640px]:gap-2'>
        <FlashcardNavArrow
          direction='prev'
          isDisabled={!hasPreviousCard}
          ariaLabel={t('study.flashcard.prevCard')}
          onClick={goToPreviousCard}
        />

        <div className='flex min-w-0 flex-1 flex-col'>
          <ProgressBar
            idx={currentCardIndex}
            total={cards.length}
            showPercent
          />

          <div className='mb-4'>
            <FlashcardScene
              card={currentCard}
              deck={deck}
              isFlipped={isCardFlipped}
              onFlip={flipCard}
            />
          </div>

          <p className='text-text3 mb-4 text-center text-xs'>
            {t('study.flashcard.keyboardHint')}
          </p>

          {isCardFlipped && <FlashcardAnswerButtons onAnswer={submitAnswer} />}
        </div>

        <FlashcardNavArrow
          direction='next'
          isDisabled={!hasNextCard}
          ariaLabel={t('study.flashcard.nextCard')}
          onClick={goToNextCard}
        />
      </div>
    </div>
  );
}
