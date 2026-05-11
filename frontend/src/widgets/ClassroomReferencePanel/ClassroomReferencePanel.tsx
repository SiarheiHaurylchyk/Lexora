import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Volume2, X } from 'lucide-react';

import type {
  InfinitiveGerundRow,
  IrregularVerbRow,
} from '@/shared/lib/classroomGrammarReference';
import {
  INFINITIVE_GERUND_SECTIONS,
  IRREGULAR_VERBS_EN,
} from '@/shared/lib/classroomGrammarReference';

export type ClassroomReferenceKind = 'irregular_verbs' | 'infinitive_gerund';

type Props = {
  kind: ClassroomReferenceKind;
  onClose: () => void;
};

function speakEnglish(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

export function ClassroomReferencePanel({ kind, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const title =
    kind === 'irregular_verbs'
      ? t('classroom.shell.referenceIrregularTitle')
      : t('classroom.shell.referenceGerundTitle');

  const irregularFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IRREGULAR_VERBS_EN;
    return IRREGULAR_VERBS_EN.filter(
      (row) =>
        row.v1.toLowerCase().includes(q) ||
        row.v2.toLowerCase().includes(q) ||
        row.v3.toLowerCase().includes(q) ||
        row.ru.toLowerCase().includes(q),
    );
  }, [query]);

  const gerundSectionsFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchRow = (row: InfinitiveGerundRow) =>
      !q ||
      row.pattern.toLowerCase().includes(q) ||
      row.example.toLowerCase().includes(q) ||
      row.ru.toLowerCase().includes(q);
    return INFINITIVE_GERUND_SECTIONS.map((sec) => ({
      ...sec,
      rows: sec.rows.filter(matchRow),
    })).filter((sec) => sec.rows.length > 0);
  }, [query]);

  return (
    <aside
      className='flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface)]'
      aria-label={title}
    >
      <div className='flex items-center justify-between border-b border-[var(--border)] px-4 py-3'>
        <h2 className='text-sm font-bold'>{title}</h2>
        <button
          type='button'
          className='rounded-lg p-1 text-[var(--text3)] hover:bg-[var(--bg2)]'
          onClick={onClose}
          aria-label={t('classroom.shell.referencePanelClose')}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className='relative border-b border-[var(--border)] px-3 py-2'>
        <Search
          size={16}
          className='absolute top-1/2 left-5 -translate-y-1/2 text-[var(--text3)]'
          aria-hidden
        />
        <input
          type='search'
          className='input-field w-full pl-7 text-sm'
          placeholder={t('classroom.shell.referenceSearchPh')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete='off'
        />
      </div>

      <div className='flex-1 overflow-y-auto p-3'>
        {kind === 'irregular_verbs' ? (
          <ul className='list-none p-0'>
            {irregularFiltered.map((row) => (
              <IrregularVerbItem key={row.v1} row={row} />
            ))}
          </ul>
        ) : (
          <div className='flex flex-col gap-2'>
            {gerundSectionsFiltered.map((sec) => (
              <details
                key={sec.id}
                className='overflow-hidden rounded-xl border border-[var(--border)]'
                open
              >
                <summary className='cursor-pointer px-3 py-2 text-[13px] font-semibold hover:bg-[var(--bg2)]'>
                  {t(`classroom.shell.gerundSection_${sec.id}`)}
                </summary>
                <ul className='list-none border-t border-[var(--border)] p-0'>
                  {sec.rows.map((row, i) => (
                    <GerundItem
                      key={`${sec.id}-${row.pattern}-${i}`}
                      row={row}
                    />
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}

        {kind === 'irregular_verbs' && irregularFiltered.length === 0 && (
          <p className='text-sm text-[var(--text3)]'>
            {t('classroom.shell.referenceEmpty')}
          </p>
        )}
        {kind === 'infinitive_gerund' &&
          gerundSectionsFiltered.length === 0 && (
            <p className='text-sm text-[var(--text3)]'>
              {t('classroom.shell.referenceEmpty')}
            </p>
          )}
      </div>
    </aside>
  );
}

function IrregularVerbItem({ row }: { row: IrregularVerbRow }) {
  const { t } = useTranslation();
  const speakLine = `${row.v1}. ${row.v2}. ${row.v3}.`;
  return (
    <li className='mb-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-2.5'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap gap-3 text-sm'>
          <span>
            <span className='mr-1 text-[11px] font-bold text-[var(--text3)] uppercase'>
              {t('classroom.shell.referenceFormV1')}
            </span>
            {row.v1}
          </span>
          <span>
            <span className='mr-1 text-[11px] font-bold text-[var(--text3)] uppercase'>
              {t('classroom.shell.referenceFormV2')}
            </span>
            {row.v2}
          </span>
          <span>
            <span className='mr-1 text-[11px] font-bold text-[var(--text3)] uppercase'>
              {t('classroom.shell.referenceFormV3')}
            </span>
            {row.v3}
          </span>
        </div>
        <button
          type='button'
          className='shrink-0 rounded-lg p-1 text-[var(--text3)] hover:bg-[var(--surface)]'
          aria-label={speakLine}
          onClick={() => speakEnglish(speakLine)}
        >
          <Volume2 size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className='mt-1 text-[13px] text-[var(--text2)]'>{row.ru}</p>
    </li>
  );
}

function GerundItem({ row }: { row: InfinitiveGerundRow }) {
  return (
    <li className='border-b border-[var(--border)] p-2.5 last:border-b-0'>
      <div className='flex items-start justify-between gap-2'>
        <div className='text-sm font-medium'>{row.pattern}</div>
        <button
          type='button'
          className='shrink-0 rounded-lg p-1 text-[var(--text3)] hover:bg-[var(--bg2)]'
          aria-label={row.example}
          onClick={() => speakEnglish(row.example)}
        >
          <Volume2 size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className='mt-0.5 text-[13px] text-[var(--text2)] italic'>
        {row.example}
      </p>
      <p className='mt-0.5 text-[13px] text-[var(--text3)]'>{row.ru}</p>
    </li>
  );
}
