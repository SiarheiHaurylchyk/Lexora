import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@ui';

import { availabilityApi } from '@/shared/api/api-legacy';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { canLearnerCancelBooking } from '@/shared/lib/bookingRules';
import {
  buildWeekRange,
  formatLocalIso,
  parseLocalIso,
  shiftWeek,
  WEEK_GRID_HALF_HOUR_ROWS,
  weekRangeLabel,
} from '@/shared/lib/calendar';
import { classNames } from '@/shared/lib/classNames';
import { useConfirm } from '@/shared/lib/confirm';
import { useApiQuery } from '@/shared/lib/query';

interface SlotDTO {
  id: number;
  teacherId: number;
  startTime: string;
  endTime: string;
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
  bookedByMe?: boolean;
}

export type AvailabilityViewerHandle = { openModal: () => void };

interface Props {
  teacherId: number;
  isAuthenticated: boolean;
  isSelf: boolean;
  flushTop?: boolean;
}

const HOUR_BANDS: ReadonlyArray<{ lo: number; hi: number }> = [
  { lo: 0, hi: 4 },
  { lo: 4, hi: 8 },
  { lo: 8, hi: 12 },
  { lo: 12, hi: 16 },
  { lo: 16, hi: 20 },
  { lo: 20, hi: 24 },
];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function slotMatchesCell(
  slot: SlotDTO,
  dayKey: string,
  h: number,
  m: number,
): boolean {
  const start = parseLocalIso(slot.startTime);
  if (dateKeyLocal(start) !== dayKey) return false;
  return start.getHours() === h && start.getMinutes() === m;
}

function slotInBand(
  slot: SlotDTO,
  dayKey: string,
  lo: number,
  hi: number,
): boolean {
  const start = parseLocalIso(slot.startTime);
  if (dateKeyLocal(start) !== dayKey) return false;
  const minutes = start.getHours() * 60 + start.getMinutes();
  return minutes >= lo * 60 && minutes < hi * 60;
}

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  out.setDate(out.getDate() + (dow === 0 ? -6 : 1 - dow));
  out.setHours(0, 0, 0, 0);
  return out;
}

function LegendBar({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      className={classNames(
        'flex flex-wrap gap-3 text-[12px] text-[var(--text2)]',
        className ?? '',
      )}
      role='list'
    >
      <span className='flex items-center gap-1.5' role='listitem'>
        <span className='h-3 w-3 rounded-sm bg-green-500/25' aria-hidden />
        {t('availabilityViewer.legendAvailable')}
      </span>
      <span className='flex items-center gap-1.5' role='listitem'>
        <span
          className='h-3 w-3 rounded-sm bg-[var(--accent)]/20'
          aria-hidden
        />
        {t('availabilityViewer.legendBooked')}
      </span>
      <span className='flex items-center gap-1.5' role='listitem'>
        <span className='h-3 w-3 rounded-sm bg-[var(--text3)]/15' aria-hidden />
        {t('availabilityViewer.legendNotAvailable')}
      </span>
      <span className='flex items-center gap-1.5' role='listitem'>
        <span className='h-3 w-3 rounded-sm bg-[var(--brand)]/25' aria-hidden />
        {t('availabilityViewer.legendBookedByYou')}
      </span>
    </div>
  );
}

export const AvailabilityViewer = forwardRef<AvailabilityViewerHandle, Props>(
  function AvailabilityViewer(
    { teacherId, isAuthenticated, isSelf, flushTop },
    ref,
  ) {
    const { t, i18n } = useTranslation();
    const [weekStart, setWeekStart] = useState<Date>(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return startOfWeekMonday(d);
    });
    const [bookingId, setBookingId] = useState<number | null>(null);
    const [cancelId, setCancelId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const confirmDlg = useConfirm();
    const queryClient = useQueryClient();

    useImperativeHandle(ref, () => ({
      openModal: () => {
        if (!isSelf) setModalOpen(true);
      },
    }));

    const range = useMemo(() => buildWeekRange(weekStart), [weekStart]);

    const weekDays = useMemo(() => {
      const days: { date: Date; key: string }[] = [];
      const cursor = new Date(range.start);
      for (let i = 0; i < 7; i += 1) {
        days.push({ date: new Date(cursor), key: dateKeyLocal(cursor) });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    }, [range.start]);

    const todayKey = dateKeyLocal(new Date());

    const fromIso = formatLocalIso(range.start);
    const toIso = formatLocalIso(range.endExclusive);
    const slotsQuery = useApiQuery<SlotDTO[]>({
      queryKey: ['availability', 'teacher', teacherId, fromIso, toIso],
      url: `/teachers/${teacherId}/availability?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
    });
    const slots: SlotDTO[] = Array.isArray(slotsQuery.data)
      ? slotsQuery.data
      : [];
    const loading = slotsQuery.isLoading;
    const invalidateSlots = () =>
      queryClient.invalidateQueries({
        queryKey: ['availability', 'teacher', teacherId],
      });

    const openSlots = useMemo(
      () => slots.filter((s) => s.status === 'OPEN'),
      [slots],
    );

    const book = async (slot: SlotDTO) => {
      if (!isAuthenticated) {
        toast(t('availabilityViewer.signInToBook'));
        return;
      }
      setBookingId(slot.id);
      try {
        await availabilityApi.bookSlot(teacherId, slot.id);
        toast.success(t('availabilityViewer.bookedToast'));
        await invalidateSlots();
      } catch (err: unknown) {
        toast.error(
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || t('availabilityViewer.bookFailed'),
        );
      } finally {
        setBookingId(null);
      }
    };

    const cancelMine = async (slot: SlotDTO) => {
      if (!canLearnerCancelBooking(slot.startTime)) return;
      const ok = await confirmDlg({
        message: t('bookings.cancelConfirm'),
        variant: 'danger',
        confirmText: t('bookings.cancelBooking'),
      });
      if (!ok) return;
      setCancelId(slot.id);
      try {
        await availabilityApi.cancelBooking(slot.id);
        toast.success(t('bookings.cancelledToast'));
        await invalidateSlots();
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err) || t('bookings.cancelFailed'));
      } finally {
        setCancelId(null);
      }
    };

    const dayHeadFmt = useMemo(
      () =>
        new Intl.DateTimeFormat(i18n.language, {
          weekday: 'short',
          day: 'numeric',
        }),
      [i18n.language],
    );
    const rowTimeFmt = useMemo(
      () =>
        new Intl.DateTimeFormat(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      [i18n.language],
    );
    const formatHm = (h: number, m: number) =>
      rowTimeFmt.format(new Date(2000, 0, 1, h, m, 0, 0));

    const timezoneFootnote = useMemo(() => {
      try {
        return t('availabilityViewer.timezoneFootnote', {
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch {
        return '';
      }
    }, [t]);

    const navBar = (
      onPrev: () => void,
      onToday: () => void,
      onNext: () => void,
      rangeLabel: string,
      compact?: boolean,
    ) => (
      <div className={cn('flex items-center gap-1.5', compact && 'mb-3')}>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={onToday}
        >
          {t('availabilityViewer.thisWeek')}
        </button>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={onPrev}
          aria-label={t('availabilityViewer.prevWeek')}
        >
          ←
        </button>
        <span className='text-sm font-medium text-[var(--text2)]'>
          {rangeLabel}
        </span>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={onNext}
          aria-label={t('availabilityViewer.nextWeek')}
        >
          →
        </button>
      </div>
    );

    const weekNav = navBar(
      () => setWeekStart((w) => shiftWeek(w, -1)),
      () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setWeekStart(startOfWeekMonday(d));
      },
      () => setWeekStart((w) => shiftWeek(w, 1)),
      weekRangeLabel(range.start, range.endExclusive, i18n.language),
    );

    const renderModalCell = (dayKey: string, h: number, m: number) => {
      const slot = slots.find((s) => slotMatchesCell(s, dayKey, h, m));
      if (!slot)
        return (
          <span className='text-[11px] text-[var(--text3)]/30' aria-hidden>
            ·
          </span>
        );
      if (slot.status === 'OPEN') {
        return (
          <button
            type='button'
            className='w-full rounded-md bg-green-500/20 px-1 py-0.5 text-[11px] text-green-700 hover:bg-green-500/35 dark:text-green-400'
            disabled={isSelf || bookingId === slot.id}
            title={t('availabilityViewer.bookSlotTitle')}
            onClick={() => void book(slot)}
          >
            {rowTimeFmt.format(parseLocalIso(slot.startTime))}
          </button>
        );
      }
      if (slot.bookedByMe) {
        const time = rowTimeFmt.format(parseLocalIso(slot.startTime));
        const canCancel = canLearnerCancelBooking(slot.startTime);
        return (
          <div
            className='flex flex-col items-center gap-0.5 rounded-md bg-[var(--brand)]/20 px-1 py-0.5 text-[11px] text-[var(--brand)]'
            title={t('availabilityViewer.previewYoursHint')}
          >
            <span>{time}</span>
            {canCancel && (
              <button
                type='button'
                className='text-[10px] text-red-500 hover:underline'
                disabled={cancelId === slot.id}
                onClick={() => void cancelMine(slot)}
              >
                {t('bookings.cancelBooking')}
              </button>
            )}
          </div>
        );
      }
      return (
        <div
          className='rounded-md bg-[var(--accent)]/20 px-1 py-0.5 text-[11px] text-[var(--accent)]'
          title={t('availabilityViewer.previewBookedHint')}
        >
          {rowTimeFmt.format(parseLocalIso(slot.startTime))}
        </div>
      );
    };

    const modalGrid = (
      <div className='relative overflow-auto'>
        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-[var(--bg)]/60 text-sm'>
            {t('common.loading')}…
          </div>
        )}
        <div className='overflow-x-auto'>
          <table
            className='w-full min-w-[520px] border-collapse text-sm'
            role='grid'
            aria-label={t('availabilityViewer.gridAria')}
          >
            <thead>
              <tr>
                <th
                  className='w-14 border-b border-[var(--border)] py-2'
                  scope='col'
                >
                  {' '}
                </th>
                {weekDays.map(({ date, key }) => (
                  <th
                    key={key}
                    scope='col'
                    className={cn(
                      'border-b border-[var(--border)] py-2 text-center text-[12px] font-semibold',
                      key === todayKey && 'text-[var(--brand)]',
                    )}
                  >
                    {dayHeadFmt.format(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_GRID_HALF_HOUR_ROWS.map(({ h, m }) => (
                <tr key={`${h}-${m}`}>
                  <th
                    scope='row'
                    className='border-b border-[var(--border)] pr-2 text-right text-[11px] text-[var(--text3)]'
                  >
                    {formatHm(h, m)}
                  </th>
                  {weekDays.map(({ key: dayKey }) => (
                    <td
                      key={dayKey}
                      className='border-b border-[var(--border)] p-0.5 text-center'
                    >
                      {renderModalCell(dayKey, h, m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <LegendBar className='mt-3' />
      </div>
    );

    const previewGrid = (
      <div className='relative overflow-auto rounded-xl border border-[var(--border)]'>
        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-[var(--bg)]/60 text-sm'>
            {t('common.loading')}…
          </div>
        )}
        <div className='overflow-x-auto'>
          <div
            className='min-w-[480px]'
            style={{
              display: 'grid',
              gridTemplateColumns: '3rem repeat(7, 1fr)',
            }}
            role='grid'
            aria-label={t('availabilityViewer.gridAria')}
          >
            <div
              className='border-r border-b border-[var(--border)]'
              aria-hidden
            />
            {weekDays.map(({ date, key }) => (
              <div
                key={key}
                className={cn(
                  'border-r border-b border-[var(--border)] py-1.5 text-center text-[11px] font-semibold last:border-r-0',
                  key === todayKey && 'text-[var(--brand)]',
                )}
                role='columnheader'
              >
                {dayHeadFmt.format(date)}
              </div>
            ))}

            {HOUR_BANDS.map((band) => (
              <React.Fragment key={`${band.lo}-${band.hi}`}>
                <div
                  className='border-r border-b border-[var(--border)] px-1 py-1 text-right text-[10px] text-[var(--text3)]'
                  role='rowheader'
                >
                  {pad2(band.lo)}–{pad2(band.hi)}
                </div>
                {weekDays.map(({ key: dayKey }) => {
                  const cellSlots = slots
                    .filter((s) => slotInBand(s, dayKey, band.lo, band.hi))
                    .sort(
                      (a, b) =>
                        parseLocalIso(a.startTime).getTime() -
                        parseLocalIso(b.startTime).getTime(),
                    );
                  const empty = cellSlots.length === 0;
                  return (
                    <div
                      key={`${dayKey}-${band.lo}`}
                      className={cn(
                        'border-r border-b border-[var(--border)] p-0.5 last:border-r-0',
                        empty && 'bg-[var(--bg2)]/30',
                      )}
                      role='gridcell'
                    >
                      {!empty && (
                        <div className='flex flex-col gap-0.5'>
                          {cellSlots.map((slot) => {
                            const timeLabel = rowTimeFmt.format(
                              parseLocalIso(slot.startTime),
                            );
                            if (slot.status === 'OPEN') {
                              return (
                                <button
                                  key={slot.id}
                                  type='button'
                                  className='w-full rounded bg-green-500/20 px-1 py-0.5 text-[10px] text-green-700 hover:bg-green-500/35 dark:text-green-400'
                                  disabled={isSelf || bookingId === slot.id}
                                  title={t('availabilityViewer.bookSlotTitle')}
                                  onClick={() => void book(slot)}
                                >
                                  {timeLabel}
                                </button>
                              );
                            }
                            if (slot.bookedByMe) {
                              return (
                                <span
                                  key={slot.id}
                                  className='block rounded bg-[var(--brand)]/25 px-1 py-0.5 text-[10px] text-[var(--brand)]'
                                  title={t(
                                    'availabilityViewer.previewYoursHint',
                                  )}
                                >
                                  {timeLabel}
                                </span>
                              );
                            }
                            return (
                              <span
                                key={slot.id}
                                className='block rounded bg-[var(--accent)]/20 px-1 py-0.5 text-[10px] text-[var(--accent)]'
                                title={t(
                                  'availabilityViewer.previewBookedHint',
                                )}
                              >
                                {timeLabel}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );

    return (
      <>
        <section
          className={cn(
            'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6',
            !flushTop && 'mt-6',
          )}
        >
          <div className='mb-2 flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-lg font-bold'>
              {t('availabilityViewer.title')}
            </h2>
            {!isSelf && (
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => setModalOpen(true)}
              >
                {t('availabilityViewer.openPicker')}
              </button>
            )}
          </div>
          <p className='mb-3 text-sm text-[var(--text2)]'>
            {t('availabilityViewer.inlineHint')}
          </p>
          {!loading && !isSelf && (
            <p className='mb-3 text-sm text-[var(--text2)]'>
              {openSlots.length > 0
                ? t('availabilityViewer.slotsThisWeek', {
                    count: openSlots.length,
                  })
                : t('availabilityViewer.emptyWeek')}
            </p>
          )}

          <div className='mb-3'>{weekNav}</div>
          {previewGrid}
          <LegendBar className='mt-3' />

          <div className='mt-3 text-[12px] text-[var(--text3)]'>
            {timezoneFootnote}
          </div>
          {isSelf && (
            <p className='mt-3 text-sm text-[var(--text2)]'>
              {t('availabilityViewer.ownProfileHint')}
            </p>
          )}
        </section>

        {modalOpen && !isSelf && (
          <Modal
            title={t('availabilityViewer.modalTitle')}
            wide
            onClose={() => setModalOpen(false)}
          >
            <div className='mb-3'>{weekNav}</div>
            {modalGrid}
            <div className='mt-4 flex items-center justify-between'>
              <span className='text-[12px] text-[var(--text3)]'>
                {timezoneFootnote}
              </span>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={() => setModalOpen(false)}
              >
                {t('availabilityViewer.closeModal')}
              </button>
            </div>
          </Modal>
        )}
      </>
    );
  },
);
