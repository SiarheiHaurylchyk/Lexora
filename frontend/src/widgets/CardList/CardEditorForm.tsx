import { CardDefinitionField } from './CardDefinitionField';
import { CardEditorActions } from './CardEditorActions';
import { CardExtraTextFields } from './CardExtraTextFields';
import { CardImagePickers } from './CardImagePickers';
import { CardTermField } from './CardTermField';
import type { CardForm } from './types';

interface CardEditorFormProps {
  card: CardForm;
  sourceLanguage: string;
  targetLanguage: string;
  /** Change one field of the card. */
  onUpdate: (fieldName: keyof CardForm, newValue: string) => void;
  /** Save the card on the server; resolves to `true` on success. */
  onSave: () => Promise<boolean>;
  /** Close the editor (saves silently if the form is filled). */
  onClose: () => Promise<void>;
  /** Delete the card. */
  onDelete: () => void;
}

/**
 * Inline editor for one card.
 *
 * It is just a thin composition of small field components:
 *  - term + pronunciation buttons (CardTermField);
 *  - definition (CardDefinitionField);
 *  - transcription + example (CardExtraTextFields);
 *  - two image pickers (CardImagePickers);
 *  - bottom action bar (CardEditorActions).
 */
export function CardEditorForm({
  card,
  sourceLanguage,
  targetLanguage,
  onUpdate,
  onSave,
  onClose,
  onDelete,
}: CardEditorFormProps) {
  const handleCancelClick = () => void onClose();
  const handleSaveClick = () => void onSave();

  return (
    <div className='px-5 pt-5 pb-4'>
      <div className='mb-3 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <CardTermField
          termValue={card.term}
          sourceLanguage={sourceLanguage}
          onTermChange={(newTerm) => onUpdate('term', newTerm)}
        />
        <CardDefinitionField
          definitionValue={card.definition}
          targetLanguage={targetLanguage}
          onDefinitionChange={(newDefinition) =>
            onUpdate('definition', newDefinition)
          }
        />
      </div>

      <CardExtraTextFields
        transcription={card.transcription}
        example={card.example}
        onTranscriptionChange={(newTranscription) =>
          onUpdate('transcription', newTranscription)
        }
        onExampleChange={(newExample) => onUpdate('example', newExample)}
      />

      <CardImagePickers
        card={card}
        onTermImageChange={(newImageUrl) =>
          onUpdate('termImageUrl', newImageUrl)
        }
        onDefinitionImageChange={(newImageUrl) =>
          onUpdate('definitionImageUrl', newImageUrl)
        }
      />

      <CardEditorActions
        onCancel={handleCancelClick}
        onDelete={onDelete}
        onSave={handleSaveClick}
      />
    </div>
  );
}
