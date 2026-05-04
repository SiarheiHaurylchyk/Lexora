import { useEffect } from 'react';
import i18n from '../i18n/config';

/** Syncs <html lang> with the active i18n locale. */
export default function DocumentLang() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.lang = i18n.language.startsWith('ru') ? 'ru' : 'en';
    };
    apply();
    i18n.on('languageChanged', apply);
    return () => { i18n.off('languageChanged', apply); };
  }, []);
  return null;
}
