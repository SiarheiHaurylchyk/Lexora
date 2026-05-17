import { type CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ProgressBar } from './ProgressBar';
import type { StudyModeProps } from './types';

import { useFlashcardKeyboard } from '@/shared/hooks/useFlashcardKeyboard';
import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import {
  studyCardBackLang,
  studyCardFrontLang,
} from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

// Локальные tw-классы только для этого компонента
const navArrow = tw`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text transition-colors duration-200 hover:not-disabled:border-brand hover:not-disabled:text-brand-light disabled:cursor-not-allowed disabled:opacity-30`;
const cardScene = tw`relative w-full cursor-pointer [perspective:1500px]`;
const cardInner = tw`relative h-[420px] w-full transition-transform duration-700 [transform-style:preserve-3d]`;
const cardInnerFlipped = tw`[transform:rotateY(180deg)]`;
const cardFace = tw`absolute inset-0 flex flex-col items-center justify-center rounded-[24px] border border-border p-8 [backface-visibility:hidden]`;
const cardFront = tw`bg-surface text-text`;
const cardBack = tw`bg-gradient-to-br from-brand to-accent text-white [transform:rotateY(180deg)]`;

/** Три кнопки оценки — Сложно / Норм / Легко (рейтинг для SM-2). */
const ANSWER_OPTIONS = [
  {
    labelKey: 'landing.hard',
    correct: false,
    srsRating: 1,
    color: 'var(--danger)',
    bg: 'rgba(239,68,68,0.1)',
  },
  {
    labelKey: 'landing.okay',
    correct: true,
    srsRating: 3,
    color: 'var(--warning)',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    labelKey: 'landing.easy',
    correct: true,
    srsRating: 4,
    color: 'var(--success)',
    bg: 'rgba(16,185,129,0.1)',
  },
] as const;

/**
 * Режим обучения «Карточки».
 *
 * Большая 3D-карточка, переворачивается по клику или пробелу. На обратной
 * стороне три кнопки оценки (Сложно/Норм/Легко). Оценка отправляется
 * на сервер для интервального повторения (SM-2) и идёт в результаты.
 */
export function FlashcardMode({
  cards,
  deck,
  sessionId,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  // Индекс текущей карточки
  const [currentIdx, setCurrentIdx] = useState(0);
  // Перевернута ли карточка (показана обратная сторона)
  const [isFlipped, setIsFlipped] = useState(false);
  // Накопленные ответы за прохождение
  const [results, setResults] = useState<ReturnType<typeof okResult>[]>([]);

  const card = cards[currentIdx];

  /** Записать ответ и перейти к следующей карточке (или завершить режим). */
  const submitAnswer = (correct: boolean, srsRating: number) => {
    sendStudyAnswer(sessionId, card.id, correct, srsRating);
    const entry = correct
      ? okResult(card.id)
      : mistakeResult(card.id, card.term, card.definition);
    // Если карточку оценивали повторно — оставим только последнюю оценку
    const next = [...results.filter((r) => r.cardId !== card.id), entry];
    setResults(next);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIdx + 1 >= cards.length) onComplete(next);
      else setCurrentIdx((i) => i + 1);
    }, 200);
  };

  /** Перейти к предыдущей карточке без сохранения ответа. */
  const goToPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setIsFlipped(false);
    }
  };
  /** Перейти к следующей карточке без сохранения ответа. */
  const goToNext = () => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
      setIsFlipped(false);
    }
  };

  // Озвучить ту сторону карточки, которая сейчас показана пользователю
  useEffect(() => {
    speakEnglishIfPossible(speak, isFlipped ? card.definition : card.term);
  }, [isFlipped, card.term, card.definition, speak]);

  // Поддержка клавиатуры: пробел = переворот, ← → = листать или оценивать
  useFlashcardKeyboard({
    flipped: isFlipped,
    onFlip: () => setIsFlipped((f) => !f),
    onPrevCard: goToPrev,
    onNextCard: goToNext,
    onHard: () => submitAnswer(false, 1),
    onEasy: () => submitAnswer(true, 4),
  });

  return (
    <div className='mx-auto w-full max-w-[760px]'>
      <div className='flex items-center gap-4 max-[640px]:gap-2'>
        {/* Стрелка «назад» */}
        <button
          type='button'
          className={navArrow}
          onClick={goToPrev}
          disabled={currentIdx <= 0}
          aria-label={t('study.flashcard.prevCard')}
        >
          <ChevronLeft size={28} strokeWidth={2.25} aria-hidden />
        </button>

        <div className='flex min-w-0 flex-1 flex-col'>
          <ProgressBar idx={currentIdx} total={cards.length} showPercent />

          {/* Сама 3D-карточка с двумя сторонами */}
          <div className='mb-4'>
            <div className={cardScene} onClick={() => setIsFlipped((f) => !f)}>
              <div className={cn(cardInner, isFlipped && cardInnerFlipped)}>
                {/* Лицевая сторона */}
                <div className={cn(cardFace, cardFront)}>
                  <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
                    {t('study.flashcard.reveal', {
                      lang: studyCardFrontLang(deck, card),
                    })}
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
                    <div className='text-text3 mt-2 text-sm'>
                      {card.transcription}
                    </div>
                  )}
                  {card.example && (
                    <div className='text-text3 mt-3 text-sm italic'>
                      &ldquo;{card.example}&rdquo;
                    </div>
                  )}
                  <div className='text-text3 mt-auto pt-4 text-xs'>
                    {t('study.flashcard.flipHint')}
                  </div>
                </div>

                {/* Обратная сторона */}
                <div className={cn(cardFace, cardBack)}>
                  <div className='mb-3 text-xs tracking-[0.08em] uppercase opacity-80'>
                    {t('study.flashcard.translationLabel', {
                      lang: studyCardBackLang(deck, card),
                    })}
                  </div>
                  {(card.definitionImageUrl || card.termImageUrl) && (
                    <img
                      src={card.definitionImageUrl || card.termImageUrl || ''}
                      alt={card.definition}
                      className='mb-4 max-h-[120px] rounded-[12px] object-cover'
                    />
                  )}
                  <div className='font-display text-center text-[40px] leading-[1.1] font-bold'>
                    {card.definition}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className='text-text3 mb-4 text-center text-xs'>
            {t('study.flashcard.keyboardHint')}
          </p>

          {/* Кнопки оценки появляются только после переворота */}
          {isFlipped && (
            <div className='animate-fade grid grid-cols-3 gap-3 max-[640px]:grid-cols-1'>
              {ANSWER_OPTIONS.map(
                ({ labelKey, correct, srsRating, color, bg }) => {
                  const style: CSSProperties = {
                    background: bg,
                    border: `1px solid ${color}44`,
                    color,
                  };
                  return (
                    <button
                      key={labelKey}
                      type='button'
                      onClick={() => submitAnswer(correct, srsRating)}
                      className='cursor-pointer rounded-[14px] px-5 py-3 text-base font-semibold transition-transform duration-200 hover:-translate-y-0.5'
                      style={style}
                    >
                      {t(labelKey)}
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* Стрелка «вперёд» */}
        <button
          type='button'
          className={navArrow}
          onClick={goToNext}
          disabled={currentIdx >= cards.length - 1}
          aria-label={t('study.flashcard.nextCard')}
        >
          <ChevronRight size={28} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
