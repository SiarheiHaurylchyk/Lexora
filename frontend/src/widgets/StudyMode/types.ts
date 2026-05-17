import type { CardItem, DeckItem } from '@/shared/api/types';
import type { StudyCard, StudyDir } from '@/shared/lib/studyPrompts';
import type { ModeResult } from '@/shared/lib/studyResults';

/**
 * Общие пропсы для любого режима обучения (Flashcard, Learn, Match и т.д.).
 * Каждый режим получает один и тот же набор данных, чтобы их можно было
 * подменять друг другом из StudyPage без изменения родителя.
 */
export interface StudyModeProps {
  /** Карточки с учётом направления (term/definition уже могут быть переставлены). */
  cards: StudyCard[];
  /** Исходный порядок карточек с сервера (нужен для spell, exam и т.д.). */
  rawCards: CardItem[];
  /** Текущая колода — берём из неё языки и заголовок. */
  deck: DeckItem;
  /** id серверной сессии обучения; null — пока не создана. */
  sessionId: number | null;
  /** Вызывается, когда режим полностью пройден. */
  onComplete: (results: ModeResult[]) => void;
  /** Направление: forward — термин→перевод, reverse — наоборот, mixed — смешанно. */
  dir: StudyDir;
}
