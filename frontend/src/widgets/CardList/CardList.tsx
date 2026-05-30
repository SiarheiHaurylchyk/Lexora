import { useTranslation } from 'react-i18next';

import { CardListEmptyState } from './CardListEmptyState';
import { CardListHeader } from './CardListHeader';
import { CardListItem } from './CardListItem';
import type { CardForm } from './types';

interface CardListProps {
  cards: CardForm[];
  /** Index of the card whose inline editor is open; `null` = all collapsed. */
  activeCardIdx: number | null;
  sourceLanguage: string;
  targetLanguage: string;
  /** Create an empty card and open its editor. */
  onAdd: () => void;
  /** Open the inline editor for the card at the given index. */
  onOpen: (cardIndex: number) => Promise<void>;
  /** Close the editor for the card at the given index (with silent autosave). */
  onClose: (cardIndex: number) => Promise<void>;
  /** Save the card on the server; resolves to `true` on success. */
  onSave: (cardIndex: number) => Promise<boolean>;
  /** Delete the card (on the server and from the local list). */
  onDelete: (cardIndex: number) => void;
  /** Change one field of the card at the given index. */
  onUpdate: (
    cardIndex: number,
    fieldName: keyof CardForm,
    newValue: string,
  ) => void;
  /** Show the bulk import side panel. */
  onShowBulk: () => void;
}

/**
 * Widget "Deck cards list".
 *
 * Each card is shown as one row (CardRow). Clicking a row opens the full
 * inline editor (CardEditorForm). At any moment only one card can be
 * "active" — the parent controls this via `activeCardIdx`.
 */
export function CardList({
  cards,
  activeCardIdx,
  sourceLanguage,
  targetLanguage,
  onAdd,
  onOpen,
  onClose,
  onSave,
  onDelete,
  onUpdate,
  onShowBulk,
}: CardListProps) {
  const { t } = useTranslation();
  const hasNoCards = cards.length === 0;

  return (
    <div>
      <CardListHeader
        cardCount={cards.length}
        onAddCard={onAdd}
        onShowBulkImport={onShowBulk}
      />

      {hasNoCards ? (
        <CardListEmptyState
          onAddFirstCard={onAdd}
          onShowBulkImport={onShowBulk}
        />
      ) : (
        <div className='flex flex-col gap-2.5'>
          {cards.map((card, cardIndex) => (
            <CardListItem
              key={cardIndex}
              card={card}
              isOpenForEditing={activeCardIdx === cardIndex}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onOpen={() => void onOpen(cardIndex)}
              onClose={() => onClose(cardIndex)}
              onSave={() => onSave(cardIndex)}
              onDelete={() => onDelete(cardIndex)}
              onUpdate={(fieldName, newValue) =>
                onUpdate(cardIndex, fieldName, newValue)
              }
            />
          ))}

          <button
            type='button'
            className='btn btn-secondary mt-1 justify-center'
            onClick={onAdd}
          >
            {t('editDeck.addAnother')}
          </button>
        </div>
      )}
    </div>
  );
}
