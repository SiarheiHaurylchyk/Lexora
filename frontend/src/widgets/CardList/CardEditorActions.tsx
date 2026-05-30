import { useTranslation } from 'react-i18next';

interface CardEditorActionsProps {
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
}

/**
 * Bottom action bar of the card editor:
 *   [Cancel]                              [🗑 Delete] [Save card]
 */
export function CardEditorActions({
  onCancel,
  onDelete,
  onSave,
}: CardEditorActionsProps) {
  const { t } = useTranslation();

  return (
    <div className='flex items-center gap-2'>
      <button type='button' className='btn btn-ghost btn-sm' onClick={onCancel}>
        {t('common.cancel')}
      </button>

      <div className='ml-auto flex gap-2'>
        <button
          type='button'
          className='btn btn-ghost btn-sm text-danger'
          onClick={onDelete}
        >
          🗑 {t('common.delete')}
        </button>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={onSave}
        >
          {t('editDeck.saveCard')}
        </button>
      </div>
    </div>
  );
}
