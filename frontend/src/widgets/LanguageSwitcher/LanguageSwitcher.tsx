/**
 * LanguageSwitcher — small dropdown that changes the UI language between
 * English and Russian. Used in the sidebar and on the auth/landing pages.
 */
import { useTranslation } from 'react-i18next';

export interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

const baseClasses = tw`bg-bg3 border border-border rounded-lg px-3 py-2 text-text text-[13px] cursor-pointer min-w-[120px]`;
const compactClasses = tw`px-2 py-1.5 min-w-[100px]`;

export function LanguageSwitcher({
  compact,
  className,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const value = i18n.language.startsWith('ru') ? 'ru' : 'en';
  return (
    <select
      aria-label={t('lang.switch')}
      value={value}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
      className={cn(baseClasses, compact && compactClasses, className)}
    >
      <option value='en'>{t('lang.en')}</option>
      <option value='ru'>{t('lang.ru')}</option>
    </select>
  );
}
