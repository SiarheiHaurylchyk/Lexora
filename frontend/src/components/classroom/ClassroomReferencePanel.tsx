import React, { useMemo, useState } from 'react';
import { Search, Volume2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InfinitiveGerundRow, IrregularVerbRow } from '../../data/classroomGrammarReference';
import { INFINITIVE_GERUND_SECTIONS, IRREGULAR_VERBS_EN } from '../../data/classroomGrammarReference';
import styles from './ClassroomReferencePanel.module.css';

export type ClassroomReferenceKind = 'irregular_verbs' | 'infinitive_gerund';

type ClassroomReferencePanelProps = {
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

export default function ClassroomReferencePanel({ kind, onClose }: ClassroomReferencePanelProps) {
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
    <aside className={styles.panel} aria-label={title}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('classroom.shell.referencePanelClose')}>
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className={styles.searchWrap}>
        <Search size={16} strokeWidth={2} className={styles.searchIcon} aria-hidden />
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t('classroom.shell.referenceSearchPh')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {kind === 'irregular_verbs' ? (
        <ul className={styles.list}>
          {irregularFiltered.map((row) => (
            <IrregularVerbItem key={row.v1} row={row} />
          ))}
        </ul>
      ) : (
        <div className={styles.sectionsWrap}>
          {gerundSectionsFiltered.map((sec) => (
            <details key={sec.id} className={styles.section} open>
              <summary className={styles.sectionSummary}>{t(`classroom.shell.gerundSection_${sec.id}`)}</summary>
              <ul className={styles.sectionList}>
                {sec.rows.map((row, i) => (
                  <GerundItem key={`${sec.id}-${row.pattern}-${i}`} row={row} />
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      {kind === 'irregular_verbs' && irregularFiltered.length === 0 && (
        <p className={styles.empty}>{t('classroom.shell.referenceEmpty')}</p>
      )}
      {kind === 'infinitive_gerund' && gerundSectionsFiltered.length === 0 && (
        <p className={styles.empty}>{t('classroom.shell.referenceEmpty')}</p>
      )}
    </aside>
  );
}

function IrregularVerbItem({ row }: { row: IrregularVerbRow }) {
  const { t } = useTranslation();
  const speakLine = `${row.v1}. ${row.v2}. ${row.v3}.`;
  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.forms}>
          <span>
            <span className={styles.formTag}>{t('classroom.shell.referenceFormV1')}</span> {row.v1}
          </span>
          <span>
            <span className={styles.formTag}>{t('classroom.shell.referenceFormV2')}</span> {row.v2}
          </span>
          <span>
            <span className={styles.formTag}>{t('classroom.shell.referenceFormV3')}</span> {row.v3}
          </span>
        </div>
        <button
          type="button"
          className={styles.speakBtn}
          aria-label={speakLine}
          onClick={() => speakEnglish(speakLine)}
        >
          <Volume2 size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className={styles.ru}>{row.ru}</p>
    </li>
  );
}

function GerundItem({ row }: { row: InfinitiveGerundRow }) {
  return (
    <li className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.gerundPattern}>{row.pattern}</div>
        <button
          type="button"
          className={styles.speakBtn}
          aria-label={row.example}
          onClick={() => speakEnglish(row.example)}
        >
          <Volume2 size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <p className={styles.example}>{row.example}</p>
      <p className={styles.ru}>{row.ru}</p>
    </li>
  );
}
