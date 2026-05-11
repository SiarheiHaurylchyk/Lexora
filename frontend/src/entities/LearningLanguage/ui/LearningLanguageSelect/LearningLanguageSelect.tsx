import { useTranslation } from 'react-i18next';

import { LEARNING_LANGUAGE_CODES } from '@/shared/lib/learningLanguages';

export interface LearningLanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
}

export function LearningLanguageSelect({
  value,
  onChange,
  required,
  id,
  className,
}: LearningLanguageSelectProps) {
  const { t } = useTranslation();
  return (
    <select
      id={id}
      className={cn('input-field', className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value=''>
        {t('settings.account.learningLanguagePlaceholder')}
      </option>
      {LEARNING_LANGUAGE_CODES.map((code) => (
        <option key={code} value={code}>
          {t(`languages.${code}`)}
        </option>
      ))}
    </select>
  );
}
