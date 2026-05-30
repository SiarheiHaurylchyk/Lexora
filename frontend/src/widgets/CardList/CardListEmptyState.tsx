import { useTranslation } from 'react-i18next';

interface CardListEmptyStateProps {
  onAddFirstCard: () => void;
  onShowBulkImport: () => void;
}

/**
 * Big dashed panel shown when the deck has no cards yet. Invites the user
 * to add the first card or to use bulk import.
 */
export function CardListEmptyState({
  onAddFirstCard,
  onShowBulkImport,
}: CardListEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className='border-border2 bg-surface rounded-[20px] border-2 border-dashed px-6 py-[60px] text-center'>
      <div className='mb-4 text-5xl'>🃏</div>
      <p className='text-text3 mb-5'>{t('editDeck.noCardsBody')}</p>
      <div className='flex justify-center gap-3'>
        <button
          type='button'
          className='btn btn-secondary'
          onClick={onShowBulkImport}
        >
          {t('editDeck.bulkImport')}
        </button>
        <button
          type='button'
          className='btn btn-primary'
          onClick={onAddFirstCard}
        >
          {t('editDeck.addFirst')}
        </button>
      </div>
    </div>
  );
}
