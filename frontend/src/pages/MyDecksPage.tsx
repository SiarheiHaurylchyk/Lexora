import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BookOpen, Files, Flame, Hand, Layers, Plus, Search, Star } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { deckApi } from '../services/api';
import DeckCard from '../components/DeckCard';
import CreateDeckModal from '../components/CreateDeckModal';
import { Button } from '../components/ui';
import styles from './MyDecksPage.module.css';

/** Colors used for the four stat tiles, matched by index. */
const STAT_COLORS = ['var(--brand)', 'var(--accent)', '#F59E0B', 'var(--success)'];

const STAT_ICONS = [Layers, Files, Flame, Star];

/**
 * MyDecksPage — flashcards home: own decks, stats, search, create.
 * (Class schedule and “enter class” live on /home and /classes.)
 */
export default function MyDecksPage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowCreate(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await deckApi.getMyDecks();
      setDecks(data);
    } catch {
      toast.error(t('dashboard.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  const filtered = decks.filter((d) => {
    const q = searchQ.toLowerCase();
    return d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
  });

  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.morning') : hour < 18 ? t('dashboard.afternoon') : t('dashboard.evening');

  const stats = [
    { labelKey: 'dashboard.totalDecks', value: decks.length },
    { labelKey: 'dashboard.totalCards', value: totalCards },
    { labelKey: 'dashboard.studyStreak', value: '—' },
    { labelKey: 'dashboard.mastered', value: '—' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h1 className={styles.greetTitle}>
          {greeting}, {user?.displayName || user?.username}{' '}
          <Hand className={styles.greetWave} size={30} strokeWidth={2.25} aria-hidden />
        </h1>
        <p className={styles.greetSub}>
          <Link to="/home" className="btn btn-ghost btn-sm" style={{ marginRight: 12, verticalAlign: 'middle' }}>
            ← {t('hub.backToChoice')}
          </Link>
          {decks.length === 0
            ? t('dashboard.emptyHint')
            : t('dashboard.deckStats', { decks: decks.length, cards: totalCards })}
        </p>
      </div>

      <div className={styles.statsRow}>
        {stats.map(({ labelKey, value }, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <div key={labelKey} className={styles.statCard}>
              <div className={styles.statHead}>
                <div className={styles.statLabel}>{t(labelKey)}</div>
                <div className={styles.statIcon} style={{ color: STAT_COLORS[i] }}>
                  <Icon size={22} strokeWidth={2.35} aria-hidden />
                </div>
              </div>
              <div className={styles.statValue} style={{ color: STAT_COLORS[i] }}>{value}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIconWrap} aria-hidden>
            <Search size={18} strokeWidth={2.25} />
          </span>
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <Button type="button" onClick={() => setShowCreate(true)}>
          <span className={styles.btnIconLeft} aria-hidden>
            <Plus size={18} strokeWidth={2.5} />
          </span>
          {t('dashboard.newDeckBtn').replace(/^\+\s*/, '')}
        </Button>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeleton}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {decks.length === 0 ? (
            <>
              <div className={styles.emptyIcon}>
                <BookOpen size={52} strokeWidth={2} aria-hidden />
              </div>
              <h2 className={styles.emptyTitle}>{t('dashboard.noDecksTitle')}</h2>
              <p className={styles.emptyText}>{t('dashboard.noDecksBody')}</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                {t('dashboard.createFirst')}
              </button>
            </>
          ) : (
            <>
              <div className={styles.emptyIconMuted}>
                <Search size={48} strokeWidth={2} aria-hidden />
              </div>
              <p style={{ color: 'var(--text2)' }}>{t('dashboard.noMatch', { q: searchQ })}</p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDeleted={fetchDecks} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateDeckModal
          onClose={() => setShowCreate(false)}
          onCreated={(deck: any) => {
            setShowCreate(false);
            navigate(`/decks/${deck.id}/edit`);
          }}
        />
      )}
    </div>
  );
}
