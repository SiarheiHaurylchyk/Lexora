import { useTranslation } from 'react-i18next';

import { CardSpeakButton } from './CardSpeakButton';
import { fieldLabelUpperCaseClasses } from './editorFieldStyles';

interface CardTermFieldProps {
  termValue: string;
  sourceLanguage: string;
  onTermChange: (newTerm: string) => void;
}

const overlaySpeakButtonClasses = tw`absolute top-1/2 -translate-y-1/2 bg-transparent text-base text-text3`;

/**
 * "Term" input together with the two pronunciation buttons (🔊 and 🐢)
 * placed on top of the input's right side.
 */
export function CardTermField({
  termValue,
  sourceLanguage,
  onTermChange,
}: CardTermFieldProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label className={fieldLabelUpperCaseClasses}>
        {t('editDeck.term', { lang: sourceLanguage })}
      </label>
      <div className='relative'>
        <input
          className='input-field !pr-[4.75rem]'
          value={termValue}
          onChange={(event) => onTermChange(event.target.value)}
          placeholder={t('editDeck.termPh')}
          autoFocus
        />
        <CardSpeakButton
          text={termValue}
          language={sourceLanguage}
          slow
          className={cn(overlaySpeakButtonClasses, 'right-10')}
        />
        <CardSpeakButton
          text={termValue}
          language={sourceLanguage}
          className={cn(overlaySpeakButtonClasses, 'right-2.5')}
        />
      </div>
    </div>
  );
}
