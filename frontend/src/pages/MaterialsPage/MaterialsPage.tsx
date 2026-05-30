import { type MouseEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@ui';

import {
  MaterialsCatalogByLevel,
  MaterialsDeckCard,
} from '@/widgets/MaterialsCatalog';

import { deckApi, materialsApi } from '@/shared/api/api-legacy';
import type {
  DeckItem,
  MaterialsPersonalViewDTO,
  Paged,
} from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import {
  CEFR_LEVEL_CODES,
  type CefrFilter,
  groupCatalogByLevel,
  normalizeCefrLevel,
} from '@/shared/lib/cefrLevels';
import { useApiInfiniteQuery, useApiQuery } from '@/shared/lib/query';
import { useAuthStore } from '@/shared/lib/storeHooks';

type TabKey = 'catalog' | 'personal' | 'whiteboards';

const PAGE_SIZE = 20;
const GROUPED_PAGE_SIZE = 200;

const tabBase = tw`cursor-pointer rounded-[10px] border-0 bg-transparent px-4 py-2.5 font-inherit text-[13px] font-medium text-text2 whitespace-nowrap`;
const tabActive = tw`bg-bg3 text-text shadow-[0_0_0_1px_var(--color-border2)]`;
const viewBtnBase = tw`cursor-pointer rounded-[10px] border-0 bg-transparent px-3 py-2 font-inherit text-base text-text2`;
const viewBtnActive = tw`bg-bg3 text-text`;
const levelChip = tw`cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors`;
const levelChipActive = tw`border-brand bg-brand/15 text-brand-light`;
const sectionTitleClasses = tw`mb-3 mt-7 font-display text-lg`;
const skeletonCardClasses = tw`h-[260px] rounded-[20px]`;
const gridClasses = tw`grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]`;
const listClasses = tw`flex flex-col gap-2.5`;

export function MaterialsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const linkIdParam = searchParams.get('linkId');
  const linkId = linkIdParam ? Number(linkIdParam) : NaN;
  const classLinkOk = Number.isFinite(linkId) && linkId > 0;

  const user = useAuthStore((s) => s.user);
  const canTeach = userCanTeach(user?.role);
  const myUserId = user?.id;

  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('catalog');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'popular' | 'new'>('popular');
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [levelFilter, setLevelFilter] = useState<CefrFilter>('all');

  const [listingDeck, setListingDeck] = useState<DeckItem | null>(null);
  const [listingListed, setListingListed] = useState(false);
  const [listingPriceUsd, setListingPriceUsd] = useState('');
  const [listingCefr, setListingCefr] = useState('');
  const [listingSaving, setListingSaving] = useState(false);

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedQ(searchQ.trim()), 380);
    return () => clearTimeout(tmr);
  }, [searchQ]);

  const showGrouped = tab === 'catalog' && !debouncedQ && levelFilter === 'all';

  const catalogInfinite = useApiInfiniteQuery<Paged<DeckItem>>({
    queryKey: ['materials', 'catalog', debouncedQ, sort, levelFilter],
    url: (page) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('size', String(showGrouped ? GROUPED_PAGE_SIZE : PAGE_SIZE));
      if (debouncedQ) params.set('q', debouncedQ);
      params.set('sort', sort);
      if (levelFilter !== 'all') params.set('cefr', levelFilter);
      return `/materials/catalog?${params.toString()}`;
    },
    getNextPageParam: (last, all) =>
      showGrouped
        ? undefined
        : (last.totalPages ?? 0) > all.length
          ? all.length
          : undefined,
    enabled: tab === 'catalog',
  });

  const catalogItems = useMemo(
    () => (catalogInfinite.data?.pages ?? []).flatMap((p) => p.content ?? []),
    [catalogInfinite.data],
  );
  const groupedSections = useMemo(
    () => (showGrouped ? groupCatalogByLevel(catalogItems) : []),
    [showGrouped, catalogItems],
  );
  const catalogTotal =
    catalogInfinite.data?.pages?.[0]?.totalElements ?? catalogItems.length;
  const catalogLoading = catalogInfinite.isLoading;
  const catalogSearching =
    catalogInfinite.isFetching &&
    Boolean(debouncedQ) &&
    !catalogInfinite.isFetchingNextPage;
  const hasMoreCatalog = catalogInfinite.hasNextPage;

  useEffect(() => {
    if (catalogInfinite.isError)
      toast.error(
        getApiErrorMessage(catalogInfinite.error) ||
          t('materials.catalogLoadFailed'),
      );
  }, [catalogInfinite.isError, catalogInfinite.error, t]);

  const personalQuery = useApiQuery<MaterialsPersonalViewDTO>({
    queryKey: ['materials', 'personal'],
    url: '/materials/personal',
    enabled: tab === 'personal' || (tab === 'catalog' && canTeach),
  });
  const personalOwned = personalQuery.data?.owned ?? [];
  const personalSaved = personalQuery.data?.savedFromCatalog ?? [];
  const personalLoading = personalQuery.isLoading && tab === 'personal';

  useEffect(() => {
    if (tab === 'personal' && personalQuery.isError)
      toast.error(
        getApiErrorMessage(personalQuery.error) ||
          t('materials.personalLoadFailed'),
      );
  }, [tab, personalQuery.isError, personalQuery.error, t]);

  const savedMap = useMemo(() => {
    const next = new Map<number, number>();
    if (!canTeach) return next;
    for (const d of personalQuery.data?.savedFromCatalog ?? []) {
      if (d.librarySaveId != null) next.set(d.id, d.librarySaveId);
    }
    return next;
  }, [canTeach, personalQuery.data]);

  const invalidateMaterials = () =>
    queryClient.invalidateQueries({ queryKey: ['materials'] });

  const openListingModal = (deck: DeckItem) => {
    setListingDeck(deck);
    setListingListed(Boolean(deck.listedInMaterialsCatalog));
    const cents = deck.catalogPriceCents;
    setListingPriceUsd(cents != null && cents > 0 ? String(cents / 100) : '');
    setListingCefr(normalizeCefrLevel(deck.cefrLevel) ?? '');
  };

  const submitListing = async () => {
    if (!listingDeck) return;
    const price =
      listingPriceUsd.trim() === ''
        ? 0
        : Math.round(Number(listingPriceUsd) * 100);
    if (listingListed && listingDeck.visibility !== 'PUBLIC') {
      toast.error(t('materials.listingNeedsPublic'));
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error(t('materials.invalidPrice'));
      return;
    }
    setListingSaving(true);
    try {
      await materialsApi.patchListing(listingDeck.id, {
        listedInMaterialsCatalog: listingListed,
        catalogPriceCents: price,
        cefrLevel: listingCefr.trim() || null,
      });
      toast.success(t('materials.listingSaved'));
      void invalidateMaterials();
      setListingDeck(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.listingSaveFailed'));
    } finally {
      setListingSaving(false);
    }
  };

  const saveToLibrary = async (e: MouseEvent, deck: DeckItem) => {
    e.stopPropagation();
    try {
      await materialsApi.saveCatalogDeck(deck.id);
      toast.success(t('materials.savedToLibrary'));
      void invalidateMaterials();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.saveFailed'));
    }
  };

  const removeFromLibrary = async (e: MouseEvent, deckId: number) => {
    e.stopPropagation();
    try {
      await materialsApi.unsaveCatalogDeck(deckId);
      toast.success(t('materials.removedFromLibrary'));
      void invalidateMaterials();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.unsaveFailed'));
    }
  };

  const shareWithStudent = async (e: MouseEvent, deckId: number) => {
    e.stopPropagation();
    if (!classLinkOk) return;
    try {
      await deckApi.shareWithLink(deckId, { linkId });
      toast.success(t('materials.sharedWithStudent'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.shareFailed'));
    }
  };

  const deckCardProps = {
    myUserId,
    canTeach,
    classLinkOk,
    onSave: saveToLibrary,
    onUnsave: removeFromLibrary,
    onShare: shareWithStudent,
    onOpenListing: openListingModal,
  };

  const renderCatalogCard = (deck: DeckItem) => (
    <MaterialsDeckCard
      key={deck.id}
      deck={deck}
      ctx='catalog'
      view={view}
      {...deckCardProps}
      isSaved={savedMap.has(deck.id)}
    />
  );

  const levelFilters: { id: CefrFilter; label: string }[] = [
    { id: 'all', label: t('materials.levelFilterAll') },
    ...CEFR_LEVEL_CODES.map((code) => ({
      id: code as CefrFilter,
      label: t(`cefr.${code}.short`),
    })),
    { id: 'OTHER', label: t('cefr.OTHER.short') },
  ];

  return (
    <div className='box-border w-full py-10'>
      <PageHeader
        title={t('materials.title')}
        subtitle={t('materials.subtitle')}
      />

      {canTeach && classLinkOk && (
        <div className='text-text2 mb-5 rounded-[14px] border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.08)] px-4 py-3 text-sm'>
          <strong>{t('materials.classContextTitle')}</strong> —{' '}
          {t('materials.classContextBody')}
        </div>
      )}

      <div
        className='border-border bg-surface mb-6 flex gap-1.5 overflow-x-auto rounded-[14px] border p-1'
        role='tablist'
      >
        {(['catalog', 'personal', 'whiteboards'] as const).map((k) => (
          <button
            key={k}
            type='button'
            className={cn(tabBase, tab === k && tabActive)}
            onClick={() => setTab(k)}
          >
            {t(`materials.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <>
          <div className='mb-4 flex flex-wrap items-center gap-3'>
            <div className='relative min-w-[220px] flex-1'>
              <span className='text-text3 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2'>
                🔍
              </span>
              <input
                className='input-field pl-11'
                placeholder={t('materials.searchPlaceholder')}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                aria-label={t('materials.searchPlaceholder')}
              />
              {catalogSearching && (
                <span className='text-text3 animate-spin-slow absolute top-1/2 right-3.5 inline-block -translate-y-1/2'>
                  ⟳
                </span>
              )}
            </div>
            <select
              className='input-field max-w-[260px] min-w-[180px] flex-shrink-0'
              value={sort}
              onChange={(e) => setSort(e.target.value as 'popular' | 'new')}
              aria-label={t('materials.sortLabel')}
            >
              <option value='popular'>{t('materials.sortPopular')}</option>
              <option value='new'>{t('materials.sortNew')}</option>
            </select>
            <div className='border-border bg-surface flex gap-1 rounded-[12px] border p-1'>
              <button
                type='button'
                className={cn(viewBtnBase, view === 'grid' && viewBtnActive)}
                onClick={() => setView('grid')}
              >
                ▦
              </button>
              <button
                type='button'
                className={cn(viewBtnBase, view === 'list' && viewBtnActive)}
                onClick={() => setView('list')}
              >
                ☰
              </button>
            </div>
            <span className='text-text3 text-sm'>
              {t('materials.total', { count: catalogTotal })}
            </span>
          </div>

          <div className='mb-6 flex gap-2 overflow-x-auto pb-1'>
            {levelFilters.map(({ id, label }) => (
              <button
                key={id}
                type='button'
                className={cn(levelChip, levelFilter === id && levelChipActive)}
                onClick={() => setLevelFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {catalogLoading && catalogItems.length === 0 ? (
            <div className={gridClasses}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cn('skeleton', skeletonCardClasses)} />
              ))}
            </div>
          ) : catalogItems.length === 0 ? (
            <div className='text-text3 px-6 py-12 text-center'>
              {t('materials.catalogEmpty')}
            </div>
          ) : showGrouped && groupedSections.length > 0 ? (
            <MaterialsCatalogByLevel
              sections={groupedSections}
              view={view}
              savedMap={savedMap}
              deckCardProps={deckCardProps}
            />
          ) : (
            <>
              <div className={view === 'grid' ? gridClasses : listClasses}>
                {catalogItems.map((d) => renderCatalogCard(d))}
              </div>
              {hasMoreCatalog && !debouncedQ && (
                <div className='mt-8 text-center'>
                  <button
                    type='button'
                    className='btn btn-secondary btn-lg'
                    onClick={() => void catalogInfinite.fetchNextPage()}
                    disabled={catalogLoading}
                  >
                    {catalogLoading
                      ? t('common.loading')
                      : t('explore.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'personal' && (
        <>
          {personalLoading ? (
            <div className={gridClasses}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn('skeleton', skeletonCardClasses)} />
              ))}
            </div>
          ) : (
            <>
              <h2 className={sectionTitleClasses}>
                {t('materials.sectionOwned')}
              </h2>
              {personalOwned.length === 0 ? (
                <p className='text-text3 px-6 py-8 text-center'>
                  {t('materials.noOwned')}
                </p>
              ) : (
                <div className={view === 'grid' ? gridClasses : listClasses}>
                  {personalOwned.map((d) => (
                    <MaterialsDeckCard
                      key={d.id}
                      deck={d}
                      ctx='personalOwned'
                      view={view}
                      {...deckCardProps}
                      isSaved={false}
                    />
                  ))}
                </div>
              )}

              {canTeach && (
                <>
                  <h2 className={sectionTitleClasses}>
                    {t('materials.sectionSaved')}
                  </h2>
                  {personalSaved.length === 0 ? (
                    <p className='text-text3 px-6 py-8 text-center'>
                      {t('materials.noSaved')}
                    </p>
                  ) : (
                    <div
                      className={view === 'grid' ? gridClasses : listClasses}
                    >
                      {personalSaved.map((d) => (
                        <MaterialsDeckCard
                          key={d.id}
                          deck={d}
                          ctx='personalSaved'
                          view={view}
                          {...deckCardProps}
                          isSaved
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <div className='mt-6 flex flex-wrap items-center gap-3'>
            <span className='text-text3 text-sm'>
              {t('materials.personalViewToggle')}
            </span>
            <div className='border-border bg-surface flex gap-1 rounded-[12px] border p-1'>
              <button
                type='button'
                className={cn(viewBtnBase, view === 'grid' && viewBtnActive)}
                onClick={() => setView('grid')}
              >
                ▦
              </button>
              <button
                type='button'
                className={cn(viewBtnBase, view === 'list' && viewBtnActive)}
                onClick={() => setView('list')}
              >
                ☰
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'whiteboards' && (
        <div className='border-border bg-surface text-text3 rounded-[20px] border p-12 text-center'>
          <p>{t('materials.whiteboardsSoon')}</p>
        </div>
      )}

      {listingDeck && (
        <div
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-[2px]'
          role='presentation'
          onClick={() => !listingSaving && setListingDeck(null)}
        >
          <div
            className='border-border bg-surface w-[min(420px,calc(100vw-32px))] rounded-[20px] border p-6'
            role='dialog'
            aria-labelledby='materials-listing-title'
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id='materials-listing-title'
              className='font-display mb-4 text-lg'
            >
              {t('materials.listingModalTitle', { title: listingDeck.title })}
            </h3>
            <label className='mb-3 flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={listingListed}
                className='accent-brand-light'
                onChange={(e) => setListingListed(e.target.checked)}
              />
              {t('materials.listingCheckbox')}
            </label>
            <div className='mb-3'>
              <label
                htmlFor='mat-cefr'
                className='text-text2 mb-1.5 block text-[13px]'
              >
                {t('materials.cefrLabel')}
              </label>
              <select
                id='mat-cefr'
                className='input-field'
                value={listingCefr}
                onChange={(e) => setListingCefr(e.target.value)}
              >
                <option value=''>{t('materials.cefrNone')}</option>
                {CEFR_LEVEL_CODES.map((code) => (
                  <option key={code} value={code}>
                    {t(`cefr.${code}.short`)} — {t(`cefr.${code}.title`)}
                  </option>
                ))}
              </select>
            </div>
            <div className='mb-3'>
              <label
                htmlFor='mat-price'
                className='text-text2 mb-1.5 block text-[13px]'
              >
                {t('materials.priceLabel')}
              </label>
              <input
                id='mat-price'
                type='number'
                min={0}
                step={0.01}
                className='input-field'
                value={listingPriceUsd}
                onChange={(e) => setListingPriceUsd(e.target.value)}
                placeholder='0'
              />
              <p className='text-text3 mt-1.5 text-xs'>
                {t('materials.priceHint')}
              </p>
            </div>
            {listingListed && listingDeck.visibility !== 'PUBLIC' && (
              <p className='text-text3 mb-3 text-xs'>
                {t('materials.listingNeedsPublic')}
              </p>
            )}
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                className='btn btn-secondary'
                disabled={listingSaving}
                onClick={() => setListingDeck(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type='button'
                className='btn btn-primary'
                disabled={listingSaving}
                onClick={() => void submitListing()}
              >
                {listingSaving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
