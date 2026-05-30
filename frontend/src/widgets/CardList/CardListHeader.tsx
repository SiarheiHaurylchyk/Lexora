import { useTranslation } from 'react-i18next';

interface CardListHeaderProps {
  cardCount: number;
  onAddCard: () => void;
  onShowBulkImport: () => void;
}

/**
 * Top row of the deck editor's card list: section title and two buttons
 * — "bulk import" and "add card".
 */
export function CardListHeader({
  cardCount,
  onAddCard,
  onShowBulkImport,
}: CardListHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className='mb-4 flex flex-wrap items-center justify-between gap-2.5'>
      <h2 className='font-display m-0 text-lg'>
        {t('editDeck.cardsTitle', { count: cardCount })}
      </h2>
      <div className='flex gap-2.5'>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={onShowBulkImport}
        >
          {t('editDeck.bulkImport')}
        </button>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={onAddCard}
        >
          {t('editDeck.addCard')}
        </button>
      </div>
    </div>
  );
}
