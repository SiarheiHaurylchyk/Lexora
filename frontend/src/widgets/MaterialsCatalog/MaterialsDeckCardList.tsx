import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { MaterialsDeckActions } from './MaterialsDeckActions';
import type { MaterialsDeckLabels } from './materialsDeckLabels';
import type {
  MaterialsDeckActionHandlers,
  MaterialsDeckContext,
} from './materialsDeckTypes';

import type { DeckItem } from '@/shared/api/types';

interface MaterialsDeckCardListProps extends MaterialsDeckActionHandlers {
  deck: DeckItem;
  accentColor: string;
  labels: MaterialsDeckLabels;
  context: MaterialsDeckContext;
  isMine: boolean;
  isSaved: boolean;
  canTeach: boolean;
  classLinkOk: boolean;
}

const listRowClasses = tw`border-border bg-surface hover:border-border2 flex cursor-pointer items-center gap-4 rounded-[14px] border p-3 transition-colors duration-200`;

/** List (single-row) layout of one deck in the materials catalog. */
export function MaterialsDeckCardList({
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
}: MaterialsDeckCardListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const coverStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
  };
  const cefrSuffix = labels.cefrLabel ? ` · ${labels.cefrLabel}` : '';

  return (
    <div
      className={listRowClasses}
      onClick={() => navigate(`/decks/${deck.id}`)}
    >
      <div
        className='flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[12px] text-[28px]'
        style={coverStyle}
      >
        {deck.emoji || '📚'}
      </div>

      <div className='min-w-0 flex-1'>
        <h3 className='m-0 mb-0.5 text-base font-semibold'>{deck.title}</h3>
        <div className='text-text3 text-xs'>
          {labels.sourceLabel} · {labels.priceLabel}
          {cefrSuffix}
        </div>
        <div className='text-text3 text-xs'>
          {deck.sourceLanguage} → {deck.targetLanguage} · {deck.cardCount}{' '}
          {t('common.cards')}
        </div>
      </div>

      <div
        className='flex flex-wrap gap-2'
        onClick={(event) => event.stopPropagation()}
      >
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
