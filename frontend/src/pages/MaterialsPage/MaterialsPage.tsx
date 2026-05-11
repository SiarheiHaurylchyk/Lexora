import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@ui';

import { deckApi, materialsApi } from '@/shared/api/api-legacy';
import type { DeckItem } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAppSelector } from '@/shared/lib/storeHooks';

type TabKey = 'catalog' | 'personal' | 'whiteboards';

const PAGE_SIZE = 20;

const tabBase = tw`cursor-pointer rounded-[10px] border-0 bg-transparent px-4 py-2.5 font-inherit text-[13px] font-medium text-text2 whitespace-nowrap`;
const tabActive = tw`bg-bg3 text-text shadow-[0_0_0_1px_var(--color-border2)]`;
const viewBtnBase = tw`cursor-pointer rounded-[10px] border-0 bg-transparent px-3 py-2 font-inherit text-base text-text2`;
const viewBtnActive = tw`bg-bg3 text-text`;
const cardClasses = tw`flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-border bg-surface transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]`;
const badgeClasses = tw`rounded-full bg-[rgba(255,255,255,0.18)] px-2.5 py-0.5 text-[11px] font-semibold text-white`;
const sectionTitleClasses = tw`mb-3 mt-7 font-display text-lg`;
const skeletonCardClasses = tw`h-[260px] rounded-[20px]`;
const gridClasses = tw`grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]`;
const listClasses = tw`flex flex-col gap-2.5`;

export function MaterialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkIdParam = searchParams.get('linkId');
  const linkId = linkIdParam ? Number(linkIdParam) : NaN;
  const classLinkOk = Number.isFinite(linkId) && linkId > 0;

  const user = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(user?.role);
  const myUserId = user?.id;

  const [tab, setTab] = useState<TabKey>('catalog');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'popular' | 'new'>('popular');
  const [searchQ, setSearchQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [catalogPage, setCatalogPage] = useState(0);
  const [catalogItems, setCatalogItems] = useState<DeckItem[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [hasMoreCatalog, setHasMoreCatalog] = useState(true);

  const [personalOwned, setPersonalOwned] = useState<DeckItem[]>([]);
  const [personalSaved, setPersonalSaved] = useState<DeckItem[]>([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [savedMap, setSavedMap] = useState<Map<number, number>>(new Map());

  const [listingDeck, setListingDeck] = useState<DeckItem | null>(null);
  const [listingListed, setListingListed] = useState(false);
  const [listingPriceUsd, setListingPriceUsd] = useState('');
  const [listingCefr, setListingCefr] = useState('');
  const [listingSaving, setListingSaving] = useState(false);

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedQ(searchQ.trim()), 380);
    return () => clearTimeout(tmr);
  }, [searchQ]);

  const refreshSavedMap = useCallback(async () => {
    if (!canTeach) {
      setSavedMap(new Map());
      return;
    }
    try {
      const { data } = await materialsApi.personal();
      const next = new Map<number, number>();
      for (const d of data.savedFromCatalog || []) {
        if (d.librarySaveId != null) next.set(d.id, d.librarySaveId);
      }
      setSavedMap(next);
    } catch {
      /* ignore */
    }
  }, [canTeach]);

  useEffect(() => {
    if (tab === 'catalog' && canTeach) void refreshSavedMap();
  }, [tab, canTeach, refreshSavedMap]);

  const loadCatalogPage = useCallback(
    async (page: number, reset: boolean) => {
      if (reset) {
        setCatalogLoading(true);
        setCatalogSearching(Boolean(debouncedQ));
      }
      try {
        const { data } = await materialsApi.catalog({
          page,
          size: PAGE_SIZE,
          q: debouncedQ || undefined,
          sort,
        });
        const chunk = data.content || [];
        setCatalogTotal(data.totalElements ?? chunk.length);
        setCatalogItems((prev) => (reset ? chunk : [...prev, ...chunk]));
        const pages = data.totalPages ?? 0;
        setHasMoreCatalog(pages > 0 && page + 1 < pages);
      } catch (err) {
        toast.error(
          getApiErrorMessage(err) || t('materials.catalogLoadFailed'),
        );
      } finally {
        setCatalogLoading(false);
        setCatalogSearching(false);
      }
    },
    [debouncedQ, sort, t],
  );

  useEffect(() => {
    if (tab !== 'catalog') return;
    setCatalogPage(0);
    void loadCatalogPage(0, true);
  }, [tab, debouncedQ, sort, loadCatalogPage]);

  const loadPersonal = useCallback(async () => {
    setPersonalLoading(true);
    try {
      const { data } = await materialsApi.personal();
      setPersonalOwned(data.owned || []);
      setPersonalSaved(data.savedFromCatalog || []);
      if (canTeach) {
        const next = new Map<number, number>();
        for (const d of data.savedFromCatalog || []) {
          if (d.librarySaveId != null) next.set(d.id, d.librarySaveId);
        }
        setSavedMap(next);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.personalLoadFailed'));
    } finally {
      setPersonalLoading(false);
    }
  }, [canTeach, t]);

  useEffect(() => {
    if (tab === 'personal') void loadPersonal();
  }, [tab, loadPersonal]);

  const openListingModal = (deck: DeckItem) => {
    setListingDeck(deck);
    setListingListed(Boolean(deck.listedInMaterialsCatalog));
    const cents = deck.catalogPriceCents;
    setListingPriceUsd(cents != null && cents > 0 ? String(cents / 100) : '');
    setListingCefr(deck.cefrLevel?.trim() || '');
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
      const { data } = await materialsApi.patchListing(listingDeck.id, {
        listedInMaterialsCatalog: listingListed,
        catalogPriceCents: price,
        cefrLevel: listingCefr.trim() || null,
      });
      toast.success(t('materials.listingSaved'));
      setPersonalOwned((prev) =>
        prev.map((d) => (d.id === data.id ? { ...d, ...data } : d)),
      );
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
      const { data } = await materialsApi.saveCatalogDeck(deck.id);
      toast.success(t('materials.savedToLibrary'));
      setSavedMap((prev) => {
        const next = new Map(prev);
        if (data.librarySaveId != null) next.set(deck.id, data.librarySaveId);
        return next;
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.saveFailed'));
    }
  };

  const removeFromLibrary = async (e: MouseEvent, deckId: number) => {
    e.stopPropagation();
    try {
      await materialsApi.unsaveCatalogDeck(deckId);
      toast.success(t('materials.removedFromLibrary'));
      setSavedMap((prev) => {
        const next = new Map(prev);
        next.delete(deckId);
        return next;
      });
      setPersonalSaved((prev) => prev.filter((d) => d.id !== deckId));
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

  const loadMoreCatalog = () => {
    const next = catalogPage + 1;
    setCatalogPage(next);
    void loadCatalogPage(next, false);
  };

  const cardInner = (
    deck: DeckItem,
    ctx: 'catalog' | 'personalOwned' | 'personalSaved',
  ) => {
    const accent: string = deck.coverColor || '#7C3AED';
    const isMine = myUserId != null && deck.owner?.id === myUserId;
    const savedId = savedMap.get(deck.id);
    const isSaved = savedId != null;
    const cents = deck.catalogPriceCents;
    const priceLabel =
      cents != null && cents > 0
        ? (() => {
            const dollars = cents / 100;
            const label =
              dollars % 1 === 0
                ? String(Math.round(dollars))
                : dollars.toFixed(2);
            return t('materials.priceUsd', { amount: label });
          })()
        : t('materials.free');
    const sourceLabel =
      ctx === 'personalOwned'
        ? t('materials.sourceYours')
        : isMine
          ? t('materials.sourceYours')
          : t('materials.sourceCommunity');

    const coverStyle: CSSProperties = {
      background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
    };
    const rowCoverStyle: CSSProperties = {
      background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
    };
    const isPaid = cents != null && cents > 0;

    const badges = (
      <div className='absolute top-3 right-3 flex flex-wrap justify-end gap-1.5'>
        {deck.cefrLevel?.trim() && (
          <span className={badgeClasses}>{deck.cefrLevel.trim()}</span>
        )}
        <span
          className={cn(
            badgeClasses,
            isPaid
              ? '!bg-[#fbbf24] !text-[#1f2937]'
              : '!bg-[rgba(16,185,129,0.85)]',
          )}
        >
          {priceLabel}
        </span>
      </div>
    );

    const actions = (
      <div
        className='mt-2.5 flex flex-wrap gap-2'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={() => navigate(`/decks/${deck.id}`)}
        >
          {t('common.view')}
        </button>
        {deck.cardCount > 0 && (
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={() => navigate(`/decks/${deck.id}/study/FLASHCARD`)}
          >
            {t('materials.study')}
          </button>
        )}
        {canTeach && ctx === 'catalog' && !isMine && (
          <button
            type='button'
            className={cn(
              'btn btn-sm',
              isSaved ? 'btn-secondary' : 'btn-primary',
            )}
            onClick={(e) =>
              isSaved ? removeFromLibrary(e, deck.id) : saveToLibrary(e, deck)
            }
          >
            {isSaved ? t('materials.inLibrary') : t('materials.addToLibrary')}
          </button>
        )}
        {canTeach && ctx === 'personalSaved' && (
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={(e) => removeFromLibrary(e, deck.id)}
          >
            {t('materials.removeFromLibrary')}
          </button>
        )}
        {canTeach &&
          classLinkOk &&
          (ctx === 'catalog' ||
            ctx === 'personalSaved' ||
            ctx === 'personalOwned') && (
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={(e) => shareWithStudent(e, deck.id)}
            >
              {t('materials.shareWithStudent')}
            </button>
          )}
        {canTeach && ctx === 'personalOwned' && (
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => openListingModal(deck)}
          >
            {t('materials.catalogListing')}
          </button>
        )}
      </div>
    );

    if (view === 'grid') {
      return (
        <div
          key={deck.id}
          className={cardClasses}
          onClick={() => navigate(`/decks/${deck.id}`)}
        >
          <div
            className='relative flex h-[120px] items-center justify-center'
            style={coverStyle}
          >
            <span className='text-[44px]'>{deck.emoji || '📚'}</span>
            {badges}
          </div>
          <div className='flex flex-1 flex-col p-4'>
            <h3 className='font-display m-0 mb-1 text-base font-semibold'>
              {deck.title}
            </h3>
            <div className='text-text3 text-xs'>{sourceLabel}</div>
            <div className='text-text3 mt-1 text-xs'>
              {deck.sourceLanguage} → {deck.targetLanguage} · {deck.cardCount}{' '}
              {t('common.cards')}
            </div>
            {deck.listedInMaterialsCatalog && ctx === 'personalOwned' && (
              <div className='text-text3 mt-1 text-xs'>
                {t('materials.listedInCatalog')}
              </div>
            )}
            {actions}
          </div>
        </div>
      );
    }

    return (
      <div
        key={deck.id}
        className='border-border bg-surface hover:border-border2 flex cursor-pointer items-center gap-4 rounded-[14px] border p-3 transition-colors duration-200'
        onClick={() => navigate(`/decks/${deck.id}`)}
      >
        <div
          className='flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[12px] text-[28px]'
          style={rowCoverStyle}
        >
          {deck.emoji || '📚'}
        </div>
        <div className='min-w-0 flex-1'>
          <h3 className='m-0 mb-0.5 text-base font-semibold'>{deck.title}</h3>
          <div className='text-text3 text-xs'>
            {sourceLabel} · {priceLabel}
            {deck.cefrLevel?.trim() ? ` · ${deck.cefrLevel.trim()}` : ''}
          </div>
          <div className='text-text3 text-xs'>
            {deck.sourceLanguage} → {deck.targetLanguage} · {deck.cardCount}{' '}
            {t('common.cards')}
          </div>
        </div>
        <div
          className='flex flex-wrap gap-2'
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      </div>
    );
  };

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
          <div className='mb-5 flex flex-wrap items-center gap-3'>
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
          ) : (
            <>
              <div className={view === 'grid' ? gridClasses : listClasses}>
                {catalogItems.map((d) => cardInner(d, 'catalog'))}
              </div>
              {hasMoreCatalog && !debouncedQ && (
                <div className='mt-8 text-center'>
                  <button
                    type='button'
                    className='btn btn-secondary btn-lg'
                    onClick={loadMoreCatalog}
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
                  {personalOwned.map((d) => cardInner(d, 'personalOwned'))}
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
                      {personalSaved.map((d) => cardInner(d, 'personalSaved'))}
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
              <input
                id='mat-cefr'
                type='text'
                className='input-field'
                value={listingCefr}
                onChange={(e) => setListingCefr(e.target.value)}
                placeholder='B1, B2/B2+…'
                maxLength={32}
              />
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
