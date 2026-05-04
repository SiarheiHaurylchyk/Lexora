import React, { useCallback, useMemo, useState } from 'react';
import { ArrowDownUp, Copy, Volume2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { MYMEMORY_MAX_CHARS, translateWithMyMemory, type MyMemoryLang } from '../../lib/mymemoryTranslate';
import { useSpeech } from '../../hooks/useSpeech';
import { classNames } from '../../lib/classNames';
import styles from './ClassroomTranslatorPanel.module.css';

const LANG_CODES: MyMemoryLang[] = ['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'uk', 'pl', 'tr', 'zh', 'ja', 'ko', 'ar'];

type ClassroomTranslatorPanelProps = {
  onClose: () => void;
};

export default function ClassroomTranslatorPanel({ onClose }: ClassroomTranslatorPanelProps) {
  const { t, i18n } = useTranslation();
  const { speak } = useSpeech();
  const uiLang = i18n.language?.startsWith('ru') ? 'ru' : 'en';

  const defaultPair = useMemo(() => {
    if (uiLang === 'ru') {
      return { source: 'auto' as const, target: 'ru' as MyMemoryLang };
    }
    return { source: 'auto' as const, target: 'en' as MyMemoryLang };
  }, [uiLang]);

  const [sourceLang, setSourceLang] = useState<'auto' | MyMemoryLang>(defaultPair.source);
  const [targetLang, setTargetLang] = useState<MyMemoryLang>(defaultPair.target);
  const [sourceText, setSourceText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const len = sourceText.length;
  const overLimit = len > MYMEMORY_MAX_CHARS;

  const runTranslate = useCallback(async () => {
    const q = sourceText.trim();
    if (!q || overLimit) return;
    setLoading(true);
    setResult('');
    try {
      const out = await translateWithMyMemory(q, sourceLang, targetLang);
      setResult(out);
    } catch (err) {
      const key =
        err instanceof Error && err.message === 'too_long'
          ? 'classroom.shell.translatorTooLong'
          : 'classroom.shell.translatorFailed';
      toast.error(t(key));
    } finally {
      setLoading(false);
    }
  }, [overLimit, sourceLang, sourceText, t, targetLang]);

  const swapLanguages = () => {
    const prevS = sourceLang;
    const prevT = targetLang;
    setSourceLang(prevT);
    setTargetLang(prevS === 'auto' ? (prevT === 'en' ? 'ru' : 'en') : prevS);
    setSourceText(result || sourceText);
    setResult('');
  };

  const copyResult = async () => {
    if (!result.trim()) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success(t('classroom.shell.translatorCopied'));
    } catch {
      toast.error(t('classroom.shell.translatorCopyFailed'));
    }
  };

  const speakResult = () => {
    if (!result.trim()) return;
    speak(result, targetLang);
  };

  return (
    <aside className={styles.panel} aria-label={t('classroom.shell.translatorTitle')}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('classroom.shell.translatorTitle')}</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('classroom.shell.translatorPanelClose')}>
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className={styles.body}>
        <p className={styles.label}>{t('classroom.shell.translatorLanguages')}</p>
        <div className={styles.langRow}>
          <select
            className={styles.select}
            value={sourceLang}
            aria-label={t('classroom.shell.translatorFrom')}
            onChange={(e) => setSourceLang(e.target.value === 'auto' ? 'auto' : (e.target.value as MyMemoryLang))}
          >
            <option value="auto">{t('classroom.shell.translatorAuto')}</option>
            {LANG_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`languages.${code}`)}
              </option>
            ))}
          </select>
          <button type="button" className={styles.swapBtn} onClick={swapLanguages} aria-label={t('classroom.shell.translatorSwap')}>
            <ArrowDownUp size={18} strokeWidth={2} aria-hidden />
          </button>
          <select
            className={styles.select}
            value={targetLang}
            aria-label={t('classroom.shell.translatorTo')}
            onChange={(e) => setTargetLang(e.target.value as MyMemoryLang)}
          >
            {LANG_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`languages.${code}`)}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className={styles.textarea}
          placeholder={t('classroom.shell.translatorPlaceholder')}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void runTranslate();
            }
          }}
        />
        <div className={styles.counterRow}>
          <span className={styles.shortcutHint}>{t('classroom.shell.translatorShortcut')}</span>
          <span className={classNames(styles.counter, overLimit && styles.counterWarn)}>
            {len} / {MYMEMORY_MAX_CHARS}
          </span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.translateBtn} disabled={loading || !sourceText.trim() || overLimit} onClick={() => void runTranslate()}>
            {loading ? t('common.loading') : t('classroom.shell.translatorRun')}
          </button>
          <button type="button" className={styles.iconBtn} disabled={!result.trim()} onClick={speakResult} aria-label={t('classroom.shell.translatorSpeak')}>
            <Volume2 size={18} strokeWidth={2} aria-hidden />
          </button>
          <button type="button" className={styles.iconBtn} disabled={!result.trim()} onClick={() => void copyResult()} aria-label={t('classroom.shell.translatorCopy')}>
            <Copy size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <p className={styles.label}>{t('classroom.shell.translatorResult')}</p>
        <div className={styles.resultBox}>
          {result ? result : <span className={styles.resultPlaceholder}>{t('classroom.shell.translatorResultEmpty')}</span>}
        </div>
      </div>

      <p className={styles.footer}>{t('classroom.shell.translatorDisclaimer')}</p>
    </aside>
  );
}
