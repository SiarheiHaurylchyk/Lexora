import { type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { CardRowActions } from './CardRowActions';
import { CardThumbnail } from './CardThumbnail';
import type { CardForm } from './types';

import { shouldShowSpeakButton } from '@/shared/hooks/useSpeech';

interface CardRowProps {
  card: CardForm;
  sourceLanguage: string;
  /** Click on the row body opens the inline editor for this card. */
  onOpen: () => void;
  /** Click on the trash button removes the card. */
  onDelete: () => void;
}

/**
 * Collapsed row for one card inside the deck editor's card list.
 *
 * Layout from left to right: image preview, term, definition and the
 * action buttons (unsaved badge, speak, delete). Clicking outside the
 * action buttons opens the full inline editor.
 */
export function CardRow({
  card,
  sourceLanguage,
  onOpen,
  onDelete,
}: CardRowProps) {
  const { t } = useTranslation();

  const hasUnsavedChanges = !card.id;
  const canSpeakTerm = shouldShowSpeakButton(card.term, sourceLanguage);

  const termText = card.term || t('editDeck.clickEditTerm');
  const definitionText = card.definition || t('editDeck.clickEditDef');

  const stopRowClick = (event: MouseEvent) => event.stopPropagation();

  return (
    <div
      className='grid cursor-pointer grid-cols-[56px_1fr_1fr_auto] items-center gap-4 px-5 py-3.5'
      onClick={onOpen}
    >
      <CardThumbnail imageUrl={card.termImageUrl} />

      <div
        className={cn(
          'min-w-0 text-[15px] font-medium',
          card.term ? 'text-text' : 'text-text3',
        )}
      >
        {termText}
      </div>

      <div
        className={cn(
          'min-w-0 text-[15px]',
          card.definition ? 'text-text2' : 'text-text3',
        )}
      >
        {definitionText}
      </div>

      <div
        className='flex shrink-0 items-center gap-0.5'
        onClick={stopRowClick}
      >
        <CardRowActions
          term={card.term}
          sourceLanguage={sourceLanguage}
          hasUnsavedChanges={hasUnsavedChanges}
          canSpeakTerm={canSpeakTerm}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
