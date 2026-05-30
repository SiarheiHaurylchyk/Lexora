import type { DeckItem } from '../api/types';

/** Canonical CEFR bands shown in the Materials catalog. */
export const CEFR_LEVEL_CODES = [
  'A0',
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
] as const;

export type CefrLevelCode = (typeof CEFR_LEVEL_CODES)[number];
export type CefrFilter = 'all' | CefrLevelCode | 'OTHER';

export type CatalogSource = 'platform' | 'community';

/** i18n key under `cefr.{code}.title` */
export function cefrTitleKey(code: CefrLevelCode | 'OTHER'): string {
  return code === 'OTHER' ? 'cefr.OTHER.title' : `cefr.${code}.title`;
}

export function cefrSubtitleKey(code: CefrLevelCode | 'OTHER'): string {
  return code === 'OTHER' ? 'cefr.OTHER.subtitle' : `cefr.${code}.subtitle`;
}

/** Normalize stored values (A-1, a1, B2+) to A1, B2, … */
export function normalizeCefrLevel(raw?: string | null): CefrLevelCode | null {
  if (!raw?.trim()) return null;
  const compact = raw.trim().toUpperCase().replace(/[-\s]/g, '');
  const base = compact.endsWith('+') ? compact.slice(0, -1) : compact;
  if ((CEFR_LEVEL_CODES as readonly string[]).includes(base)) {
    return base as CefrLevelCode;
  }
  return null;
}

export function deckCefrBucket(deck: DeckItem): CefrLevelCode | 'OTHER' {
  return normalizeCefrLevel(deck.cefrLevel) ?? 'OTHER';
}

/** Decks published by Lexora (ADMIN owner). */
export function isPlatformDeck(deck: DeckItem): boolean {
  return deck.owner?.role === 'ADMIN';
}

export interface CatalogLevelGroup {
  level: CefrLevelCode | 'OTHER';
  decks: DeckItem[];
}

export interface CatalogSourceSection {
  source: CatalogSource;
  levels: CatalogLevelGroup[];
}

const LEVEL_ORDER: (CefrLevelCode | 'OTHER')[] = [...CEFR_LEVEL_CODES, 'OTHER'];

function bucketDecks(decks: DeckItem[]): CatalogLevelGroup[] {
  const map = new Map<CefrLevelCode | 'OTHER', DeckItem[]>();
  for (const deck of decks) {
    const key = deckCefrBucket(deck);
    const list = map.get(key) ?? [];
    list.push(deck);
    map.set(key, list);
  }
  return LEVEL_ORDER.filter((l) => map.has(l)).map((level) => ({
    level,
    decks: map.get(level)!,
  }));
}

/** Split catalog into platform + community sections, each grouped by CEFR. */
export function groupCatalogByLevel(decks: DeckItem[]): CatalogSourceSection[] {
  const platform = decks.filter(isPlatformDeck);
  const community = decks.filter((d) => !isPlatformDeck(d));
  const sections: CatalogSourceSection[] = [];
  if (platform.length > 0) {
    sections.push({ source: 'platform', levels: bucketDecks(platform) });
  }
  if (community.length > 0) {
    sections.push({ source: 'community', levels: bucketDecks(community) });
  }
  return sections;
}

export function formatCefrBadge(
  code: CefrLevelCode | 'OTHER' | null | undefined,
  t: (key: string) => string,
): string {
  if (!code || code === 'OTHER') return t('cefr.OTHER.short');
  return t(`cefr.${code}.short`);
}
