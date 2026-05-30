import type { CardItem, DeckItem } from '../api/types';

/** Режимы обучения, доступные на странице колоды и в объединённой тренировке. */
export const STUDY_MODE_KEYS = [
  'FLASHCARD',
  'LEARN',
  'MATCH',
  'SPELL',
  'DRAG',
  'SCRAMBLE',
  'GRAVITY',
  'EXAM',
] as const;

export type StudyModeKey = (typeof STUDY_MODE_KEYS)[number];

/** Разобрать `?decks=1,2,3` в список уникальных id. */
export function parseDeckIdsParam(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  const ids = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
  return [...new Set(ids)];
}

/** У всех колод одинаковая пара языков (en → ru и т.д.). */
export function decksShareLanguages(decks: DeckItem[]): boolean {
  if (decks.length === 0) return false;
  const first = decks[0];
  return decks.every(
    (d) =>
      d.sourceLanguage === first.sourceLanguage &&
      d.targetLanguage === first.targetLanguage,
  );
}

/** Собрать карточки из нескольких колод в один список. */
export function mergeDeckCards(decks: DeckItem[]): CardItem[] {
  return decks.flatMap((d) => d.cards ?? []);
}

/**
 * «Виртуальная» колода для UI и режимов обучения.
 * Берём языки и оформление первой колоды, заголовок — через « + ».
 */
export function buildVirtualDeck(decks: DeckItem[]): DeckItem {
  const cards = mergeDeckCards(decks);
  const first = decks[0];
  return {
    ...first,
    title: decks.map((d) => d.title).join(' + '),
    cardCount: cards.length,
    cards,
  };
}
