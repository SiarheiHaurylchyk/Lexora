import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@ui';
import {
  BookOpen,
  Files,
  Flame,
  Hand,
  Layers,
  Plus,
  Search,
  Star,
} from 'lucide-react';

import { CreateDeckModal } from '@/features/CreateDeck';

import { DeckCard } from '@/entities/Deck';

import { deckApi } from '@/shared/api/api-legacy';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CardItem, DeckItem } from '@/shared/api/types';
import { useAppSelector } from '@/shared/lib/storeHooks';

const STAT_COLORS = [
  'var(--brand)',
  'var(--accent)',
  '#F59E0B',
  'var(--success)',
];
const STAT_ICONS = [Layers, Files, Flame, Star];

const gridClasses = tw`grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`;

/**
 * MyDecksPage — flashcards home: own decks, stats, search, create.
 * (Class schedule and "enter class" live on /home and /classes.)
 */
export function MyDecksPage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDecks();
  }, [fetchDecks]);

  const filtered = decks.filter((d) => {
    const q = searchQ.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  });

  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('dashboard.morning')
      : hour < 18
        ? t('dashboard.afternoon')
        : t('dashboard.evening');

  const stats = [
    { labelKey: 'dashboard.totalDecks', value: decks.length },
    { labelKey: 'dashboard.totalCards', value: totalCards },
    { labelKey: 'dashboard.studyStreak', value: '—' },
    { labelKey: 'dashboard.mastered', value: '—' },
  ];

  return (
    <div className='box-border w-full py-10'>
      <div className='mb-10'>
        <h1 className='font-display mb-1.5 text-4xl'>
          {greeting}, {user?.displayName || user?.username}{' '}
          <Hand
            className='text-accent inline-block align-[-0.12em]'
            size={30}
            strokeWidth={2.25}
            aria-hidden
          />
        </h1>
        <p className='text-text2 text-base'>
          <Link to='/home' className='btn btn-ghost btn-sm mr-3 align-middle'>
            ← {t('hub.backToChoice')}
          </Link>
          {decks.length === 0
            ? t('dashboard.emptyHint')
            : t('dashboard.deckStats', {
                decks: decks.length,
                cards: totalCards,
              })}
        </p>
      </div>

      <div className='mb-10 grid grid-cols-4 gap-4 max-[900px]:grid-cols-2'>
        {stats.map(({ labelKey, value }, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <div
              key={labelKey}
              className='border-border bg-surface rounded-[20px] border px-6 py-5'
            >
              <div className='mb-3 flex items-start justify-between'>
                <div className='text-text3 text-[13px] font-medium'>
                  {t(labelKey)}
                </div>
                <div
                  className='flex items-center justify-center opacity-95'
                  style={{ color: STAT_COLORS[i] }}
                >
                  <Icon size={22} strokeWidth={2.35} aria-hidden />
                </div>
              </div>
              <div
                className='font-display text-[32px] font-bold'
                style={{ color: STAT_COLORS[i] }}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>

      <div className='mb-7 flex items-center gap-3'>
        <div className='relative max-w-[360px] flex-1'>
          <span
            className='text-accent pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 opacity-75'
            aria-hidden
          >
            <Search size={18} strokeWidth={2.25} />
          </span>
          <input
            className='input-field pl-[42px]'
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
        <Button type='button' onClick={() => setShowCreate(true)}>
          <span className='mr-0.5 inline-flex' aria-hidden>
            <Plus size={18} strokeWidth={2.5} />
          </span>
          {t('dashboard.newDeckBtn').replace(/^\+\s*/, '')}
        </Button>
      </div>

      {loading ? (
        <div className={gridClasses}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='skeleton h-[180px] rounded-[20px]' />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='px-6 py-20 text-center'>
          {decks.length === 0 ? (
            <>
              <div className='text-brand-light mb-5 flex justify-center opacity-95'>
                <BookOpen size={52} strokeWidth={2} aria-hidden />
              </div>
              <h2 className='font-display mb-3 text-2xl'>
                {t('dashboard.noDecksTitle')}
              </h2>
              <p className='text-text2 mb-7'>{t('dashboard.noDecksBody')}</p>
              <button
                type='button'
                className='btn btn-primary btn-lg'
                onClick={() => setShowCreate(true)}
              >
                {t('dashboard.createFirst')}
              </button>
            </>
          ) : (
            <>
              <div className='text-text3 mb-4 flex justify-center opacity-55'>
                <Search size={48} strokeWidth={2} aria-hidden />
              </div>
              <p className='text-text2'>
                {t('dashboard.noMatch', { q: searchQ })}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={gridClasses}>
          {filtered.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onDeleted={fetchDecks} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateDeckModal
          onClose={() => setShowCreate(false)}
          onCreated={(deck: DeckItem) => {
            setShowCreate(false);
            navigate(`/decks/${deck.id}/edit`);
          }}
        />
      )}
    </div>
  );
}
