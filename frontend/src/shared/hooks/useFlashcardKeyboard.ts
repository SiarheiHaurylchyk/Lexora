import { useEffect } from 'react';

interface Options {
  /** Карточка сейчас показывает обратную сторону. */
  flipped: boolean;
  /** Перевернуть карточку (Space). */
  onFlip: () => void;
  /**
   * ← Стрелка после переворота — отметить как «Сложно».
   * Карточка попадёт в конец очереди повторов.
   */
  onHard: () => void;
  /**
   * → Стрелка после переворота — отметить как «Знаю».
   * Карточка убирается из очереди на эту сессию.
   */
  onEasy: () => void;
}

/**
 * Горячие клавиши для режима Flashcard.
 *
 * - Space   → перевернуть карточку.
 * - ←       → (после переворота) «Сложно» / «Ещё раз».
 * - →       → (после переворота) «Знаю» / «Легко».
 *
 * Нажатия внутри INPUT и TEXTAREA игнорируются, чтобы не мешать вводу на странице.
 */
export function useFlashcardKeyboard({
  flipped,
  onFlip,
  onHard,
  onEasy,
}: Options): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const pressedInsideInput =
        (e.target as HTMLElement | null)?.tagName === 'INPUT' ||
        (e.target as HTMLElement | null)?.tagName === 'TEXTAREA';

      if (pressedInsideInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
        return;
      }

      if (e.code === 'ArrowLeft' && flipped) {
        e.preventDefault();
        onHard();
        return;
      }

      if (e.code === 'ArrowRight' && flipped) {
        e.preventDefault();
        onEasy();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipped, onFlip, onHard, onEasy]);
}
