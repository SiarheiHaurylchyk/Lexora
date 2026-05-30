import { useTranslation } from 'react-i18next';

import { MaterialsDeckCardGrid } from './MaterialsDeckCardGrid';
import { MaterialsDeckCardList } from './MaterialsDeckCardList';
import { buildMaterialsDeckLabels } from './materialsDeckLabels';
import type {
  MaterialsDeckActionHandlers,
  MaterialsDeckContext,
} from './materialsDeckTypes';

import type { DeckItem } from '@/shared/api/types';

/** Default accent color shown when a deck has no `coverColor`. */
const DEFAULT_DECK_ACCENT_COLOR = '#7C3AED';

export type { MaterialsDeckContext } from './materialsDeckTypes';

export interface MaterialsDeckCardProps extends MaterialsDeckActionHandlers {
  deck: DeckItem;
  /** Where this card is rendered (catalog vs. personal library tabs). */
  ctx: MaterialsDeckContext;
  /** Visual variant: grid (tile) or list (single row). */
  view: 'grid' | 'list';
  /** Id of the current user, used to detect "this is your own deck". */
  myUserId?: number;
  /** True for teacher accounts: enables save/share/library buttons. */
  canTeach: boolean;
  /** True when the share-with-student flow is allowed. */
  classLinkOk: boolean;
  /** True when the deck is already in the user's saved library. */
  isSaved: boolean;
}

/**
 * One deck card in the materials catalog or personal library.
 *
 * The component itself only:
 *   1) computes derived flags (accent color, isMine, localized labels);
 *   2) picks the visual variant — grid or list — and forwards everything.
 *
 * All real layout lives in MaterialsDeckCardGrid / MaterialsDeckCardList.
 */
export function MaterialsDeckCard({
  deck,
  ctx,
  view,
  myUserId,
  canTeach,
  classLinkOk,
  isSaved,
  onSave,
  onUnsave,
  onShare,
  onOpenListing,
}: MaterialsDeckCardProps) {
  const { t } = useTranslation();

  const accentColor = deck.coverColor || DEFAULT_DECK_ACCENT_COLOR;
  const isMine = myUserId != null && deck.owner?.id === myUserId;
  const labels = buildMaterialsDeckLabels(deck, isMine, t);

  const sharedProps = {
    deck,
    accentColor,
    labels,
    context: ctx,
    isMine,
    isSaved,
    canTeach,
    classLinkOk,
    onSave,
    onUnsave,
    onShare,
    onOpenListing,
  };

  if (view === 'grid') {
    return <MaterialsDeckCardGrid {...sharedProps} />;
  }
  return <MaterialsDeckCardList {...sharedProps} />;
}
