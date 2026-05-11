import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Modal } from '@ui';

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
  parseLocalIso,
  rangeOverlaps,
  shiftWeek,
  WEEK_GRID_HALF_HOUR_ROWS,
  weekRangeLabel,
} from '@/shared/lib/calendar';
import { classNames } from '@/shared/lib/classNames';
import { useConfirm } from '@/shared/lib/confirm';

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

const cellOpen = tw`bg-green-500/20 text-green-700 hover:bg-green-500/35 dark:text-green-400`;
const cellBooked = tw`bg-[var(--accent)]/20 text-[var(--accent)] cursor-default`;
const cellBlocked = tw`bg-[var(--text3)]/15 text-[var(--text3)] hover:bg-[var(--text3)]/25`;
const cellPast = tw`cursor-not-allowed bg-transparent text-[var(--text3)]/40`;
const cellEmpty = tw`cursor-pointer bg-transparent text-transparent hover:bg-[var(--brand)]/10`;

export function AvailabilityEditor({
  variant = 'default',
}: {
  variant?: AvailabilityEditorVariant;
}) {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d);
  });
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [meetingModalSlot, setMeetingModalSlot] = useState<SlotDTO | null>(
    null,
  );
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [scheduleCtx, setScheduleCtx] = useState<ScheduleModalContext | null>(
    null,
  );

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

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await availabilityApi.myAvailability(
        formatLocalIso(range.start),
        formatLocalIso(range.endExclusive),
      );
      setSlots(data as SlotDTO[]);
    } catch {
      toast.error(t('availability.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [range.start, range.endExclusive, t]);

  useEffect(() => {
    void fetchSlots();
  }, [fetchSlots]);

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
      const { data } = await availabilityApi.patchMeetingUrl(
        meetingModalSlot.id,
        { meetingUrl: meetingDraft.trim() },
      );
      const patch = data;
      setSlots((prev) =>
        prev.map((s) =>
          s.id === meetingModalSlot.id
            ? {
                ...s,
                meetingUrl: patch.meetingUrl ?? (meetingDraft.trim() || null),
              }
            : s,
        ),
      );
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
      const { data } = await availabilityApi.patchMeetingUrl(
        meetingModalSlot.id,
        { meetingUrl: '' },
      );
      setSlots((prev) =>
        prev.map((s) =>
          s.id === meetingModalSlot.id
            ? { ...s, meetingUrl: data.meetingUrl ?? null }
            : s,
        ),
      );
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
      <header className='mb-4 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-bold'>{t('availability.title')}</h2>
          <p className='mt-0.5 text-sm text-[var(--text2)]'>
            {t('availability.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-1.5'>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
          >
            ←
          </button>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            {t('availability.today')}
          </button>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
          >
            →
          </button>
          <span className='ml-1 text-sm font-medium text-[var(--text2)]'>
            {weekRangeLabel(range.start, range.endExclusive, i18n.language)}
          </span>
        </div>
      </header>

      <div
        className={classNames(
          'overflow-auto rounded-xl border border-[var(--border)]',
          variant === 'page' ? 'flex-1' : '',
        )}
        aria-busy={loading}
      >
        <div
          className='grid min-w-[640px]'
          style={{ gridTemplateColumns: '3.5rem repeat(7, 1fr)' }}
        >
          <div className='h-9 border-r border-b border-[var(--border)]' />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className='flex h-9 items-center justify-center border-r border-b border-[var(--border)] text-[12px] font-semibold last:border-r-0'
            >
              {dayLabel(d)}
            </div>
          ))}

          {WEEK_GRID_HALF_HOUR_ROWS.map(({ h, m }) => (
            <React.Fragment key={`${h}-${m}`}>
              <div className='flex items-center justify-end border-r border-b border-[var(--border)] pr-2 text-[11px] text-[var(--text3)]'>
                {formatHalfHourLabel(h, m)}
              </div>
              {days.map((d) => {
                const slot = findSlotAt(d, h, m);
                const cellDate = new Date(d);
                cellDate.setHours(h, m, 0, 0);
                const pastEmpty = cellDate.getTime() < Date.now() && !slot;

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

                const cellKey = `${d.toISOString()}-${h}-${m}`;

                return (
                  <button
                    key={cellKey}
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

      <footer className='mt-3 flex flex-wrap gap-4 text-[12px] text-[var(--text2)]'>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-green-500/25' />{' '}
          {t('availability.statusOpen')}
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-[var(--accent)]/20' />{' '}
          {t('availability.statusBooked')}
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-3 w-3 rounded-sm bg-[var(--text3)]/15' />{' '}
          {t('availability.statusBlocked')}
        </span>
      </footer>

      {scheduleCtx && (
        <ScheduleSlotModal
          ctx={scheduleCtx}
          onClose={() => setScheduleCtx(null)}
          onSaved={() => void fetchSlots()}
          onOpenMeetingModal={(s) => openMeetingModal(s as SlotDTO)}
          onCancelBooking={(s) => void cancelBookingForSlot(s as SlotDTO)}
        />
      )}

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
