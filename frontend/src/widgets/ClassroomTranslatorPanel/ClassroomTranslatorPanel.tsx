import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, Copy, Volume2, X } from 'lucide-react';

import { useSpeech } from '@/shared/hooks/useSpeech';
import { classNames } from '@/shared/lib/classNames';
import {
  MYMEMORY_MAX_CHARS,
  type MyMemoryLang,
  translateWithMyMemory,
} from '@/shared/lib/mymemoryTranslate';

const LANG_CODES: MyMemoryLang[] = [
  'en',
  'ru',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'uk',
  'pl',
  'tr',
  'zh',
  'ja',
  'ko',
  'ar',
];

type Props = { onClose: () => void };

export function ClassroomTranslatorPanel({ onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { speak } = useSpeech();
  const uiLang = i18n.language?.startsWith('ru') ? 'ru' : 'en';

  const defaultPair = useMemo(
    () =>
      uiLang === 'ru'
        ? { source: 'auto' as const, target: 'ru' as MyMemoryLang }
        : { source: 'auto' as const, target: 'en' as MyMemoryLang },
    [uiLang],
  );

  const [sourceLang, setSourceLang] = useState<'auto' | MyMemoryLang>(
    defaultPair.source,
  );
  const [targetLang, setTargetLang] = useState<MyMemoryLang>(
    defaultPair.target,
  );
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

  return (
    <aside
      className='flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface)]'
      aria-label={t('classroom.shell.translatorTitle')}
    >
      <div className='flex items-center justify-between border-b border-[var(--border)] px-4 py-3'>
        <h2 className='text-sm font-bold'>
          {t('classroom.shell.translatorTitle')}
        </h2>
        <button
          type='button'
          className='rounded-lg p-1 text-[var(--text3)] hover:bg-[var(--bg2)]'
          onClick={onClose}
          aria-label={t('classroom.shell.translatorPanelClose')}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className='flex flex-1 flex-col gap-3 overflow-y-auto p-4'>
        <p className='text-[13px] text-[var(--text2)]'>
          {t('classroom.shell.translatorLanguages')}
        </p>
        <div className='flex items-center gap-2'>
          <select
            className='input-field flex-1 text-sm'
            value={sourceLang}
            aria-label={t('classroom.shell.translatorFrom')}
            onChange={(e) =>
              setSourceLang(
                e.target.value === 'auto'
                  ? 'auto'
                  : (e.target.value as MyMemoryLang),
              )
            }
          >
            <option value='auto'>{t('classroom.shell.translatorAuto')}</option>
            {LANG_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`languages.${code}`)}
              </option>
            ))}
          </select>
          <button
            type='button'
            className='rounded-lg border border-[var(--border)] p-1.5 hover:bg-[var(--bg2)]'
            onClick={swapLanguages}
            aria-label={t('classroom.shell.translatorSwap')}
          >
            <ArrowDownUp size={18} strokeWidth={2} aria-hidden />
          </button>
          <select
            className='input-field flex-1 text-sm'
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
          className='input-field w-full resize-none text-sm'
          rows={5}
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
        <div className='flex items-center justify-between text-[12px]'>
          <span className='text-[var(--text3)]'>
            {t('classroom.shell.translatorShortcut')}
          </span>
          <span
            className={classNames(
              'text-[var(--text3)]',
              overLimit && 'text-[var(--danger)]',
            )}
          >
            {len} / {MYMEMORY_MAX_CHARS}
          </span>
        </div>

        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className='btn btn-primary btn-sm flex-1'
            disabled={loading || !sourceText.trim() || overLimit}
            onClick={() => void runTranslate()}
          >
            {loading ? t('common.loading') : t('classroom.shell.translatorRun')}
          </button>
          <button
            type='button'
            className='rounded-lg border border-[var(--border)] p-1.5 text-[var(--text2)] hover:bg-[var(--bg2)]'
            disabled={!result.trim()}
            onClick={() => result.trim() && speak(result, targetLang)}
            aria-label={t('classroom.shell.translatorSpeak')}
          >
            <Volume2 size={18} strokeWidth={2} aria-hidden />
          </button>
          <button
            type='button'
            className='rounded-lg border border-[var(--border)] p-1.5 text-[var(--text2)] hover:bg-[var(--bg2)]'
            disabled={!result.trim()}
            onClick={() => void copyResult()}
            aria-label={t('classroom.shell.translatorCopy')}
          >
            <Copy size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <p className='text-[13px] text-[var(--text2)]'>
          {t('classroom.shell.translatorResult')}
        </p>
        <div className='min-h-[80px] rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 text-sm'>
          {result || (
            <span className='text-[var(--text3)]'>
              {t('classroom.shell.translatorResultEmpty')}
            </span>
          )}
        </div>
      </div>

      <p className='border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text3)]'>
        {t('classroom.shell.translatorDisclaimer')}
      </p>
    </aside>
  );
}
