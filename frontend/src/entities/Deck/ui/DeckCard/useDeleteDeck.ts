import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { deckApi } from '@/shared/api/api-legacy';
import { useConfirm } from '@/shared/lib/confirm';

interface UseDeleteDeckOptions {
  deckId: number;
  deckTitle: string;
  onDeleted?: () => void;
}

/**
 * Small hook that asks the user to confirm, then deletes one deck and shows
 * a toast. Returns a stable `runDelete` function and a `isDeleting` flag
 * for disabling buttons while the request is in flight.
 */
export function useDeleteDeck({
  deckId,
  deckTitle,
  onDeleted,
}: UseDeleteDeckOptions) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const runDelete = async () => {
    const userConfirmed = await confirm({
      message: t('deckCard.confirmDelete', { title: deckTitle }),
      variant: 'danger',
      confirmText: t('common.delete'),
    });
    if (!userConfirmed) return;

    setIsDeleting(true);
    try {
      await deckApi.deleteDeck(deckId);
      toast.success(t('deckCard.deleted'));
      onDeleted?.();
    } catch {
      toast.error(t('deckCard.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return { runDelete, isDeleting };
}
