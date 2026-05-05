import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../ui/Modal';
import {
  DEFAULT_TEACHER_DIRECTORY_FILTERS,
  TEACHER_DIRECTORY_LANG_CODES,
  TEACHER_SPECIALTY_IDS,
  type TeacherDirectoryAppliedFilters,
} from '../../lib/teacherDirectory';
import styles from './TeacherDirectoryFiltersModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  draft: TeacherDirectoryAppliedFilters;
  onDraftChange: (next: TeacherDirectoryAppliedFilters) => void;
  onApply: () => void;
}

/**
 * Large filter dialog for the teacher directory (languages, rate range, video, specialties, sort).
 */
export default function TeacherDirectoryFiltersModal({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
}: Props) {
  const { t } = useTranslation();

  if (!open) return null;

  const set = (patch: Partial<TeacherDirectoryAppliedFilters>) =>
    onDraftChange({ ...draft, ...patch });

  const toggleSpecialty = (id: string) => {
    const has = draft.specialties.includes(id);
    set({
      specialties: has ? draft.specialties.filter((x) => x !== id) : [...draft.specialties, id],
    });
  };

  const langLabel = (code: string) => t(`languages.${code}`);

  const applyPreset = (min: string, max: string) => set({ minRate: min, maxRate: max });

  return (
    <Modal
      title={t('teachers.directory.filters.title')}
      onClose={onClose}
      extraWide
    >
      <div className={styles.wrap}>
        <p className={styles.lead}>{t('teachers.directory.filters.lead')}</p>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{t('teachers.directory.filters.teachLang')}</h3>
            <p className={styles.cardHint}>{t('teachers.directory.filters.teachLangHint')}</p>
            <div className={styles.chipWrap}>
              <button
                type="button"
                className={`btn btn-sm ${!draft.lang ? 'btn-primary' : 'btn-secondary'} ${styles.chip}`}
                onClick={() => set({ lang: '' })}
              >
                {t('teachers.directory.allLangs')}
              </button>
              {TEACHER_DIRECTORY_LANG_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`btn btn-sm ${draft.lang === code ? 'btn-primary' : 'btn-secondary'} ${styles.chip}`}
                  onClick={() => set({ lang: code })}
                >
                  {langLabel(code)}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{t('teachers.directory.filters.alsoSpeaks')}</h3>
            <p className={styles.cardHint}>{t('teachers.directory.filters.alsoSpeaksHint')}</p>
            <div className={styles.chipWrap}>
              <button
                type="button"
                className={`btn btn-sm ${!draft.speaks ? 'btn-primary' : 'btn-secondary'} ${styles.chip}`}
                onClick={() => set({ speaks: '' })}
              >
                {t('teachers.directory.filters.speaksAny')}
              </button>
              {TEACHER_DIRECTORY_LANG_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`btn btn-sm ${draft.speaks === code ? 'btn-primary' : 'btn-secondary'} ${styles.chip}`}
                  onClick={() => set({ speaks: code })}
                >
                  {langLabel(code)}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{t('teachers.directory.filters.price')}</h3>
            <p className={styles.cardHint}>{t('teachers.directory.filters.priceHint')}</p>
            <div className={styles.priceInputs}>
              <label className={styles.priceLabel}>
                <span>{t('teachers.directory.filters.min')}</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={`input-field ${styles.priceInput}`}
                  value={draft.minRate}
                  onChange={(e) => set({ minRate: e.target.value })}
                  placeholder="—"
                />
              </label>
              <label className={styles.priceLabel}>
                <span>{t('teachers.directory.filters.max')}</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={`input-field ${styles.priceInput}`}
                  value={draft.maxRate}
                  onChange={(e) => set({ maxRate: e.target.value })}
                  placeholder="—"
                />
              </label>
            </div>
            <div className={styles.presetRow}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyPreset('', '')}>
                {t('teachers.directory.filters.presetAny')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyPreset('', '15')}>
                {t('teachers.directory.filters.presetUnder15')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyPreset('15', '30')}>
                {t('teachers.directory.filters.preset15_30')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyPreset('30', '50')}>
                {t('teachers.directory.filters.preset30_50')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyPreset('50', '')}>
                {t('teachers.directory.filters.preset50plus')}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>{t('teachers.directory.filters.focus')}</h3>
            <p className={styles.cardHint}>{t('teachers.directory.filters.focusHint')}</p>
            <div className={styles.chipWrap}>
              {TEACHER_SPECIALTY_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`btn btn-sm ${draft.specialties.includes(id) ? 'btn-primary' : 'btn-secondary'} ${styles.chip}`}
                  onClick={() => toggleSpecialty(id)}
                >
                  {t(`teachers.directory.filters.specialty.${id}`)}
                </button>
              ))}
            </div>
          </section>

          <section className={`${styles.card} ${styles.cardWide}`}>
            <h3 className={styles.cardTitle}>{t('teachers.directory.filters.presentation')}</h3>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.hasVideo}
                onChange={(e) => set({ hasVideo: e.target.checked })}
              />
              <span>{t('teachers.directory.filters.hasVideo')}</span>
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.trialLessonOnly}
                onChange={(e) => set({ trialLessonOnly: e.target.checked })}
              />
              <span>{t('teachers.directory.filters.trialLesson')}</span>
            </label>
          </section>

          <section className={`${styles.card} ${styles.cardWide}`}>
            <h3 className={styles.cardTitle}>{t('teachers.directory.sortLabel')}</h3>
            <select
              className={`input-field ${styles.sortSelect}`}
              value={draft.sort}
              onChange={(e) => set({ sort: e.target.value as TeacherDirectoryAppliedFilters['sort'] })}
              aria-label={t('teachers.directory.sortLabel')}
            >
              <option value="new">{t('teachers.directory.sortNew')}</option>
              <option value="rate">{t('teachers.directory.sortRate')}</option>
              <option value="rate_desc">{t('teachers.directory.sortRateDesc')}</option>
            </select>
          </section>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onDraftChange({ ...DEFAULT_TEACHER_DIRECTORY_FILTERS })}
          >
            {t('teachers.directory.filters.resetAll')}
          </button>
          <button type="button" className={`btn btn-primary ${styles.applyBtn}`} onClick={onApply}>
            {t('teachers.directory.filters.apply')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
