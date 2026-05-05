import React from 'react';
import { useTranslation } from 'react-i18next';
import { LEARNING_LANGUAGE_CODES } from '../lib/learningLanguages';

type Props = {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
};

export default function LearningLanguageSelect({ value, onChange, required, id, className }: Props) {
  const { t } = useTranslation();
  return (
    <select
      id={id}
      className={className ?? 'input-field'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">{t('settings.account.learningLanguagePlaceholder')}</option>
      {LEARNING_LANGUAGE_CODES.map((code) => (
        <option key={code} value={code}>
          {t(`languages.${code}`)}
        </option>
      ))}
    </select>
  );
}
