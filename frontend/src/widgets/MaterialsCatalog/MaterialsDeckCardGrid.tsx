import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { MaterialsDeckActions } from './MaterialsDeckActions';
import { MaterialsDeckBadges } from './MaterialsDeckBadges';
import type { MaterialsDeckLabels } from './materialsDeckLabels';
import type {
  MaterialsDeckActionHandlers,
  MaterialsDeckContext,
} from './materialsDeckTypes';

import type { DeckItem } from '@/shared/api/types';

interface MaterialsDeckCardGridProps extends MaterialsDeckActionHandlers {
  deck: DeckItem;
  accentColor: string;
  labels: MaterialsDeckLabels;
  context: MaterialsDeckContext;
  isMine: boolean;
  isSaved: boolean;
  canTeach: boolean;
  classLinkOk: boolean;
}

const gridCardClasses = tw`flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-border bg-surface transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]`;

/** Grid (tile) layout of one deck in the materials catalog. */
export function MaterialsDeckCardGrid({
  deck,
  accentColor,
  labels,
  context,
  isMine,
  isSaved,
  canTeach,
  classLinkOk,
  onSave,
  onUnsave,
  onShare,
  onOpenListing,
}: MaterialsDeckCardGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const coverStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
  };
  const showOwnedListingNotice =
    deck.listedInMaterialsCatalog && context === 'personalOwned';

  return (
    <div
      className={gridCardClasses}
      onClick={() => navigate(`/decks/${deck.id}`)}
    >
      <div
        className='relative flex h-[120px] items-center justify-center'
        style={coverStyle}
      >
        <span className='text-[44px]'>{deck.emoji || '📚'}</span>
        <MaterialsDeckBadges
          cefrLabel={labels.cefrLabel}
          priceLabel={labels.priceLabel}
          isPaid={labels.isPaid}
        />
      </div>

      <div className='flex flex-1 flex-col p-4'>
        <h3 className='font-display m-0 mb-1 text-base font-semibold'>
          {deck.title}
        </h3>
        <div className='text-text3 text-xs'>{labels.sourceLabel}</div>
        <div className='text-text3 mt-1 text-xs'>
          {deck.sourceLanguage} → {deck.targetLanguage} · {deck.cardCount}{' '}
          {t('common.cards')}
        </div>

        {showOwnedListingNotice && (
          <div className='text-text3 mt-1 text-xs'>
            {t('materials.listedInCatalog')}
          </div>
        )}

        <MaterialsDeckActions
          deck={deck}
          context={context}
          isMine={isMine}
          isSaved={isSaved}
          canTeach={canTeach}
          classLinkOk={classLinkOk}
          onSave={onSave}
          onUnsave={onUnsave}
          onShare={onShare}
          onOpenListing={onOpenListing}
        />
      </div>
    </div>
  );
}
