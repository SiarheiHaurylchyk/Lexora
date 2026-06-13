import { useEffect, useRef, useState } from 'react';

interface FlashcardTimerProps {
  /** Секунд на каждую карточку. */
  secondsTotal: number;
  /**
   * true, пока таймер должен идти.
   * false после переворота — неограниченное время на чтение.
   */
  isRunning: boolean;
  /**
   * Меняется при каждой новой карточке — таймер сбрасывается.
   * Проще всего передать id текущей карточки.
   */
  resetToken: number;
  /** Вызывается, когда отсчёт доходит до нуля. */
  onTimeUp: () => void;
}

/**
 * Тонкая полоска обратного отсчёта над карточкой.
 *
 * Считает от `secondsTotal` до 0, пока `isRunning` === true.
 * Сбрасывается при смене `resetToken` (новая карточка).
 * По истечении времени вызывается `onTimeUp`, полоска остаётся на 0.
 *
 * Последние 3 секунды — красная пульсация для срочности.
 */
export function FlashcardTimer({
  secondsTotal,
  isRunning,
  resetToken,
  onTimeUp,
}: FlashcardTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(secondsTotal);

  // Стабильный ref, чтобы эффект таймаута не зависел от onTimeUp.
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Сброс при смене карточки.
  useEffect(() => {
    setSecondsLeft(secondsTotal);
  }, [resetToken, secondsTotal]);

  // Тик раз в секунду, пока таймер активен.
  useEffect(() => {
    if (!isRunning) return;
    const tick = setInterval(
      () => setSecondsLeft((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearInterval(tick);
  }, [isRunning, resetToken]); // resetToken перезапускает интервал на новой карточке

  // Колбэк в момент, когда таймер дошёл до нуля.
  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      onTimeUpRef.current();
    }
  }, [secondsLeft, isRunning]);

  const percentLeft = secondsTotal > 0 ? (secondsLeft / secondsTotal) * 100 : 0;

  // Предупреждение в последние 3 секунды.
  const isUrgent = secondsLeft > 0 && secondsLeft <= 3;

  return (
    <div className='mb-3 flex items-center gap-3'>
      <span
        className={cn(
          'w-6 shrink-0 text-right text-xs font-bold tabular-nums',
          isUrgent ? 'text-danger animate-timer-pulse' : 'text-text3',
        )}
      >
        {secondsLeft}
      </span>

      <div className='bg-bg4 h-1.5 flex-1 overflow-hidden rounded-full'>
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-[980ms] ease-linear',
            isUrgent ? 'bg-danger' : 'bg-brand',
          )}
          style={{ width: `${percentLeft}%` }}
        />
      </div>

      <span className='text-text3 shrink-0 text-xs'>⏱</span>
    </div>
  );
}
