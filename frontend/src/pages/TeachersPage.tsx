import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { SlidersHorizontal } from 'lucide-react';
import { classNames } from '../lib/classNames';
import {
  countActiveTeacherFilters,
  DEFAULT_TEACHER_DIRECTORY_FILTERS,
  specialtiesToApiParam,
  TEACHER_DIRECTORY_LANG_CODES,
  type TeacherDirectoryAppliedFilters,
} from '../lib/teacherDirectory';
import { teachersApi } from '../services/api';
import type { TeacherDirectoryEntry } from '../services/types';
import TeacherCard from '../components/teachers/TeacherCard';
import TeacherDirectoryFiltersModal from '../components/teachers/TeacherDirectoryFiltersModal';
import styles from './TeachersPage.module.css';

/**
 * Build GET /teachers/directory query params from UI state.
 */
function toDirectoryParams(
  f: TeacherDirectoryAppliedFilters,
  q: string,
  page: number,
  size: number,
) {
  return {
    lang: f.lang || undefined,
    speaks: f.speaks || undefined,
    minRate: f.minRate.trim() || undefined,
    maxRate: f.maxRate.trim() || undefined,
    hasVideo: f.hasVideo || undefined,
    trial: f.trialLessonOnly ? true : undefined,
    specialties: specialtiesToApiParam(f.specialties),
    q: q.trim() || undefined,
    sort: f.sort,
    page,
    size,
  };
}

/**
 * Teacher discovery — advanced filters (modal), quick language chips, search, paged cards.
 */
export default function TeachersPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TeacherDirectoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page0Fetching, setPage0Fetching] = useState(true);
  const [appendFetching, setAppendFetching] = useState(false);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<TeacherDirectoryAppliedFilters>(DEFAULT_TEACHER_DIRECTORY_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<TeacherDirectoryAppliedFilters>(DEFAULT_TEACHER_DIRECTORY_FILTERS);

  const activeFilterCount = useMemo(() => countActiveTeacherFilters(appliedFilters), [appliedFilters]);

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(q.trim()), 320);
    return () => window.clearTimeout(id);
  }, [q]);

  const fetchDepsKey = [
    appliedFilters.lang,
    appliedFilters.speaks,
    appliedFilters.minRate,
    appliedFilters.maxRate,
    appliedFilters.hasVideo,
    appliedFilters.trialLessonOnly,
    appliedFilters.specialties.join('|'),
    appliedFilters.sort,
    qDebounced,
  ].join('\u0000');

  useLayoutEffect(() => {
    setPage0Fetching(true);
  }, [fetchDepsKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await teachersApi.directory(toDirectoryParams(appliedFilters, qDebounced, 0, 12));
        if (cancelled) return;
        setItems(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
        setTotalElements(data.totalElements ?? 0);
        setPage(0);
      } catch {
        if (!cancelled) toast.error(t('teachers.directory.loadFailed'));
      } finally {
        if (!cancelled) setPage0Fetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDepsKey, t]);

  const loadMore = async () => {
    const nextPage = page + 1;
    if (nextPage >= totalPages) return;
    setAppendFetching(true);
    try {
      const { data } = await teachersApi.directory(toDirectoryParams(appliedFilters, qDebounced, nextPage, 12));
      const rows = data.content ?? [];
      setItems((prev) => [...prev, ...rows]);
      setPage(nextPage);
    } catch {
      toast.error(t('teachers.directory.loadFailed'));
    } finally {
      setAppendFetching(false);
    }
  };

  const langLabel = (code: string) =>
    code ? t(`languages.${code}`) : t('teachers.directory.allLangs');

  const hasMore = page + 1 < totalPages;

  const openFilterModal = () => {
    setDraftFilters(appliedFilters);
    setFilterModalOpen(true);
  };

  const applyDraftFilters = () => {
    let next = { ...draftFilters };
    const mn = parseFloat(next.minRate);
    const mx = parseFloat(next.maxRate);
    if (Number.isFinite(mn) && Number.isFinite(mx) && mn > mx) {
      next = { ...next, minRate: draftFilters.maxRate, maxRate: draftFilters.minRate };
      setDraftFilters(next);
    }
    setAppliedFilters(next);
    setFilterModalOpen(false);
  };

  const clearAllFilters = () => {
    setAppliedFilters(DEFAULT_TEACHER_DIRECTORY_FILTERS);
    setQ('');
    setQDebounced('');
  };

  const removeChip = (
    kind: 'lang' | 'speaks' | 'price' | 'hasVideo' | 'trial' | 'sort' | 'specialty',
    value?: string,
  ) => {
    setAppliedFilters((prev) => {
      const next = { ...prev };
      if (kind === 'lang') next.lang = '';
      else if (kind === 'speaks') next.speaks = '';
      else if (kind === 'price') {
        next.minRate = '';
        next.maxRate = '';
      } else if (kind === 'hasVideo') next.hasVideo = false;
      else if (kind === 'trial') next.trialLessonOnly = false;
      else if (kind === 'sort') next.sort = 'new';
      else if (kind === 'specialty' && value) {
        next.specialties = prev.specialties.filter((x) => x !== value);
      }
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{t('teachers.directory.title')}</h1>
        <p className={styles.subtitle}>{t('teachers.directory.subtitle')}</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder={t('teachers.directory.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('teachers.directory.searchPlaceholder')}
          />
        </div>
        <button type="button" className={`btn btn-secondary ${styles.filterBtn}`} onClick={openFilterModal}>
          <SlidersHorizontal size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('teachers.directory.filters.open')}</span>
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </button>
      </div>

      <div className={styles.pillRow}>
        <button
          type="button"
          onClick={() => setAppliedFilters((p) => ({ ...p, lang: '' }))}
          className={`btn btn-sm ${appliedFilters.lang === '' ? 'btn-primary' : 'btn-secondary'}`}
        >
          {t('teachers.directory.allLangs')}
        </button>
        {TEACHER_DIRECTORY_LANG_CODES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setAppliedFilters((p) => ({ ...p, lang: code }))}
            className={`btn btn-sm ${appliedFilters.lang === code ? 'btn-primary' : 'btn-secondary'}`}
          >
            {langLabel(code)}
          </button>
        ))}
      </div>

      {(appliedFilters.lang ||
        appliedFilters.speaks ||
        appliedFilters.minRate.trim() ||
        appliedFilters.maxRate.trim() ||
        appliedFilters.hasVideo ||
        appliedFilters.trialLessonOnly ||
        appliedFilters.specialties.length > 0 ||
        appliedFilters.sort !== 'new') && (
        <div className={styles.activeChips} role="list" aria-label={t('teachers.directory.filters.activeAria')}>
          {appliedFilters.lang && (
            <button type="button" className={styles.activeChip} onClick={() => removeChip('lang')} role="listitem">
              {t('teachers.directory.filters.chipTeaches', { lang: langLabel(appliedFilters.lang) })} ×
            </button>
          )}
          {appliedFilters.speaks && (
            <button type="button" className={styles.activeChip} onClick={() => removeChip('speaks')} role="listitem">
              {t('teachers.directory.filters.chipAlsoSpeaks', { lang: langLabel(appliedFilters.speaks) })} ×
            </button>
          )}
          {(appliedFilters.minRate.trim() || appliedFilters.maxRate.trim()) && (
            <button type="button" className={styles.activeChip} onClick={() => removeChip('price')} role="listitem">
              {t('teachers.directory.filters.chipPrice', {
                min: appliedFilters.minRate.trim() || '…',
                max: appliedFilters.maxRate.trim() || '…',
              })}{' '}
              ×
            </button>
          )}
          {appliedFilters.hasVideo && (
            <button type="button" className={styles.activeChip} onClick={() => removeChip('hasVideo')} role="listitem">
              {t('teachers.directory.filters.chipVideo')} ×
            </button>
          )}
          {appliedFilters.trialLessonOnly && (
            <button type="button" className={styles.activeChip} onClick={() => removeChip('trial')} role="listitem">
              {t('teachers.directory.filters.chipTrial')} ×
            </button>
          )}
          {appliedFilters.specialties.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.activeChip}
              onClick={() => removeChip('specialty', id)}
              role="listitem"
            >
              {t(`teachers.directory.filters.specialty.${id}`)} ×
            </button>
          ))}
          {appliedFilters.sort !== 'new' && (
            <button type="button" className={styles.activeChip} onClick={() => removeChip('sort')} role="listitem">
              {t(`teachers.directory.sortChip.${appliedFilters.sort}`)} ×
            </button>
          )}
          <button type="button" className={styles.clearChips} onClick={clearAllFilters}>
            {t('teachers.directory.filters.clearAll')}
          </button>
        </div>
      )}

      {!page0Fetching && items.length > 0 && (
        <p className={styles.found}>{t('teachers.directory.found', { count: totalElements })}</p>
      )}

      <div className={styles.results}>
        {page0Fetching && items.length === 0 ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.skeleton}`} />
            ))}
          </div>
        ) : items.length === 0 && !page0Fetching ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🧑‍🏫</div>
            <h2 className={styles.emptyTitle}>{t('teachers.directory.emptyTitle')}</h2>
            <p className={styles.emptyText}>{t('teachers.directory.emptyHelp')}</p>
            <Link to="/explore" className="btn btn-secondary">
              {t('teachers.directory.browseDecks')}
            </Link>
          </div>
        ) : (
          <div className={styles.resultsShell}>
            <div className={styles.gridWrap}>
              <div
                className={classNames(styles.grid, page0Fetching && items.length > 0 && styles.gridDuringRefresh)}
                aria-busy={page0Fetching}
              >
                {items.map((teacher) => (
                  <TeacherCard key={teacher.id} teacher={teacher} />
                ))}
              </div>
              {page0Fetching && items.length > 0 && (
                <div className={styles.resultsVeil} aria-hidden>
                  <span className={styles.veilSpinner} />
                </div>
              )}
            </div>
            {hasMore && (
              <div className={styles.loadMore}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={appendFetching || page0Fetching}
                  onClick={() => void loadMore()}
                >
                  {appendFetching ? t('common.loading') : t('teachers.directory.loadMore')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <TeacherDirectoryFiltersModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        draft={draftFilters}
        onDraftChange={setDraftFilters}
        onApply={applyDraftFilters}
      />
    </div>
  );
}
