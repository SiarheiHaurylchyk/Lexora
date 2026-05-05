import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi } from '../services/api';
import DeckCard from '../components/DeckCard';
import styles from './ExplorePage.module.css';

const LANG_CODES = ['', 'en', 'ru', 'de', 'fr', 'es'] as const;

export default function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLang, setSelectedLang] = useState('');

  const loadPublicPage = useCallback(async (targetPage: number, reset: boolean) => {
    if (reset) setLoading(true);
    try {
      const { data } = await deckApi.getPublicDecks(targetPage);
      const items = data.content || data;
      setDecks((prev) => (reset ? items : [...prev, ...items]));
      setHasMore(items.length === 20);
    } catch {
      toast.error(t('explore.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const q = searchQ.trim();
    if (!q) {
      setPage(0);
      loadPublicPage(0, true);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await deckApi.search(q);
        setDecks(data.content || data);
        setHasMore(false);
      } catch {
        toast.error(t('explore.searchFailed'));
      } finally {
        setSearching(false);
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQ, loadPublicPage, t]);

  const filtered = selectedLang
    ? decks.filter((d) => d.sourceLanguage === selectedLang || d.targetLanguage === selectedLang)
    : decks;

  const langLabel = (code: string) => (code ? t(`languages.${code}`) : t('explore.allLangs'));

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPublicPage(next, false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('explore.title')}</h1>
        <p className={styles.subtitle}>{t('explore.subtitle')}</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder={t('explore.searchPlaceholder')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          {searching && <span className={styles.spin}>⟳</span>}
        </div>

        <div className={styles.langChips}>
          {LANG_CODES.map((code) => (
            <button
              key={code || 'all'}
              type="button"
              onClick={() => setSelectedLang(code)}
              className={`btn btn-sm ${selectedLang === code ? 'btn-primary' : 'btn-secondary'}`}
            >
              {langLabel(code)}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <p className={styles.found}>
          {t('explore.found', {
            count: filtered.length,
            forQuery: searchQ ? t('explore.forQuery', { q: searchQ }) : '',
          })}
        </p>
      )}

      {loading && decks.length === 0 ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeleton}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🌐</div>
          <h2 className={styles.emptyTitle}>
            {searchQ ? t('explore.noResults') : t('explore.noPublic')}
          </h2>
          <p className={styles.emptyText}>
            {searchQ ? t('explore.tryOther') : t('explore.beFirst')}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/decks?new=1')}>
            {t('explore.createPublish')}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {filtered.map((deck) => (
              <DeckCard key={deck.id} deck={deck} readonly />
            ))}
          </div>

          {hasMore && !searchQ && (
            <div className={styles.loadMoreWrap}>
              <button type="button" className="btn btn-secondary btn-lg" onClick={loadMore} disabled={loading}>
                {loading ? t('common.loading') : t('explore.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
