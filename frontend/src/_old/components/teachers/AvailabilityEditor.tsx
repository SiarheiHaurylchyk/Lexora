import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { availabilityApi } from '../../services/api';
import type { TeacherSlotItem } from '../../services/types';
import { useConfirm } from '../ui';
import Modal from '../ui/Modal';
import ScheduleSlotModal, { type ScheduleModalContext } from './ScheduleSlotModal';
import {
  buildWeekRange,
  formatHalfHourLabel,
  formatLocalIso,
  parseLocalIso,
  rangeOverlaps,
  shiftWeek,
  weekRangeLabel,
  WEEK_GRID_HALF_HOUR_ROWS,
} from '../../lib/calendar';
import { classNames } from '../../lib/classNames';
import styles from './AvailabilityEditor.module.css';

export type AvailabilityEditorVariant = 'default' | 'page';

interface SlotDTO extends TeacherSlotItem {
  status: 'OPEN' | 'BOOKED' | 'BLOCKED';
}

function apiMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

/**
 * Weekly grid availability editor for teachers.
 *
 * - Click a cell → modal: create bookable time / personal event, edit times (reschedule), or booking actions.
 * - Top bar: prev/today/next week navigation.
 *
 * The grid uses the same 30-minute rows as the learner booking modal: 00:30 … 23:30.
 *
 * `variant="page"` — fills vertical space (used on /schedule next to the sidebar).
 */
export default function AvailabilityEditor({ variant = 'default' }: { variant?: AvailabilityEditorVariant }) {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return startOfWeek(d);
  });
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [meetingModalSlot, setMeetingModalSlot] = useState<SlotDTO | null>(null);
  const [meetingDraft, setMeetingDraft] = useState('');
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [scheduleCtx, setScheduleCtx] = useState<ScheduleModalContext | null>(null);

  const range = useMemo(() => buildWeekRange(weekStart), [weekStart]);
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

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

  const findSlotAt = (date: Date, hour: number, minute: number): SlotDTO | undefined => {
    const startTs = new Date(date);
    startTs.setHours(hour, minute, 0, 0);
    const endTs = new Date(startTs);
    endTs.setMinutes(endTs.getMinutes() + 30);
    return slots.find((s) =>
      rangeOverlaps(parseLocalIso(s.startTime), parseLocalIso(s.endTime), startTs, endTs),
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
      const { data } = await availabilityApi.patchMeetingUrl(meetingModalSlot.id, {
        meetingUrl: meetingDraft.trim(),
      });
      const patch = data;
      setSlots((prev) =>
        prev.map((s) =>
          s.id === meetingModalSlot.id ? { ...s, meetingUrl: patch.meetingUrl ?? (meetingDraft.trim() || null) } : s,
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
      const { data } = await availabilityApi.patchMeetingUrl(meetingModalSlot.id, { meetingUrl: '' });
      const patch = data;
      setSlots((prev) =>
        prev.map((s) => (s.id === meetingModalSlot.id ? { ...s, meetingUrl: patch.meetingUrl ?? null } : s)),
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
      existing.bookedBy?.displayName?.trim() || existing.bookedBy?.username?.trim() || '';
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

  const dayLabel = (d: Date) => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric' });
    return fmt.format(d);
  };

  return (
    <div className={classNames(styles.wrap, variant === 'page' && styles.wrapPage)}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{t('availability.title')}</h2>
          <p className={styles.subtitle}>{t('availability.subtitle')}</p>
        </div>
        <div className={styles.nav}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart((w) => shiftWeek(w, -1))}>
            ←
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {t('availability.today')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart((w) => shiftWeek(w, 1))}>
            →
          </button>
          <span className={styles.range}>{weekRangeLabel(range.start, range.endExclusive, i18n.language)}</span>
        </div>
      </header>

      <div className={classNames(styles.gridWrap, variant === 'page' && styles.gridWrapGrow)} aria-busy={loading}>
        <div className={styles.grid}>
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className={styles.dayHead}>
              {dayLabel(d)}
            </div>
          ))}

          {WEEK_GRID_HALF_HOUR_ROWS.map(({ h, m }) => (
            <React.Fragment key={`${h}-${m}`}>
              <div className={styles.hourHead}>{formatHalfHourLabel(h, m)}</div>
              {days.map((d) => {
                const slot = findSlotAt(d, h, m);
                const cellDate = new Date(d);
                cellDate.setHours(h, m, 0, 0);
                const pastEmpty = cellDate.getTime() < Date.now() && !slot;

                let cls = styles.cell;
                if (slot?.status === 'OPEN') cls += ` ${styles.cellOpen}`;
                else if (slot?.status === 'BOOKED') cls += ` ${styles.cellBooked}`;
                else if (slot?.status === 'BLOCKED') cls += ` ${styles.cellBlocked}`;
                else if (pastEmpty) cls += ` ${styles.cellPast}`;

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

                const cellKey = `${d.toISOString()}-${h}-${m}`;

                if (pastEmpty) {
                  return (
                    <button
                      key={cellKey}
                      type="button"
                      className={cls}
                      disabled
                      aria-disabled
                      tabIndex={-1}
                      title=""
                    >
                      {label}
                    </button>
                  );
                }

                return (
                  <button
                    key={cellKey}
                    type="button"
                    className={cls}
                    title={label || t('availability.openSchedule')}
                    onClick={() => {
                      if (slot) {
                        setScheduleCtx({ kind: 'slot', slot });
                      } else {
                        setScheduleCtx({ kind: 'new', date: new Date(d), hour: h, minute: m });
                      }
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

      {scheduleCtx && (
        <ScheduleSlotModal
          ctx={scheduleCtx}
          onClose={() => setScheduleCtx(null)}
          onSaved={() => void fetchSlots()}
          onOpenMeetingModal={(s) => {
            openMeetingModal(s as SlotDTO);
          }}
          onCancelBooking={(s) => void cancelBookingForSlot(s as SlotDTO)}
        />
      )}

      {meetingModalSlot && (
        <Modal title={t('availability.meetingModalTitle')} onClose={() => setMeetingModalSlot(null)}>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 0 }}>{t('availability.meetingModalHelp')}</p>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('availability.meetingUrlLabel')}</span>
            <input
              className="input-field"
              value={meetingDraft}
              onChange={(e) => setMeetingDraft(e.target.value)}
              placeholder="https://"
              autoFocus
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={meetingSaving} onClick={() => void saveMeetingUrl()}>
              {meetingSaving ? t('common.loading') : t('availability.meetingSave')}
            </button>
            <button type="button" className="btn btn-secondary" disabled={meetingSaving} onClick={() => void clearMeetingUrl()}>
              {t('availability.meetingClear')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={meetingSaving} onClick={() => setMeetingModalSlot(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </Modal>
      )}

      <footer className={styles.legend}>
        <span>
          <span className={`${styles.dot} ${styles.cellOpen}`} /> {t('availability.statusOpen')}
        </span>
        <span>
          <span className={`${styles.dot} ${styles.cellBooked}`} /> {t('availability.statusBooked')}
        </span>
        <span>
          <span className={`${styles.dot} ${styles.cellBlocked}`} /> {t('availability.statusBlocked')}
        </span>
      </footer>
    </div>
  );
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // Monday-first
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
