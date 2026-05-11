import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DeckCard } from '@/entities/Deck';

import { deckApi } from '@/shared/api/api-legacy';

const LANG_CODES = ['', 'en', 'ru', 'de', 'fr', 'es'] as const;

const gridClasses = tw`grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`;

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLang, setSelectedLang] = useState('');

  const loadPublicPage = useCallback(
    async (targetPage: number, reset: boolean) => {
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
    },
    [t],
  );

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
    ? decks.filter(
        (d) =>
          d.sourceLanguage === selectedLang ||
          d.targetLanguage === selectedLang,
      )
    : decks;

  const langLabel = (code: string) =>
    code ? t(`languages.${code}`) : t('explore.allLangs');

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPublicPage(next, false);
  };

  return (
    <div className='box-border w-full py-10'>
      <div className='mb-9'>
        <h1 className='font-display mb-2 text-4xl'>{t('explore.title')}</h1>
        <p className='text-text2 text-base'>{t('explore.subtitle')}</p>
      </div>

      <div className='mb-7 flex flex-wrap items-center gap-3'>
        <div className='relative min-w-[240px] flex-1'>
          <span className='text-text3 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base'>
            🔍
          </span>
          <input
            className='input-field pl-11'
            placeholder={t('explore.searchPlaceholder')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
          {searching && (
            <span className='text-text3 animate-spin-slow absolute top-1/2 right-3.5 inline-block -translate-y-1/2'>
              ⟳
            </span>
          )}
        </div>

        <div className='flex flex-wrap gap-2'>
          {LANG_CODES.map((code) => (
            <button
              key={code || 'all'}
              type='button'
              onClick={() => setSelectedLang(code)}
              className={cn(
                'btn btn-sm',
                selectedLang === code ? 'btn-primary' : 'btn-secondary',
              )}
            >
              {langLabel(code)}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <p className='text-text3 mb-5 text-sm'>
          {t('explore.found', {
            count: filtered.length,
            forQuery: searchQ ? t('explore.forQuery', { q: searchQ }) : '',
          })}
        </p>
      )}

      {loading && decks.length === 0 ? (
        <div className={gridClasses}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='skeleton h-[180px] rounded-[20px]' />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='px-6 py-20 text-center'>
          <div className='mb-4 text-[56px]'>🌐</div>
          <h2 className='font-display mb-3 text-[22px]'>
            {searchQ ? t('explore.noResults') : t('explore.noPublic')}
          </h2>
          <p className='text-text2 mb-6'>
            {searchQ ? t('explore.tryOther') : t('explore.beFirst')}
          </p>
          <button
            type='button'
            className='btn btn-primary'
            onClick={() => navigate('/decks?new=1')}
          >
            {t('explore.createPublish')}
          </button>
        </div>
      ) : (
        <>
          <div className={gridClasses}>
            {filtered.map((deck) => (
              <DeckCard key={deck.id} deck={deck} readonly />
            ))}
          </div>

          {hasMore && !searchQ && (
            <div className='mt-8 text-center'>
              <button
                type='button'
                className='btn btn-secondary btn-lg'
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? t('common.loading') : t('explore.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
