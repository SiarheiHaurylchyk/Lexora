import type { TFunction } from 'i18next';

import type { DeckItem } from '@/shared/api/types';
import {
  formatCefrBadge,
  isPlatformDeck,
  normalizeCefrLevel,
} from '@/shared/lib/cefrLevels';

/** Labels and computed flags shown on one MaterialsDeckCard. */
export interface MaterialsDeckLabels {
  /** Localized price text ("Free" or "$1.99"). */
  priceLabel: string;
  /** Localized author/source ("Lexora", "You", "Community"). */
  sourceLabel: string;
  /** Localized CEFR badge text (e.g. "A1") or `null` if not set. */
  cefrLabel: string | null;
  /** True when the deck has a non-zero price (used for badge colors). */
  isPaid: boolean;
}

function formatPriceAmount(priceCents: number): string {
  const dollars = priceCents / 100;
  const isWholeDollars = dollars % 1 === 0;
  return isWholeDollars ? String(Math.round(dollars)) : dollars.toFixed(2);
}

/** Build the small labels (price, source, CEFR) shown on one deck card. */
export function buildMaterialsDeckLabels(
  deck: DeckItem,
  isMine: boolean,
  t: TFunction,
): MaterialsDeckLabels {
  const priceCents = deck.catalogPriceCents ?? 0;
  const isPaid = priceCents > 0;

  const priceLabel = isPaid
    ? t('materials.priceUsd', { amount: formatPriceAmount(priceCents) })
    : t('materials.free');

  const sourceLabel = isPlatformDeck(deck)
    ? t('materials.sourcePlatform')
    : isMine
      ? t('materials.sourceYours')
      : t('materials.sourceCommunity');

  const cefrCode = normalizeCefrLevel(deck.cefrLevel);
  const cefrLabel = deck.cefrLevel?.trim()
    ? formatCefrBadge(cefrCode ?? 'OTHER', t)
    : null;

  return { priceLabel, sourceLabel, cefrLabel, isPaid };
}
