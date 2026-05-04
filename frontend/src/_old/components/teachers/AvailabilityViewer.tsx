import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { availabilityApi } from '../../services/api';
import {
  buildWeekRange,
  formatLocalIso,
  parseLocalIso,
  shiftWeek,
  weekRangeLabel,
  WEEK_GRID_HALF_HOUR_ROWS,
} from '../../lib/calendar';
import { classNames } from '../../lib/classNames';
import { Modal, useConfirm } from '../ui';
import { getApiErrorMessage } from '../../lib/apiError';
import { canLearnerCancelBooking } from '../../lib/bookingRules';
import styles from './AvailabilityViewer.module.css';

interface SlotDTO {
  id: number;
  teacherId: number;
  startTime: string;
  endTime: string;
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
  bookedByMe?: boolean;
}

export type AvailabilityViewerHandle = {
  openModal: () => void;
};

interface Props {
  teacherId: number;
  isAuthenticated: boolean;
  isSelf: boolean;
  flushTop?: boolean;
}

/** Preview grid: 4-hour bands (compact week overview, italki-style). */
const HOUR_BANDS: ReadonlyArray<{ lo: number; hi: number }> = [
  { lo: 0, hi: 4 },
  { lo: 4, hi: 8 },
  { lo: 8, hi: 12 },
  { lo: 12, hi: 16 },
  { lo: 16, hi: 20 },
  { lo: 20, hi: 24 },
];

function dateKeyLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slotMatchesCell(slot: SlotDTO, dayKey: string, h: number, m: number): boolean {
  const start = parseLocalIso(slot.startTime);
  if (dateKeyLocal(start) !== dayKey) return false;
  return start.getHours() === h && start.getMinutes() === m;
}

function slotInBand(slot: SlotDTO, dayKey: string, lo: number, hi: number): boolean {
  const start = parseLocalIso(slot.startTime);
  if (dateKeyLocal(start) !== dayKey) return false;
  const minutes = start.getHours() * 60 + start.getMinutes();
  const loM = lo * 60;
  const hiM = hi * 60;
  return minutes >= loM && minutes < hiM;
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function LegendBar({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={classNames(styles.legendBar, className)} role="list">
      <span className={styles.legendItem} role="listitem">
        <span className={classNames(styles.legendSwatch, styles.legendSwatchOpen)} aria-hidden />
        {t('availabilityViewer.legendAvailable')}
      </span>
      <span className={styles.legendItem} role="listitem">
        <span className={classNames(styles.legendSwatch, styles.legendSwatchTaken)} aria-hidden />
        {t('availabilityViewer.legendBooked')}
      </span>
      <span className={styles.legendItem} role="listitem">
        <span className={classNames(styles.legendSwatch, styles.legendSwatchNeutral)} aria-hidden />
        {t('availabilityViewer.legendNotAvailable')}
      </span>
      <span className={styles.legendItem} role="listitem">
        <span className={classNames(styles.legendSwatch, styles.legendSwatchYours)} aria-hidden />
        {t('availabilityViewer.legendBookedByYou')}
      </span>
    </div>
  );
}

const AvailabilityViewer = forwardRef<AvailabilityViewerHandle, Props>(function AvailabilityViewer(
  { teacherId, isAuthenticated, isSelf, flushTop }: Props,
  ref,
) {
  const { t, i18n } = useTranslation();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeekMonday(d);
  });
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const confirmDlg = useConfirm();

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

  const fetchSlots = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setSlots([]);
      }
      try {
        const { data } = await availabilityApi.forTeacher(
          teacherId,
          formatLocalIso(range.start),
          formatLocalIso(range.endExclusive),
        );
        setSlots(Array.isArray(data) ? data : []);
      } catch {
        if (!silent) setSlots([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [teacherId, range.start, range.endExclusive],
  );

  useEffect(() => {
    void fetchSlots();
  }, [fetchSlots]);

  const openSlots = useMemo(() => slots.filter((s) => s.status === 'OPEN'), [slots]);

  const book = async (slot: SlotDTO) => {
    if (!isAuthenticated) {
      toast(t('availabilityViewer.signInToBook'));
      return;
    }
    setBookingId(slot.id);
    try {
      await availabilityApi.bookSlot(teacherId, slot.id);
      toast.success(t('availabilityViewer.bookedToast'));
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id ? { ...s, status: 'BOOKED' as const, bookedByMe: true } : s,
        ),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('availabilityViewer.bookFailed');
      toast.error(msg);
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
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id ? { ...s, status: 'OPEN' as const, bookedByMe: false } : s,
        ),
      );
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
    () => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    [i18n.language],
  );

  const formatHm = (h: number, m: number) =>
    rowTimeFmt.format(new Date(2000, 0, 1, h, m, 0, 0));

  const timezoneFootnote = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return t('availabilityViewer.timezoneFootnote', { tz });
    } catch {
      return '';
    }
  }, [t]);

  const hasAnyOpen = openSlots.length > 0;

  const previewNav = (
    <div className={styles.previewNav}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          setWeekStart(startOfWeekMonday(d));
        }}
      >
        {t('availabilityViewer.thisWeek')}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
        aria-label={t('availabilityViewer.prevWeek')}
      >
        ←
      </button>
      <span className={styles.previewRange}>
        {weekRangeLabel(range.start, range.endExclusive, i18n.language)}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
        aria-label={t('availabilityViewer.nextWeek')}
      >
        →
      </button>
    </div>
  );

  const weekNavModal = (
    <div className={styles.modalNav}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          setWeekStart(startOfWeekMonday(d));
        }}
      >
        {t('availabilityViewer.thisWeek')}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
        aria-label={t('availabilityViewer.prevWeek')}
      >
        ←
      </button>
      <span className={styles.modalRange}>
        {weekRangeLabel(range.start, range.endExclusive, i18n.language)}
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
        aria-label={t('availabilityViewer.nextWeek')}
      >
        →
      </button>
    </div>
  );

  const renderModalCell = (dayKey: string, h: number, m: number) => {
    const slot = slots.find((s) => slotMatchesCell(s, dayKey, h, m));
    if (!slot) {
      return (
        <span className={styles.modalEmpty} aria-hidden>
          ·
        </span>
      );
    }
    if (slot.status === 'OPEN') {
      return (
        <button
          type="button"
          className={styles.modalSlotBtn}
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
        <div className={styles.modalSlotYours} title={t('availabilityViewer.previewYoursHint')}>
          <span className={styles.modalSlotYoursTime}>{time}</span>
          {canCancel && (
            <button
              type="button"
              className={styles.modalCancelMine}
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
      <div className={styles.modalSlotTaken} title={t('availabilityViewer.previewBookedHint')}>
        {rowTimeFmt.format(parseLocalIso(slot.startTime))}
      </div>
    );
  };

  const modalGrid = (
    <div className={styles.modalGridWrap}>
      {loading && <div className={styles.modalLoading}>{t('common.loading')}…</div>}
      <div className={styles.modalScroll}>
        <table className={styles.modalTable} role="grid" aria-label={t('availabilityViewer.gridAria')}>
          <thead>
            <tr>
              <th className={styles.modalCorner} scope="col">
                {' '}
              </th>
              {weekDays.map(({ date, key }) => (
                <th
                  key={key}
                  scope="col"
                  className={classNames(styles.modalDayHead, key === todayKey && styles.modalDayHeadToday)}
                >
                  {dayHeadFmt.format(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEK_GRID_HALF_HOUR_ROWS.map(({ h, m }) => (
              <tr key={`${h}-${m}`}>
                <th scope="row" className={styles.modalTimeCell}>
                  {formatHm(h, m)}
                </th>
                {weekDays.map(({ key: dayKey }) => (
                  <td key={dayKey} className={styles.modalBodyCell}>
                    {renderModalCell(dayKey, h, m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LegendBar className={styles.modalLegend} />
    </div>
  );

  const previewGrid = (
    <div className={styles.previewShell}>
      {loading && <div className={styles.previewVeil}>{t('common.loading')}…</div>}
      <div className={styles.previewScroll}>
        <div className={styles.previewGrid} role="grid" aria-label={t('availabilityViewer.gridAria')}>
          <div className={styles.previewCorner} aria-hidden />
          {weekDays.map(({ date, key }) => (
            <div
              key={key}
              className={classNames(styles.previewColHead, key === todayKey && styles.previewColHeadToday)}
              role="columnheader"
            >
              {dayHeadFmt.format(date)}
            </div>
          ))}

          {HOUR_BANDS.map((band) => (
            <React.Fragment key={`${band.lo}-${band.hi}`}>
              <div className={styles.previewRowHead} role="rowheader">
                {pad2(band.lo)}–{pad2(band.hi)}
              </div>
              {weekDays.map(({ key: dayKey }) => {
                const cellSlots = slots
                  .filter((s) => slotInBand(s, dayKey, band.lo, band.hi))
                  .sort(
                    (a, b) =>
                      parseLocalIso(a.startTime).getTime() - parseLocalIso(b.startTime).getTime(),
                  );
                const empty = cellSlots.length === 0;
                return (
                  <div
                    key={`${dayKey}-${band.lo}`}
                    className={classNames(styles.previewCell, empty && styles.previewCellMuted)}
                    role="gridcell"
                  >
                    {!empty && (
                      <div className={styles.previewChips}>
                        {cellSlots.map((slot) => {
                          const timeLabel = rowTimeFmt.format(parseLocalIso(slot.startTime));
                          if (slot.status === 'OPEN') {
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                className={styles.previewChipOpen}
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
                                className={styles.previewChipYours}
                                title={t('availabilityViewer.previewYoursHint')}
                              >
                                {timeLabel}
                              </span>
                            );
                          }
                          return (
                            <span
                              key={slot.id}
                              className={styles.previewChipTaken}
                              title={t('availabilityViewer.previewBookedHint')}
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
      <section className={classNames(styles.summaryCard, flushTop && styles.summaryCardFlush)}>
        <div className={styles.summaryTop}>
          <h2 className={styles.title}>{t('availabilityViewer.title')}</h2>
          {!isSelf && (
            <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
              {t('availabilityViewer.openPicker')}
            </button>
          )}
        </div>
        <p className={styles.summaryHint}>{t('availabilityViewer.inlineHint')}</p>
        {!loading && !isSelf && (
          <p className={styles.summaryCount}>
            {hasAnyOpen
              ? t('availabilityViewer.slotsThisWeek', { count: openSlots.length })
              : t('availabilityViewer.emptyWeek')}
          </p>
        )}

        {previewNav}
        {previewGrid}
        <LegendBar className={styles.previewLegendBelow} />

        <div className={styles.summaryFoot}>
          <span className={styles.timezone}>{timezoneFootnote}</span>
        </div>
        {isSelf && <p className={styles.selfHint}>{t('availabilityViewer.ownProfileHint')}</p>}
      </section>

      {modalOpen && !isSelf && (
        <Modal title={t('availabilityViewer.modalTitle')} wide onClose={() => setModalOpen(false)}>
          {weekNavModal}
          {modalGrid}
          <div className={styles.modalFooter}>
            <span className={styles.timezone}>{timezoneFootnote}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>
              {t('availabilityViewer.closeModal')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
});

export default AvailabilityViewer;
