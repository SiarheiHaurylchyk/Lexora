import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi, materialsApi } from '../services/api';
import type { DeckItem } from '../services/types';
import { useAppSelector } from '../store/hooks';
import { userCanTeach } from '../lib/accountRole';
import { getApiErrorMessage } from '../lib/apiError';
import { PageHeader } from '../components/ui';
import styles from './MaterialsPage.module.css';

type TabKey = 'catalog' | 'personal' | 'whiteboards';

const PAGE_SIZE = 20;

export default function MaterialsPage() {
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

  /** deckId -> librarySaveId for catalog tab */
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
      /* ignore — catalog still works */
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
        toast.error(getApiErrorMessage(err) || t('materials.catalogLoadFailed'));
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
    const price = listingPriceUsd.trim() === '' ? 0 : Math.round(Number(listingPriceUsd) * 100);
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
      setPersonalOwned((prev) => prev.map((d) => (d.id === data.id ? { ...d, ...data } : d)));
      setListingDeck(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('materials.listingSaveFailed'));
    } finally {
      setListingSaving(false);
    }
  };

  const saveToLibrary = async (e: React.MouseEvent, deck: DeckItem) => {
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

  const removeFromLibrary = async (e: React.MouseEvent, deckId: number) => {
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

  const shareWithStudent = async (e: React.MouseEvent, deckId: number) => {
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

  const cardInner = (deck: DeckItem, ctx: 'catalog' | 'personalOwned' | 'personalSaved') => {
    const accent = deck.coverColor || '#7C3AED';
    const isMine = myUserId != null && deck.owner?.id === myUserId;
    const savedId = savedMap.get(deck.id);
    const isSaved = savedId != null;
    const cents = deck.catalogPriceCents;
    const priceLabel =
      cents != null && cents > 0
        ? (() => {
            const dollars = cents / 100;
            const label = dollars % 1 === 0 ? String(Math.round(dollars)) : dollars.toFixed(2);
            return t('materials.priceUsd', { amount: label });
          })()
        : t('materials.free');
    const sourceLabel =
      ctx === 'personalOwned'
        ? t('materials.sourceYours')
        : isMine
          ? t('materials.sourceYours')
          : t('materials.sourceCommunity');

    const badges = (
      <div className={styles.cardBadges}>
        {deck.cefrLevel?.trim() && <span className={styles.badge}>{deck.cefrLevel.trim()}</span>}
        <span
          className={`${styles.badge} ${
            deck.catalogPriceCents != null && deck.catalogPriceCents > 0 ? styles.pricePaid : styles.priceFree
          }`}
        >
          {priceLabel}
        </span>
      </div>
    );

    const actions = (
      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/decks/${deck.id}`)}>
          {t('common.view')}
        </button>
        {deck.cardCount > 0 && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/decks/${deck.id}/study/FLASHCARD`)}
          >
            {t('materials.study')}
          </button>
        )}
        {canTeach && ctx === 'catalog' && !isMine && (
          <button
            type="button"
            className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
            onClick={(e) => (isSaved ? removeFromLibrary(e, deck.id) : saveToLibrary(e, deck))}
          >
            {isSaved ? t('materials.inLibrary') : t('materials.addToLibrary')}
          </button>
        )}
        {canTeach && ctx === 'personalSaved' && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => removeFromLibrary(e, deck.id)}>
            {t('materials.removeFromLibrary')}
          </button>
        )}
        {canTeach && classLinkOk && (ctx === 'catalog' || ctx === 'personalSaved') && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => shareWithStudent(e, deck.id)}>
            {t('materials.shareWithStudent')}
          </button>
        )}
        {canTeach && classLinkOk && ctx === 'personalOwned' && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => shareWithStudent(e, deck.id)}>
            {t('materials.shareWithStudent')}
          </button>
        )}
        {canTeach && ctx === 'personalOwned' && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openListingModal(deck)}>
            {t('materials.catalogListing')}
          </button>
        )}
      </div>
    );

    if (view === 'grid') {
      return (
        <div key={deck.id} className={styles.card} onClick={() => navigate(`/decks/${deck.id}`)}>
          <div className={styles.cardCover} style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
            <span className={styles.cardCoverEmoji}>{deck.emoji || '📚'}</span>
            {badges}
          </div>
          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>{deck.title}</h3>
            <div className={styles.cardMeta}>{sourceLabel}</div>
            <div className={styles.cardLang}>
              {deck.sourceLanguage} → {deck.targetLanguage} · {deck.cardCount} {t('common.cards')}
            </div>
            {deck.listedInMaterialsCatalog && ctx === 'personalOwned' && (
              <div className={styles.cardMeta}>{t('materials.listedInCatalog')}</div>
            )}
            {actions}
          </div>
        </div>
      );
    }

    return (
      <div key={deck.id} className={styles.row} onClick={() => navigate(`/decks/${deck.id}`)}>
        <div className={styles.rowCover} style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}>
          {deck.emoji || '📚'}
        </div>
        <div className={styles.rowMain}>
          <h3 className={styles.rowTitle}>{deck.title}</h3>
          <div className={styles.rowMeta}>
            {sourceLabel} · {priceLabel}
            {deck.cefrLevel?.trim() ? ` · ${deck.cefrLevel.trim()}` : ''}
          </div>
          <div className={styles.rowMeta}>
            {deck.sourceLanguage} → {deck.targetLanguage} · {deck.cardCount} {t('common.cards')}
          </div>
        </div>
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader title={t('materials.title')} subtitle={t('materials.subtitle')} />

      {canTeach && classLinkOk && (
        <div className={styles.classBanner}>
          <strong>{t('materials.classContextTitle')}</strong> — {t('materials.classContextBody')}
        </div>
      )}

      <div className={styles.tabs}>
        {(['catalog', 'personal', 'whiteboards'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`}
            onClick={() => setTab(k)}
          >
            {t(`materials.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={`input-field ${styles.searchInput}`}
                placeholder={t('materials.searchPlaceholder')}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                aria-label={t('materials.searchPlaceholder')}
              />
              {catalogSearching && <span className={styles.spin}>⟳</span>}
            </div>
            <select
              className={`input-field ${styles.sortSelect}`}
              value={sort}
              onChange={(e) => setSort(e.target.value as 'popular' | 'new')}
              aria-label={t('materials.sortLabel')}
            >
              <option value="popular">{t('materials.sortPopular')}</option>
              <option value="new">{t('materials.sortNew')}</option>
            </select>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('grid')}
              >
                ▦
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('list')}
              >
                ☰
              </button>
            </div>
            <span className={styles.toolbarMeta}>{t('materials.total', { count: catalogTotal })}</span>
          </div>

          {catalogLoading && catalogItems.length === 0 ? (
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonCard}`} />
              ))}
            </div>
          ) : catalogItems.length === 0 ? (
            <div className={styles.empty}>{t('materials.catalogEmpty')}</div>
          ) : (
            <>
              <div className={view === 'grid' ? styles.grid : styles.list}>
                {catalogItems.map((d) => cardInner(d, 'catalog'))}
              </div>
              {hasMoreCatalog && !debouncedQ && (
                <div className={styles.loadMoreWrap}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={loadMoreCatalog}
                    disabled={catalogLoading}
                  >
                    {catalogLoading ? t('common.loading') : t('explore.loadMore')}
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
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonCard}`} />
              ))}
            </div>
          ) : (
            <>
              <h2 className={styles.sectionTitle}>{t('materials.sectionOwned')}</h2>
              {personalOwned.length === 0 ? (
                <p className={styles.empty}>{t('materials.noOwned')}</p>
              ) : (
                <div className={view === 'grid' ? styles.grid : styles.list}>
                  {personalOwned.map((d) => cardInner(d, 'personalOwned'))}
                </div>
              )}

              {canTeach && (
                <>
                  <h2 className={styles.sectionTitle}>{t('materials.sectionSaved')}</h2>
                  {personalSaved.length === 0 ? (
                    <p className={styles.empty}>{t('materials.noSaved')}</p>
                  ) : (
                    <div className={view === 'grid' ? styles.grid : styles.list}>
                      {personalSaved.map((d) => cardInner(d, 'personalSaved'))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <div className={styles.toolbar} style={{ marginTop: 24 }}>
            <span className={styles.toolbarMeta}>{t('materials.personalViewToggle')}</span>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('grid')}
              >
                ▦
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('list')}
              >
                ☰
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'whiteboards' && (
        <div className={styles.placeholderPanel}>
          <p>{t('materials.whiteboardsSoon')}</p>
        </div>
      )}

      {listingDeck && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => !listingSaving && setListingDeck(null)}
        >
          <div className={styles.modal} role="dialog" aria-labelledby="materials-listing-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="materials-listing-title">{t('materials.listingModalTitle', { title: listingDeck.title })}</h3>
            <label className={styles.modalField}>
              <input
                type="checkbox"
                checked={listingListed}
                onChange={(e) => setListingListed(e.target.checked)}
              />{' '}
              {t('materials.listingCheckbox')}
            </label>
            <div className={styles.modalField}>
              <label htmlFor="mat-cefr">{t('materials.cefrLabel')}</label>
              <input
                id="mat-cefr"
                type="text"
                className="input-field"
                value={listingCefr}
                onChange={(e) => setListingCefr(e.target.value)}
                placeholder="B1, B2/B2+…"
                maxLength={32}
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="mat-price">{t('materials.priceLabel')}</label>
              <input
                id="mat-price"
                type="number"
                min={0}
                step={0.01}
                className="input-field"
                value={listingPriceUsd}
                onChange={(e) => setListingPriceUsd(e.target.value)}
                placeholder="0"
              />
              <p className={styles.modalHint}>{t('materials.priceHint')}</p>
            </div>
            {listingListed && listingDeck.visibility !== 'PUBLIC' && (
              <p className={styles.modalHint}>{t('materials.listingNeedsPublic')}</p>
            )}
            <div className={styles.modalActions}>
              <button type="button" className="btn btn-secondary" disabled={listingSaving} onClick={() => setListingDeck(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary" disabled={listingSaving} onClick={() => void submitListing()}>
                {listingSaving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
