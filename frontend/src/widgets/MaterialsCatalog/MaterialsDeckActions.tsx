import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type {
  MaterialsDeckActionHandlers,
  MaterialsDeckContext,
} from './materialsDeckTypes';

import type { DeckItem } from '@/shared/api/types';

interface MaterialsDeckActionsProps extends MaterialsDeckActionHandlers {
  deck: DeckItem;
  context: MaterialsDeckContext;
  isMine: boolean;
  isSaved: boolean;
  canTeach: boolean;
  classLinkOk: boolean;
}

/**
 * Row of action buttons under one deck card: open, study, save/remove,
 * share with student, edit listing. Which buttons appear depends on the
 * context (catalog / personal library) and on the user's role.
 */
export function MaterialsDeckActions({
  deck,
  context,
  isMine,
  isSaved,
  canTeach,
  classLinkOk,
  onSave,
  onUnsave,
  onShare,
  onOpenListing,
}: MaterialsDeckActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const showSaveOrInLibrary = canTeach && context === 'catalog' && !isMine;
  const showRemoveFromLibrary = canTeach && context === 'personalSaved';
  const showShareWithStudent =
    canTeach &&
    classLinkOk &&
    (context === 'catalog' ||
      context === 'personalSaved' ||
      context === 'personalOwned');
  const showCatalogListing = canTeach && context === 'personalOwned';
  const hasCards = deck.cardCount > 0;

  return (
    <div
      className='mt-2.5 flex flex-wrap gap-2'
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type='button'
        className='btn btn-secondary btn-sm'
        onClick={() => navigate(`/decks/${deck.id}`)}
      >
        {t('common.view')}
      </button>

      {hasCards && (
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={() => navigate(`/decks/${deck.id}/study/FLASHCARD`)}
        >
          {t('materials.study')}
        </button>
      )}

      {showSaveOrInLibrary && (
        <button
          type='button'
          className={cn(
            'btn btn-sm',
            isSaved ? 'btn-secondary' : 'btn-primary',
          )}
          onClick={(event) =>
            isSaved ? onUnsave(event, deck.id) : onSave(event, deck)
          }
        >
          {isSaved ? t('materials.inLibrary') : t('materials.addToLibrary')}
        </button>
      )}

      {showRemoveFromLibrary && (
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={(event) => onUnsave(event, deck.id)}
        >
          {t('materials.removeFromLibrary')}
        </button>
      )}

      {showShareWithStudent && (
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={(event) => onShare(event, deck.id)}
        >
          {t('materials.shareWithStudent')}
        </button>
      )}

      {showCatalogListing && (
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={() => onOpenListing(deck)}
        >
          {t('materials.catalogListing')}
        </button>
      )}
    </div>
  );
}
