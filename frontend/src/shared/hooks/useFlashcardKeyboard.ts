import { useEffect } from 'react';

interface Options {
  /** Перевернута ли карточка — от этого зависит поведение стрелок. */
  flipped: boolean;
  /** Перевернуть карточку (Space). */
  onFlip: () => void;
  /** Стрелка влево, когда карточка НЕ перевернута: предыдущая карточка. */
  onPrevCard: () => void;
  /** Стрелка вправо, когда карточка НЕ перевернута: следующая карточка. */
  onNextCard: () => void;
  /** Стрелка влево, когда карточка перевернута: оценка «Сложно». */
  onHard: () => void;
  /** Стрелка вправо, когда карточка перевернута: оценка «Легко». */
  onEasy: () => void;
}

/**
 * Хук «горячие клавиши» для режима обучения «Карточки».
 *
 * - Пробел — перевернуть карточку.
 * - ← → — листать карточки (если не перевернута) или оценивать (если перевернута).
 *
 * Игнорирует клавиши, нажатые внутри INPUT/TEXTAREA — чтобы не мешать
 * пользователю вводить текст в других местах страницы.
 */
export function useFlashcardKeyboard({
  flipped,
  onFlip,
  onPrevCard,
  onNextCard,
  onHard,
  onEasy,
}: Options): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      // Не перехватывать ввод в полях формы
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
        return;
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (flipped) onHard();
        else onPrevCard();
        return;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (flipped) onEasy();
        else onNextCard();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, onFlip, onPrevCard, onNextCard, onHard, onEasy]);
}
