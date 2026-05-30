import type { MouseEvent } from 'react';

import type { DeckItem } from '@/shared/api/types';

/** Where the deck card appears: public catalog or user's personal library. */
export type MaterialsDeckContext =
  | 'catalog'
  | 'personalOwned'
  | 'personalSaved';

/**
 * The four callbacks needed by the action-button row. They are passed
 * straight through from the parent page (MaterialsPage) and used by both
 * grid and list variants.
 */
export interface MaterialsDeckActionHandlers {
  onSave: (event: MouseEvent, deck: DeckItem) => void;
  onUnsave: (event: MouseEvent, deckId: number) => void;
  onShare: (event: MouseEvent, deckId: number) => void;
  onOpenListing: (deck: DeckItem) => void;
}
