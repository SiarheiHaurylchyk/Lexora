import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shuffle, Timer, TimerOff } from 'lucide-react';

import { FlashcardAnswerButtons } from './FlashcardAnswerButtons';
import { FlashcardScene } from './FlashcardScene';
import { FlashcardSessionProgress } from './FlashcardSessionProgress';
import { FlashcardTimer } from './FlashcardTimer';
import type { StudyModeProps } from './types';

import { useFlashcardKeyboard } from '@/shared/hooks/useFlashcardKeyboard';
import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import type { StudyCard } from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

/** Секунд на карточку, когда включён таймер скорости. */
const TIMER_SECONDS_PER_CARD = 10;

/**
 * Одна карточка в очереди сессии.
 * `isRepeat` === true, если карточку хотя бы раз отметили «Ещё раз»
 * и она вернулась на повтор.
 */
interface QueuedCard {
  card: StudyCard;
  isRepeat: boolean;
}

/**
 * Режим «Flashcards» — очередь с повторами и опциональным таймером.
 *
 * Логика (как в Quizlet / Anki):
 * - Все карточки стартуют в очереди в исходном порядке.
 * - «Ещё раз» (Сложно) → карточка в КОНЕЦ очереди, вернётся снова.
 * - «Знаю» (Легко) → карточка навсегда убирается из очереди.
 * - Сессия заканчивается, когда очередь пуста.
 * - Карточки с повторами попадают в итоги как «нужно повторить».
 *
 * Доп. кнопки (справа сверху):
 * - 🔀 Shuffle — перемешать оставшуюся очередь.
 * - ⏱ Timer  — опциональный отсчёт 10 с; по истечении → авто «Ещё раз».
 */
export function FlashcardMode({
  cards,
  deck,
  sessionId,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  const totalOriginalCards = cards.length;

  // ── Очередь ───────────────────────────────────────────────────────────────
  const [cardQueue, setCardQueue] = useState<QueuedCard[]>(() =>
    cards.map((card) => ({ card, isRepeat: false })),
  );

  // ── Статистика сессии ─────────────────────────────────────────────────────
  const [masteredCount, setMasteredCount] = useState(0);
  // Id карточек, хотя бы раз отмеченных «Ещё раз» (для экрана итогов).
  const [hardCardIdSet, setHardCardIdSet] = useState<Set<number>>(
    () => new Set(),
  );
  // Сколько раз каждая карточка показывалась (с повторами) — для avg-attempts.
  const [attemptsPerCardId, setAttemptsPerCardId] = useState<
    Map<number, number>
  >(() => new Map());

  // ── UI-состояние ──────────────────────────────────────────────────────────
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  // true ~450 мс после «Ещё раз», чтобы проигралась CSS-анимация shake.
  const [isShaking, setIsShaking] = useState(false);
  // true — над карточкой показывается 10-секундный таймер.
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);

  // ── Производные значения ──────────────────────────────────────────────────
  const currentQueueItem = cardQueue[0];
  const currentCard = currentQueueItem?.card;
  const repeatQueueCount = cardQueue.filter((item) => item.isRepeat).length;

  const flipCard = () => setIsCardFlipped((wasFlipped) => !wasFlipped);

  /** Случайно перемешать оставшиеся карточки в очереди. */
  const reshuffleQueue = () => {
    setCardQueue((queue) => [...queue].sort(() => Math.random() - 0.5));
    setIsCardFlipped(false);
  };

  /**
   * Отметить текущую карточку «Ещё раз» — в конец очереди.
   *
   * @param withShake  false при автовызове (например, таймер),
   *                   чтобы анимация не играла на уже сменившейся карточке.
   */
  const markCardAsHard = (withShake = true) => {
    if (!currentCard) return;

    sendStudyAnswer(sessionId, currentCard.id, false, 1);

    // Запоминаем «сложную» карточку (для итогов) и увеличиваем счётчик попыток.
    setHardCardIdSet((prev) => {
      const updated = new Set(prev);
      updated.add(currentCard.id);
      return updated;
    });
    setAttemptsPerCardId((prev) => {
      const updated = new Map(prev);
      updated.set(currentCard.id, (updated.get(currentCard.id) ?? 1) + 1);
      return updated;
    });

    // Shake-анимация как тактильная обратная связь «ошибка».
    if (withShake) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
    }

    // С передней позиции — в конец очереди.
    setCardQueue((queue) => {
      const [head, ...tail] = queue;
      return [...tail, { ...head, isRepeat: true }];
    });

    setIsCardFlipped(false);
  };

  /**
   * Отметить «Знаю» — убрать карточку из очереди.
   * При пустой очереди вызывает `onComplete` (конец сессии).
   */
  const markCardAsEasy = () => {
    if (!currentCard) return;

    sendStudyAnswer(sessionId, currentCard.id, true, 4);

    setMasteredCount((prev) => prev + 1);

    const remainingQueue = cardQueue.slice(1);
    setIsCardFlipped(false);

    if (remainingQueue.length === 0) {
      // Итоги: «сложные» → needs review, остальные → correct.
      // Плюс число показов каждой карточки для avg-attempts.
      const finalResults = cards.map((originalCard) => {
        const attempts = attemptsPerCardId.get(originalCard.id) ?? 1;
        return hardCardIdSet.has(originalCard.id)
          ? {
              ...mistakeResult(
                originalCard.id,
                originalCard.term,
                originalCard.definition,
              ),
              attempts,
            }
          : { ...okResult(originalCard.id), attempts };
      });

      setTimeout(() => onComplete(finalResults), 200);
    } else {
      setCardQueue(remainingQueue);
    }
  };

  /**
   * Таймер скорости дошёл до нуля.
   * Карточка автоматически «Ещё раз» без shake-анимации.
   */
  const handleTimerExpire = () => {
    markCardAsHard(false);
  };

  // Озвучивать term или definition при смене видимой стороны.
  useEffect(() => {
    if (!currentCard) return;
    const textToSpeak = isCardFlipped
      ? currentCard.definition
      : currentCard.term;
    speakEnglishIfPossible(speak, textToSpeak);
  }, [isCardFlipped, currentCard?.term, currentCard?.definition, speak]);

  useFlashcardKeyboard({
    flipped: isCardFlipped,
    onFlip: flipCard,
    onHard: () => markCardAsHard(),
    onEasy: markCardAsEasy,
  });

  if (!currentCard) return null;

  return (
    <div className='mx-auto w-full max-w-[760px]'>
      {/* ── Progress row + control buttons ─────────────────────────────── */}
      <div className='mb-5 flex items-center gap-2'>
        <FlashcardSessionProgress
          totalOriginalCards={totalOriginalCards}
          masteredCount={masteredCount}
          repeatQueueCount={repeatQueueCount}
          className='min-w-0 flex-1'
        />

        {/* Shuffle button */}
        <button
          type='button'
          title={t('study.flashcard.shuffle')}
          className='btn btn-ghost btn-sm shrink-0 px-2'
          onClick={reshuffleQueue}
        >
          <Shuffle size={16} aria-hidden />
        </button>

        {/* Speed-timer toggle */}
        <button
          type='button'
          title={
            isTimerEnabled
              ? t('study.flashcard.timerOff')
              : t('study.flashcard.timerOn')
          }
          className={cn(
            'btn btn-sm shrink-0 px-2',
            isTimerEnabled ? 'btn-primary' : 'btn-ghost',
          )}
          onClick={() => setIsTimerEnabled((on) => !on)}
        >
          {isTimerEnabled ? (
            <TimerOff size={16} aria-hidden />
          ) : (
            <Timer size={16} aria-hidden />
          )}
        </button>
      </div>

      {/* ── Speed timer bar ─────────────────────────────────────────────── */}
      {isTimerEnabled && (
        <FlashcardTimer
          secondsTotal={TIMER_SECONDS_PER_CARD}
          isRunning={!isCardFlipped && !isShaking}
          resetToken={currentCard.id}
          onTimeUp={handleTimerExpire}
        />
      )}

      {/* ── 3D flip card ────────────────────────────────────────────────── */}
      <div className='mb-4'>
        <FlashcardScene
          card={currentCard}
          deck={deck}
          isFlipped={isCardFlipped}
          isRepeat={currentQueueItem.isRepeat}
          isShaking={isShaking}
          onFlip={flipCard}
        />
      </div>

      <p className='text-text3 mb-4 text-center text-xs'>
        {t('study.flashcard.keyboardHint')}
      </p>

      {/* ── Answer buttons (visible only after flip) ─────────────────── */}
      {isCardFlipped && (
        <FlashcardAnswerButtons
          onHard={() => markCardAsHard()}
          onEasy={markCardAsEasy}
        />
      )}
    </div>
  );
}
