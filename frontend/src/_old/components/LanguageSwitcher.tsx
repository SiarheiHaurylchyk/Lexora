/**
 * LanguageSwitcher — small dropdown that changes the UI language between
 * English and Russian. Used in the sidebar and on the auth pages.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';

type Props = { compact?: boolean; className?: string };

export default function LanguageSwitcher({ compact, className }: Props) {
  const { i18n, t } = useTranslation();
  const value = i18n.language.startsWith('ru') ? 'ru' : 'en';
  const classes = [styles.select, compact && styles.compact, className].filter(Boolean).join(' ');
  return (
    <select
      aria-label={t('lang.switch')}
      value={value}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
      className={classes}
    >
      <option value="en">{t('lang.en')}</option>
      <option value="ru">{t('lang.ru')}</option>
    </select>
  );
}
