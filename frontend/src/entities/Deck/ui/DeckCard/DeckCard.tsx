import { type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  buildDeckCoverStripStyle,
  pickDeckAccentColor,
} from './deckAccentStyles';
import { DeckCardHeader } from './DeckCardHeader';
import { DeckCardMenu } from './DeckCardMenu';
import { DeckCardMeta } from './DeckCardMeta';
import { DeckCardStudyButtons } from './DeckCardStudyButtons';
import { useDeleteDeck } from './useDeleteDeck';

import type { DeckItem } from '@/shared/api/types';

export interface DeckCardProps {
  deck: DeckItem;
  /** Called after a successful deck delete so the parent list can refresh. */
  onDeleted?: () => void;
  /** Hide the "⋮" menu (e.g. when browsing a deck owned by someone else). */
  readonly?: boolean;
}

const deckCardClasses = tw`group relative cursor-pointer overflow-hidden rounded-[20px] border border-border bg-surface transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]`;

/**
 * Deck card shown in lists like "My decks" or "Saved decks".
 *
 * Clicking anywhere on the card opens the deck page. Owner-only actions
 * (View / Edit / Delete) live in the small "⋮" menu in the corner. Owners
 * also see three quick-study buttons at the bottom.
 */
export function DeckCard({ deck, onDeleted, readonly }: DeckCardProps) {
  const navigate = useNavigate();
  const accentColor = pickDeckAccentColor(deck.coverColor);
  const hasCards = deck.cardCount > 0;
  const showOwnerControls = !readonly;

  const { runDelete, isDeleting } = useDeleteDeck({
    deckId: deck.id,
    deckTitle: deck.title,
    onDeleted,
  });

  const openDeck = () => navigate(`/decks/${deck.id}`);

  const handleDeleteClick = (event: MouseEvent) => {
    event.stopPropagation();
    void runDelete();
  };

  const highlightBorderOnHover = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.borderColor = accentColor;
  };
  const resetBorderOnLeave = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.borderColor = '';
  };

  return (
    <div
      className={deckCardClasses}
      onClick={openDeck}
      onMouseEnter={highlightBorderOnHover}
      onMouseLeave={resetBorderOnLeave}
    >
      <div className='h-1.5' style={buildDeckCoverStripStyle(accentColor)} />

      <div className='px-5 pt-5 pb-4'>
        <div className='mb-3 flex items-start justify-between'>
          <DeckCardHeader
            title={deck.title}
            emoji={deck.emoji}
            sourceLanguage={deck.sourceLanguage}
            targetLanguage={deck.targetLanguage}
            accentColor={accentColor}
          />

          {showOwnerControls && (
            <DeckCardMenu
              deckId={deck.id}
              isDeleting={isDeleting}
              onDelete={handleDeleteClick}
            />
          )}
        </div>

        {deck.description && (
          <p className='text-text3 mb-3.5 line-clamp-2 text-[13px]'>
            {deck.description}
          </p>
        )}

        <DeckCardMeta
          cardCount={deck.cardCount}
          studyCount={deck.studyCount}
          visibility={deck.visibility}
        />

        {hasCards && <DeckCardStudyButtons deckId={deck.id} />}
      </div>
    </div>
  );
}
