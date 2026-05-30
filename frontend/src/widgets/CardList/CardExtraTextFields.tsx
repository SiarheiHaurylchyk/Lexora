import { useTranslation } from 'react-i18next';

import { fieldLabelPlainClasses } from './editorFieldStyles';

interface CardExtraTextFieldsProps {
  transcription: string;
  example: string;
  onTranscriptionChange: (newTranscription: string) => void;
  onExampleChange: (newExample: string) => void;
}

/**
 * Second row of the card editor: transcription input (like "/ˈæp.əl/") and
 * an example sentence input. Both are optional plain text fields.
 */
export function CardExtraTextFields({
  transcription,
  example,
  onTranscriptionChange,
  onExampleChange,
}: CardExtraTextFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className='mb-3.5 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
      <div>
        <label className={fieldLabelPlainClasses}>
          {t('editDeck.transcription')}
        </label>
        <input
          className='input-field'
          value={transcription}
          onChange={(event) => onTranscriptionChange(event.target.value)}
          placeholder='/ˈæp.əl/'
        />
      </div>

      <div>
        <label className={fieldLabelPlainClasses}>
          {t('editDeck.example')}
        </label>
        <input
          className='input-field'
          value={example}
          onChange={(event) => onExampleChange(event.target.value)}
          placeholder={t('editDeck.examplePh')}
        />
      </div>
    </div>
  );
}
