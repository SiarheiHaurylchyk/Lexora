import { useTranslation } from 'react-i18next';

import { fieldLabelUpperCaseClasses } from './editorFieldStyles';

interface CardDefinitionFieldProps {
  definitionValue: string;
  targetLanguage: string;
  onDefinitionChange: (newDefinition: string) => void;
}

/** Plain text input for the card's translation/definition. */
export function CardDefinitionField({
  definitionValue,
  targetLanguage,
  onDefinitionChange,
}: CardDefinitionFieldProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label className={fieldLabelUpperCaseClasses}>
        {t('editDeck.definition', { lang: targetLanguage })}
      </label>
      <input
        className='input-field'
        value={definitionValue}
        onChange={(event) => onDefinitionChange(event.target.value)}
        placeholder={t('editDeck.defPh')}
      />
    </div>
  );
}
