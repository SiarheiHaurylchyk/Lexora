import { CardEditorForm } from './CardEditorForm';
import { CardRow } from './CardRow';
import type { CardForm } from './types';

interface CardListItemProps {
  card: CardForm;
  isOpenForEditing: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  onOpen: () => void;
  onClose: () => Promise<void>;
  onSave: () => Promise<boolean>;
  onDelete: () => void;
  onUpdate: (fieldName: keyof CardForm, newValue: string) => void;
}

/**
 * One item in the card list. Shows the compact row by default and the
 * full editor form when the card is currently being edited.
 */
export function CardListItem({
  card,
  isOpenForEditing,
  sourceLanguage,
  targetLanguage,
  onOpen,
  onClose,
  onSave,
  onDelete,
  onUpdate,
}: CardListItemProps) {
  return (
    <div
      className={cn(
        'border-border bg-surface overflow-hidden rounded-[12px] border transition-colors duration-200',
        isOpenForEditing && 'border-brand',
      )}
    >
      {isOpenForEditing ? (
        <CardEditorForm
          card={card}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onUpdate={onUpdate}
          onSave={onSave}
          onClose={onClose}
          onDelete={onDelete}
        />
      ) : (
        <CardRow
          card={card}
          sourceLanguage={sourceLanguage}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
