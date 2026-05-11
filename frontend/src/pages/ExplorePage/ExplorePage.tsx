import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { DeckCard } from '@/entities/Deck';

import type { DeckItem, Paged } from '@/shared/api/types';
import { useApiInfiniteQuery, useApiQuery } from '@/shared/lib/query';

const LANG_CODES = ['', 'en', 'ru', 'de', 'fr', 'es'] as const;
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const gridClasses = tw`grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`;

type PagedDecks = Paged<DeckItem> | DeckItem[];

/** Backend returns either an array or { content: [...] } depending on endpoint. */
function unwrap(page: PagedDecks): DeckItem[] {
  return Array.isArray(page) ? page : (page.content ?? []);
}

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedLang, setSelectedLang] = useState('');

  // Debounce the search input so we don't spam the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQ(searchQ.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchQ]);

  const searchEnabled = debouncedQ.length > 0;

  const searchQuery = useApiQuery<PagedDecks>({
    queryKey: ['decks', 'search', debouncedQ],
    url: `/decks/search?q=${encodeURIComponent(debouncedQ)}`,
    enabled: searchEnabled,
  });

  const publicInfinite = useApiInfiniteQuery<PagedDecks>({
    queryKey: ['decks', 'public'],
    url: (page) => `/decks/public?page=${page}`,
    getNextPageParam: (last, all) => {
      const items = unwrap(last);
      return items.length < PAGE_SIZE ? undefined : all.length;
    },
    enabled: !searchEnabled,
  });

  const decks: DeckItem[] = useMemo(() => {
    if (searchEnabled) return unwrap(searchQuery.data ?? []);
    return (publicInfinite.data?.pages ?? []).flatMap(unwrap);
  }, [searchEnabled, searchQuery.data, publicInfinite.data]);

  const loading = searchEnabled
    ? searchQuery.isLoading
    : publicInfinite.isLoading;
  const searching =
    searchEnabled && (searchQuery.isLoading || searchQ.trim() !== debouncedQ);
  const hasMore = !searchEnabled && (publicInfinite.hasNextPage ?? false);
  const isError = searchEnabled ? searchQuery.isError : publicInfinite.isError;

  useEffect(() => {
    if (isError)
      toast.error(
        t(searchEnabled ? 'explore.searchFailed' : 'explore.loadFailed'),
      );
  }, [isError, searchEnabled, t]);

  const filtered = selectedLang
    ? decks.filter(
        (d) =>
          d.sourceLanguage === selectedLang ||
          d.targetLanguage === selectedLang,
      )
    : decks;

  const langLabel = (code: string) =>
    code ? t(`languages.${code}`) : t('explore.allLangs');

  const loadMore = () => publicInfinite.fetchNextPage();

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
            forQuery: debouncedQ
              ? t('explore.forQuery', { q: debouncedQ })
              : '',
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
            {debouncedQ ? t('explore.noResults') : t('explore.noPublic')}
          </h2>
          <p className='text-text2 mb-6'>
            {debouncedQ ? t('explore.tryOther') : t('explore.beFirst')}
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

          {hasMore && (
            <div className='mt-8 text-center'>
              <button
                type='button'
                className='btn btn-secondary btn-lg'
                onClick={loadMore}
                disabled={publicInfinite.isFetchingNextPage}
              >
                {publicInfinite.isFetchingNextPage
                  ? t('common.loading')
                  : t('explore.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
