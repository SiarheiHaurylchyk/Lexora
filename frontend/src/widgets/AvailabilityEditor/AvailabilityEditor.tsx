import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  type ScheduleModalContext,
  ScheduleSlotModal,
} from '@/features/ScheduleSlot';

import { availabilityApi } from '@/shared/api/api-legacy';
import type { TeacherSlotItem } from '@/shared/api/types';
import {
  buildWeekRange,
  formatHalfHourLabel,
  formatLocalIso,
  isToday,
  parseLocalIso,
  rangeOverlaps,
  shiftWeek,
  WEEK_GRID_HALF_HOUR_ROWS,
  weekRangeLabel,
} from '@/shared/lib/calendar';
import { useConfirm } from '@/shared/lib/confirm';
import { useApiQuery } from '@/shared/lib/query';

export type AvailabilityEditorVariant = 'default' | 'page';

interface SlotDTO extends TeacherSlotItem {
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
}

function apiMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  out.setDate(out.getDate() + (dow === 0 ? -6 : 1 - dow));
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Row index in WEEK_GRID_HALF_HOUR_ROWS for a given hour (e.g. 9 → row 17). */
function rowIndexForHour(hour: number): number {
  // Row 0 = 00:30, Row 1 = 01:00 … Row 17 = 09:00
  if (hour === 0) return 0;
  return (hour - 1) * 2 + 1;
}

const CELL_HEIGHT_PX = 32; // matches h-8
const HEADER_ROW_PX = 36; // matches h-9
const SCROLL_TO_HOUR = 8; // auto-scroll to 8 AM on mount

// Cell colour schemes — open/booked/blocked/past/empty
const cellOpen = tw`bg-green-500/20 text-green-700 hover:bg-green-500/35 dark:text-green-400`;
const cellBooked = tw`bg-[var(--accent)]/20 text-[var(--accent)] cursor-default`;
const cellBlocked = tw`bg-[var(--text3)]/15 text-[var(--text3)] hover:bg-[var(--text3)]/25`;
const cellPast = tw`cursor-not-allowed bg-transparent text-[var(--text3)]/40`;
const cellEmpty = tw`cursor-pointer bg-transparent text-transparent hover:bg-[var(--brand)]/10`;

/** Stat pill used in the summary bar. */
function StatPill({ color, label }: { color: string; label: string }) {
  return (
    <span className='flex items-center gap-1.5 text-[12px] text-[var(--text2)]'>
      <span
        className='h-2.5 w-2.5 shrink-0 rounded-sm'
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export function AvailabilityEditor({
  variant = 'default',
}: {
  variant?: AvailabilityEditorVariant;
}) {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d);
  });
  const [meetingModalSlot, setMeetingModalSlot] = useState<SlotDTO | null>(
    null,
  );
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [scheduleCtx, setScheduleCtx] = useState<ScheduleModalContext | null>(
    null,
  );
  const queryClient = useQueryClient();

  const range = useMemo(() => buildWeekRange(weekStart), [weekStart]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const fromIso = formatLocalIso(range.start);
  const toIso = formatLocalIso(range.endExclusive);
  const slotsQuery = useApiQuery<SlotDTO[]>({
    queryKey: ['availability', 'mine', fromIso, toIso],
    url: `/me/availability?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
  });
  const slots: SlotDTO[] = slotsQuery.data ?? [];
  const loading = slotsQuery.isLoading;
  useEffect(() => {
    if (slotsQuery.isError) toast.error(t('availability.loadFailed'));
  }, [slotsQuery.isError, t]);

  // Week-level stats shown in the summary bar
  const weekStats = useMemo(
    () => ({
      open: slots.filter((s) => s.status === 'OPEN').length,
      booked: slots.filter((s) => s.status === 'BOOKED').length,
      blocked: slots.filter((s) => s.status === 'BLOCKED').length,
    }),
    [slots],
  );

  // Auto-scroll to business hours (SCROLL_TO_HOUR) when the grid first mounts
  useEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const rowIdx = rowIndexForHour(SCROLL_TO_HOUR);
    const scrollTarget = HEADER_ROW_PX + rowIdx * CELL_HEIGHT_PX - 80;
    el.scrollTop = Math.max(0, scrollTarget);
  }, []);

  const fetchSlots = () =>
    queryClient.invalidateQueries({ queryKey: ['availability', 'mine'] });

  const findSlotAt = (
    date: Date,
    hour: number,
    minute: number,
  ): SlotDTO | undefined => {
    const startTs = new Date(date);
    startTs.setHours(hour, minute, 0, 0);
    const endTs = new Date(startTs);
    endTs.setMinutes(endTs.getMinutes() + 30);
    return slots.find((s) =>
      rangeOverlaps(
        parseLocalIso(s.startTime),
        parseLocalIso(s.endTime),
        startTs,
        endTs,
      ),
    );
  };

  const openMeetingModal = (slot: SlotDTO) => {
    setMeetingModalSlot(slot);
    setMeetingDraft(slot.meetingUrl?.trim() ?? '');
  };

  const saveMeetingUrl = async () => {
    if (!meetingModalSlot) return;
    setMeetingSaving(true);
    try {
      await availabilityApi.patchMeetingUrl(meetingModalSlot.id, {
        meetingUrl: meetingDraft.trim(),
      });
      await fetchSlots();
      toast.success(t('availability.meetingSaved'));
      setMeetingModalSlot(null);
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.meetingSaveFailed'));
    } finally {
      setMeetingSaving(false);
    }
  };

  const clearMeetingUrl = async () => {
    if (!meetingModalSlot) return;
    setMeetingSaving(true);
    try {
      await availabilityApi.patchMeetingUrl(meetingModalSlot.id, {
        meetingUrl: '',
      });
      await fetchSlots();
      toast.success(t('availability.meetingCleared'));
      setMeetingModalSlot(null);
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.meetingSaveFailed'));
    } finally {
      setMeetingSaving(false);
    }
  };

  const cancelBookingForSlot = async (existing: SlotDTO) => {
    const name =
      existing.bookedBy?.displayName?.trim() ||
      existing.bookedBy?.username?.trim() ||
      '';
    const ok = await confirm({
      message: t('availability.cancelBookingConfirm', { name }),
      variant: 'danger',
      confirmText: t('availability.cancelBooking'),
    });
    if (!ok) return;
    try {
      await availabilityApi.cancelBooking(existing.id);
      toast.success(t('availability.bookingCancelled'));
      await fetchSlots();
      setScheduleCtx(null);
    } catch {
      toast.error(t('availability.cancelBookingFailed'));
    }
  };

  const dayLabel = (d: Date) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: 'short',
      day: 'numeric',
    }).format(d);

  return (
    <div className={cn('flex flex-col', variant === 'page' && 'h-full')}>
      {/* ── Page header: title + week navigation ─────────────────────────── */}
      <header className='mb-3 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>{t('availability.title')}</h2>
          <p className='mt-0.5 text-sm text-[var(--text2)]'>
            {t('availability.subtitle')}
          </p>
        </div>

        <div className='flex items-center gap-1'>
          {/* Previous week */}
          <button
            type='button'
            className='btn btn-ghost btn-sm flex h-8 w-8 items-center justify-center p-0'
            aria-label={t('availability.prevWeek')}
            onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Jump to current week */}
          <button
            type='button'
            className='btn btn-ghost btn-sm px-3 text-[13px]'
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            {t('availability.today')}
          </button>

          {/* Next week */}
          <button
            type='button'
            className='btn btn-ghost btn-sm flex h-8 w-8 items-center justify-center p-0'
            aria-label={t('availability.nextWeek')}
            onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
          >
            <ChevronRight size={18} />
          </button>

          {/* Week range label */}
          <span className='ml-2 text-sm font-semibold text-[var(--text2)]'>
            {weekRangeLabel(range.start, range.endExclusive, i18n.language)}
          </span>
        </div>
      </header>

      {/* ── Weekly stats bar ─────────────────────────────────────────────── */}
      {!loading && (
        <div className='mb-3 flex flex-wrap items-center gap-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5'>
          <StatPill
            color='rgba(34,197,94,0.6)'
            label={t('availability.statsOpen', { count: weekStats.open })}
          />
          <StatPill
            color='var(--accent)'
            label={t('availability.statsBooked', { count: weekStats.booked })}
          />
          <StatPill
            color='var(--text3)'
            label={t('availability.statsBlocked', { count: weekStats.blocked })}
          />

          {/* Tip when nothing is set yet */}
          {slots.length === 0 && (
            <span className='ml-auto text-[12px] text-[var(--text3)]'>
              {t('availability.emptyWeekHint')}
            </span>
          )}
        </div>
      )}

      {/* ── Week grid ────────────────────────────────────────────────────── */}
      <div
        ref={gridScrollRef}
        className={cn(
          'overflow-auto rounded-xl border border-[var(--border)]',
          variant === 'page' ? 'flex-1' : '',
        )}
        aria-busy={loading}
      >
        <div
          className='grid min-w-[640px]'
          style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)' }}
        >
          {/* Header row: time label gutter + 7 day columns */}
          <div className='sticky top-0 z-10 h-9 border-r border-b border-[var(--border)] bg-[var(--surface)]' />
          {days.map((d) => {
            const todayCol = isToday(d);
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  'sticky top-0 z-10 flex h-9 items-center justify-center border-r border-b border-[var(--border)] text-[12px] font-semibold last:border-r-0',
                  todayCol
                    ? 'bg-[var(--brand)]/10 text-[var(--brand-light)]'
                    : 'bg-[var(--surface)] text-[var(--text2)]',
                )}
              >
                {todayCol && (
                  <span className='mr-1 h-1.5 w-1.5 rounded-full bg-[var(--brand)]' />
                )}
                {dayLabel(d)}
              </div>
            );
          })}

          {/* Body: one row per 30-minute slot */}
          {WEEK_GRID_HALF_HOUR_ROWS.map(({ h, m }) => (
            <React.Fragment key={`${h}-${m}`}>
              {/* Time label */}
              <div className='flex items-center justify-end border-r border-b border-[var(--border)] pr-2 text-[11px] text-[var(--text3)]'>
                {formatHalfHourLabel(h, m)}
              </div>

              {/* 7 day cells */}
              {days.map((d) => {
                const slot = findSlotAt(d, h, m);
                const cellDate = new Date(d);
                cellDate.setHours(h, m, 0, 0);
                const pastEmpty = cellDate.getTime() < Date.now() && !slot;
                const todayCol = isToday(d);

                const label = slot
                  ? slot.status === 'BLOCKED' && slot.title?.trim()
                    ? slot.title.trim().length > 14
                      ? `${slot.title.trim().slice(0, 14)}…`
                      : slot.title.trim()
                    : slot.status === 'OPEN'
                      ? t('availability.statusOpen')
                      : slot.status === 'BOOKED'
                        ? t('availability.statusBooked')
                        : t('availability.statusBlocked')
                  : '';

                const cellCls = cn(
                  'flex h-8 w-full items-center justify-center border-r border-b border-[var(--border)] p-0.5 text-[11px] transition-colors last:border-r-0',
                  // Today column base tint (shows even on empty cells)
                  todayCol && !slot && !pastEmpty && 'bg-[var(--brand)]/[0.04]',
                  // Status colours override the tint
                  slot?.status === 'OPEN'
                    ? cellOpen
                    : slot?.status === 'BOOKED'
                      ? cellBooked
                      : slot?.status === 'BLOCKED'
                        ? cellBlocked
                        : pastEmpty
                          ? cellPast
                          : cellEmpty,
                );

                return (
                  <button
                    key={`${d.toISOString()}-${h}-${m}`}
                    type='button'
                    className={cellCls}
                    disabled={pastEmpty}
                    title={label || t('availability.openSchedule')}
                    onClick={() => {
                      if (slot) setScheduleCtx({ kind: 'slot', slot });
                      else
                        setScheduleCtx({
                          kind: 'new',
                          date: new Date(d),
                          hour: h,
                          minute: m,
                        });
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <footer className='mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--text2)]'>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-green-500/30' />
          {t('availability.statusOpen')}
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-[var(--accent)]/30' />
          {t('availability.statusBooked')}
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-[var(--text3)]/20' />
          {t('availability.statusBlocked')}
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]/30' />
          {t('availability.statusToday')}
        </span>
      </footer>

      {/* ── ScheduleSlotModal ─────────────────────────────────────────────── */}
      {scheduleCtx && (
        <ScheduleSlotModal
          ctx={scheduleCtx}
          onClose={() => setScheduleCtx(null)}
          onSaved={() => void fetchSlots()}
          onOpenMeetingModal={(s) => openMeetingModal(s as SlotDTO)}
          onCancelBooking={(s) => void cancelBookingForSlot(s as SlotDTO)}
        />
      )}

      {/* ── Meeting URL modal ─────────────────────────────────────────────── */}
      {meetingModalSlot && (
        <Modal
          title={t('availability.meetingModalTitle')}
          onClose={() => setMeetingModalSlot(null)}
        >
          <p className='mt-0 mb-3 text-sm text-[var(--text2)]'>
            {t('availability.meetingModalHelp')}
          </p>
          <label className='mb-3 block'>
            <span className='mb-1.5 block text-[13px]'>
              {t('availability.meetingUrlLabel')}
            </span>
            <input
              className='input-field w-full'
              value={meetingDraft}
              onChange={(e) => setMeetingDraft(e.target.value)}
              placeholder='https://'
              autoFocus
            />
          </label>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              className='btn btn-primary'
              disabled={meetingSaving}
              onClick={() => void saveMeetingUrl()}
            >
              {meetingSaving
                ? t('common.loading')
                : t('availability.meetingSave')}
            </button>
            <button
              type='button'
              className='btn btn-secondary'
              disabled={meetingSaving}
              onClick={() => void clearMeetingUrl()}
            >
              {t('availability.meetingClear')}
            </button>
            <button
              type='button'
              className='btn btn-ghost'
              disabled={meetingSaving}
              onClick={() => setMeetingModalSlot(null)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
