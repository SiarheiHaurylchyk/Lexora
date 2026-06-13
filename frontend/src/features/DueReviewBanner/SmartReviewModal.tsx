import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@ui';
import { Brain, Check, Layers } from 'lucide-react';

import type { DueSummary } from '@/shared/api/types';

interface SmartReviewModalProps {
  summary: DueSummary;
  onClose: () => void;
}

/**
 * Быстрый выбор количества карточек кнопками.
 * «Все» добавляется динамически по числу карточек к повтору.
 */
const QUICK_COUNTS = [5, 10, 20, 50] as const;

type CountOption = (typeof QUICK_COUNTS)[number] | 'all';
type DirOption = 'forward' | 'reverse' | 'mixed';

/**
 * Модалка «умного повторения» — настройка SM-2-сессии перед стартом.
 *
 * Элементы управления:
 *  1. Сколько карточек — кнопки 5, 10, 20, 50, Все.
 *  2. Какие колоды — чекбоксы колод с due-карточками.
 *  3. Направление — forward / reverse / mixed.
 *
 * По «Старт» переход на /study/due-review с query-параметрами,
 * которые читает `useDueReviewSession` для фильтрации и среза пула.
 */
export function SmartReviewModal({ summary, onClose }: SmartReviewModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Выбранные колоды ──────────────────────────────────────────────────────
  // По умолчанию выбраны все.
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<number>>(
    () => new Set(summary.decks.map((d) => d.deckId)),
  );

  // ── Количество карточек ───────────────────────────────────────────────────
  const [selectedCount, setSelectedCount] = useState<CountOption>('all');

  // ── Направление ───────────────────────────────────────────────────────────
  const [dir, setDir] = useState<DirOption>('forward');

  // ── Производные значения ──────────────────────────────────────────────────
  /** Всего due-карточек в выбранных колодах. */
  const dueInSelectedDecks = useMemo(
    () =>
      summary.decks
        .filter((d) => selectedDeckIds.has(d.deckId))
        .reduce((sum, d) => sum + d.dueCount, 0),
    [summary.decks, selectedDeckIds],
  );

  /** Сколько карточек реально пойдёт в повтор (с учётом лимита). */
  const actualCardCount =
    selectedCount === 'all'
      ? dueInSelectedDecks
      : Math.min(selectedCount, dueInSelectedDecks);

  const canStart = selectedDeckIds.size > 0 && dueInSelectedDecks > 0;

  // ── Обработчики ───────────────────────────────────────────────────────────
  const toggleDeck = (deckId: number) => {
    setSelectedDeckIds((prev) => {
      const next = new Set(prev);
      if (next.has(deckId)) {
        next.delete(deckId);
      } else {
        next.add(deckId);
      }
      return next;
    });
  };

  const toggleAllDecks = () => {
    if (selectedDeckIds.size === summary.decks.length) {
      setSelectedDeckIds(new Set());
    } else {
      setSelectedDeckIds(new Set(summary.decks.map((d) => d.deckId)));
    }
  };

  const startReview = () => {
    const params = new URLSearchParams({ dir });
    if (selectedCount !== 'all') {
      params.set('limit', String(selectedCount));
    }
    // Фильтр колод передаём только если выбрано подмножество (не все).
    if (selectedDeckIds.size < summary.decks.length) {
      params.set('decks', [...selectedDeckIds].join(','));
    }
    onClose();
    navigate(`/study/due-review?${params.toString()}`);
  };

  return (
    <Modal title={t('srs.modal.title')} onClose={onClose}>
      <div className='flex flex-col gap-6'>
        {/* ── Бейдж «всего к повтору» ─────────────────────────────────────── */}
        <div className='bg-brand/10 border-brand/25 flex items-center gap-3 rounded-[14px] border px-4 py-3'>
          <Brain size={22} className='text-brand-light shrink-0' aria-hidden />
          <p className='text-text2 text-sm'>
            {t('srs.modal.totalDue', { count: summary.totalDue })}
          </p>
        </div>

        {/* ── 1. Сколько карточек? ────────────────────────────────────────── */}
        <section>
          <p className='text-text3 mb-3 text-[11px] font-bold tracking-[0.1em] uppercase'>
            {t('srs.modal.howMany')}
          </p>
          <div className='flex flex-wrap gap-2'>
            {QUICK_COUNTS.filter((c) => c < dueInSelectedDecks).map((count) => (
              <button
                key={count}
                type='button'
                className={cn(
                  'btn btn-sm min-w-[48px]',
                  selectedCount === count ? 'btn-primary' : 'btn-secondary',
                )}
                onClick={() => setSelectedCount(count)}
              >
                {count}
              </button>
            ))}
            <button
              type='button'
              className={cn(
                'btn btn-sm',
                selectedCount === 'all' ? 'btn-primary' : 'btn-secondary',
              )}
              onClick={() => setSelectedCount('all')}
            >
              {t('srs.modal.allCount', { count: dueInSelectedDecks })}
            </button>
          </div>
        </section>

        {/* ── 2. Какие колоды? ────────────────────────────────────────────── */}
        {summary.decks.length > 1 && (
          <section>
            <div className='mb-3 flex items-center justify-between'>
              <p className='text-text3 text-[11px] font-bold tracking-[0.1em] uppercase'>
                {t('srs.modal.byDecks')}
              </p>
              <button
                type='button'
                className='text-brand-light text-xs hover:underline'
                onClick={toggleAllDecks}
              >
                {selectedDeckIds.size === summary.decks.length
                  ? t('srs.modal.deselectAll')
                  : t('srs.modal.selectAll')}
              </button>
            </div>

            <div className='flex flex-col gap-2'>
              {summary.decks.map((deck) => {
                const isSelected = selectedDeckIds.has(deck.deckId);
                return (
                  <button
                    key={deck.deckId}
                    type='button'
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors duration-150',
                      isSelected
                        ? 'border-brand/40 bg-brand/8'
                        : 'border-border bg-surface hover:border-border2',
                    )}
                    onClick={() => toggleDeck(deck.deckId)}
                  >
                    {/* Индикатор чекбокса */}
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-brand bg-brand text-white'
                          : 'border-border2 bg-transparent',
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </span>

                    <span className='text-lg leading-none'>
                      {deck.emoji || '📚'}
                    </span>

                    <span className='flex-1 text-sm font-medium'>
                      {deck.deckTitle}
                    </span>

                    <span className='badge badge-warning shrink-0 text-[11px]'>
                      {t('srs.modal.dueCards', { count: deck.dueCount })}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 3. Направление ──────────────────────────────────────────────── */}
        <section>
          <p className='text-text3 mb-3 text-[11px] font-bold tracking-[0.1em] uppercase'>
            {t('srs.modal.direction')}
          </p>
          <div className='grid grid-cols-3 gap-2'>
            {(
              [
                { id: 'forward', label: t('srs.modal.dir.forward') },
                { id: 'reverse', label: t('srs.modal.dir.reverse') },
                { id: 'mixed', label: t('srs.modal.dir.mixed') },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type='button'
                className={cn(
                  'btn btn-sm',
                  dir === id ? 'btn-primary' : 'btn-secondary',
                )}
                onClick={() => setDir(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── 4. Подсказка ────────────────────────────────────────────────── */}
        <div className='border-border rounded-[12px] border px-4 py-3'>
          <div className='mb-1.5 flex items-center gap-2'>
            <Layers size={15} className='text-text3 shrink-0' aria-hidden />
            <span className='text-text3 text-[11px] font-semibold tracking-[0.08em] uppercase'>
              {t('srs.modal.tipTitle')}
            </span>
          </div>
          <p className='text-text3 text-xs leading-[1.5]'>
            {t('srs.modal.tipBody')}
          </p>
        </div>

        {/* ── Кнопка старта ───────────────────────────────────────────────── */}
        <button
          type='button'
          className='btn btn-primary w-full justify-center py-3 text-base font-bold'
          disabled={!canStart}
          onClick={startReview}
        >
          {t('srs.modal.start', { count: actualCardCount })}
        </button>
      </div>
    </Modal>
  );
}
