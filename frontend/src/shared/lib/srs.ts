import type { CardItem, CardSrsItem, CardSrsStatus } from '../api/types';

/** Фильтры списка карточек на странице колоды. */
export type CardSrsFilter = 'all' | 'due' | 'new' | 'learning' | 'mastered';

export function buildSrsMap(items: CardSrsItem[]): Map<number, CardSrsItem> {
  return new Map(items.map((item) => [item.cardId, item]));
}

export function matchesSrsFilter(
  cardId: number,
  filter: CardSrsFilter,
  srsMap: Map<number, CardSrsItem>,
): boolean {
  if (filter === 'all') return true;
  const item = srsMap.get(cardId);
  const status: CardSrsStatus = item?.status ?? 'NOT_STARTED';
  if (filter === 'due') return item?.due === true;
  if (filter === 'new') return status === 'NOT_STARTED';
  if (filter === 'mastered') return status === 'MASTERED';
  if (filter === 'learning') {
    return status === 'LEARNING' || status === 'FAMILIAR' || status === 'KNOWN';
  }
  return true;
}

/** id карточек к повторению в колоде. */
export function dueCardIds(items: CardSrsItem[]): Set<number> {
  return new Set(items.filter((i) => i.due).map((i) => i.cardId));
}

/** Преобразовать due-review row в CardItem для режимов обучения. */
export function dueReviewToCardItems(
  rows: Array<{
    cardId: number;
    term: string;
    definition: string;
    example?: string;
    transcription?: string;
    termImageUrl?: string | null;
    definitionImageUrl?: string | null;
  }>,
): CardItem[] {
  return rows.map((row) => ({
    id: row.cardId,
    term: row.term,
    definition: row.definition,
    example: row.example,
    transcription: row.transcription,
    termImageUrl: row.termImageUrl,
    definitionImageUrl: row.definitionImageUrl,
  }));
}

export const SRS_STATUS_LABEL_KEY: Record<CardSrsStatus, string> = {
  NOT_STARTED: 'srs.status.new',
  LEARNING: 'srs.status.learning',
  FAMILIAR: 'srs.status.familiar',
  KNOWN: 'srs.status.known',
  MASTERED: 'srs.status.mastered',
};

export const SRS_STATUS_CLASS: Record<CardSrsStatus, string> = {
  NOT_STARTED: 'bg-bg4 text-text3',
  LEARNING: 'bg-warning-dim text-warning',
  FAMILIAR: 'bg-brand/15 text-brand-light',
  KNOWN: 'bg-accent/15 text-accent',
  MASTERED: 'bg-success-dim text-success',
};
