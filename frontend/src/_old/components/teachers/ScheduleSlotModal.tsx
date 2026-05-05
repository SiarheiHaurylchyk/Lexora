import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { isAxiosError } from 'axios';
import Modal from '../ui/Modal';
import { availabilityApi } from '../../services/api';
import type { ConflictingSlotItem, TeacherSlotItem } from '../../services/types';
import { formatLocalIso, parseLocalIso } from '../../lib/calendar';
import styles from './ScheduleSlotModal.module.css';

export type ScheduleModalContext =
  | { kind: 'new'; date: Date; hour: number; minute?: number }
  | { kind: 'slot'; slot: TeacherSlotItem };

interface Props {
  ctx: ScheduleModalContext | null;
  onClose: () => void;
  onSaved: () => void;
  onOpenMeetingModal: (slot: TeacherSlotItem) => void;
  onCancelBooking: (slot: TeacherSlotItem) => void | Promise<void>;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInputValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]) - 1;
  const day = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  const out = new Date(y, mo, day, h, mi, 0, 0);
  return Number.isNaN(out.getTime()) ? null : out;
}

function apiMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

export default function ScheduleSlotModal({
  ctx,
  onClose,
  onSaved,
  onOpenMeetingModal,
  onCancelBooking,
}: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>('lesson');
  const [start, setStart] = useState<Date>(() => new Date());
  const [end, setEnd] = useState<Date>(() => new Date());
  const [durationMin, setDurationMin] = useState<number>(30);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [overlapConflict, setOverlapConflict] = useState<ConflictingSlotItem[] | null>(null);

  useEffect(() => {
    setOverlapConflict(null);
    if (!ctx) return;
    if (ctx.kind === 'new') {
      const s = new Date(ctx.date);
      s.setHours(ctx.hour, ctx.minute ?? 0, 0, 0);
      const e = new Date(s);
      e.setMinutes(e.getMinutes() + 30);
      setStart(s);
      setEnd(e);
      setDurationMin(30);
      setTitle('');
      setDescription('');
      setTab('lesson');
    } else {
      const s = parseLocalIso(ctx.slot.startTime);
      const e = parseLocalIso(ctx.slot.endTime);
      setStart(s);
      setEnd(e);
      setTitle(ctx.slot.title?.trim() ?? '');
      setDescription(ctx.slot.description?.trim() ?? '');
      const diffMin = Math.max(15, Math.round((e.getTime() - s.getTime()) / 60000));
      const nearest = DURATION_OPTIONS.reduce(
        (best, b) => (Math.abs(b - diffMin) < Math.abs(best - diffMin) ? b : best),
        DURATION_OPTIONS[0],
      );
      setDurationMin(nearest);
      setTab('edit');
    }
  }, [ctx]);

  const headerTitle = useMemo(() => {
    if (!ctx) return '';
    const fmtTime = new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' });
    const fmtDay = new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    if (ctx.kind === 'new') {
      const s = new Date(ctx.date);
      s.setHours(ctx.hour, ctx.minute ?? 0, 0, 0);
      const e = new Date(s);
      e.setMinutes(e.getMinutes() + 30);
      return `${fmtTime.format(s)} – ${fmtTime.format(e)}, ${fmtDay.format(s)}`;
    }
    return `${fmtTime.format(start)} – ${fmtTime.format(end)}, ${fmtDay.format(start)}`;
  }, [ctx, i18n.language, start, end]);

  if (!ctx) return null;

  const slot = ctx.kind === 'slot' ? ctx.slot : null;
  const status = slot?.status;

  const applyDurationFromStart = (minutes: number) => {
    const s = combineDateAndTime(toDateInputValue(start), toTimeInputValue(start));
    if (!s) return;
    const e = new Date(s);
    e.setMinutes(e.getMinutes() + minutes);
    setStart(s);
    setEnd(e);
    setDurationMin(minutes);
  };

  const onLessonDurationChange = (minutes: number) => {
    const s = combineDateAndTime(toDateInputValue(start), toTimeInputValue(start));
    if (!s) return;
    const e = new Date(s);
    e.setMinutes(e.getMinutes() + minutes);
    setEnd(e);
    setDurationMin(minutes);
  };

  const saveCreateLesson = async () => {
    const s = combineDateAndTime(toDateInputValue(start), toTimeInputValue(start));
    const e = combineDateAndTime(toDateInputValue(end), toTimeInputValue(end));
    if (!s || !e || e.getTime() <= s.getTime()) {
      toast.error(t('availability.schedule.invalidRange'));
      return;
    }
    if (s.getTime() < Date.now() - 60_000) {
      toast.error(t('availability.cannotPast'));
      return;
    }
    setSaving(true);
    try {
      await availabilityApi.createSlot({
        startTime: formatLocalIso(s),
        endTime: formatLocalIso(e),
        status: 'OPEN',
      });
      toast.success(t('availability.added'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const savePersonalNew = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t('availability.schedule.titleRequired'));
      return;
    }
    const s = combineDateAndTime(toDateInputValue(start), toTimeInputValue(start));
    const e = combineDateAndTime(toDateInputValue(end), toTimeInputValue(end));
    if (!s || !e || e.getTime() <= s.getTime()) {
      toast.error(t('availability.schedule.invalidRange'));
      return;
    }
    if (s.getTime() < Date.now() - 60_000) {
      toast.error(t('availability.cannotPast'));
      return;
    }
    setSaving(true);
    try {
      await availabilityApi.createSlot({
        startTime: formatLocalIso(s),
        endTime: formatLocalIso(e),
        status: 'BLOCKED',
        title: trimmed,
        description: description.trim() || undefined,
      });
      toast.success(t('availability.addBlocked'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveEditTime = async (shiftOverlappingSlots?: boolean) => {
    if (!slot) return;
    const s = combineDateAndTime(toDateInputValue(start), toTimeInputValue(start));
    const e = combineDateAndTime(toDateInputValue(end), toTimeInputValue(end));
    if (!s || !e || e.getTime() <= s.getTime()) {
      toast.error(t('availability.schedule.invalidRange'));
      return;
    }
    if (s.getTime() < Date.now() - 60_000) {
      toast.error(t('availability.cannotPast'));
      return;
    }
    setSaving(true);
    setOverlapConflict(null);
    try {
      await availabilityApi.patchSlot(slot.id, {
        startTime: formatLocalIso(s),
        endTime: formatLocalIso(e),
        ...(shiftOverlappingSlots ? { shiftOverlappingSlots: true } : {}),
      });
      toast.success(
        shiftOverlappingSlots
          ? t('availability.schedule.timeUpdatedShifted')
          : t('availability.schedule.timeUpdated'),
      );
      onSaved();
      onClose();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as {
          code?: string;
          conflictingSlots?: ConflictingSlotItem[];
        };
        if (data?.code === 'SLOT_OVERLAP' && Array.isArray(data.conflictingSlots)) {
          setOverlapConflict(data.conflictingSlots);
          return;
        }
      }
      toast.error(apiMessage(err) || t('availability.patchFailed'));
    } finally {
      setSaving(false);
    }
  };

  const savePersonalMeta = async () => {
    if (!slot || slot.status !== 'BLOCKED') return;
    setSaving(true);
    try {
      await availabilityApi.patchSlot(slot.id, {
        title: title.trim(),
        description: description.trim(),
      });
      toast.success(t('availability.schedule.detailsSaved'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.patchFailed'));
    } finally {
      setSaving(false);
    }
  };

  const openForBooking = async () => {
    if (!slot || slot.status !== 'BLOCKED') return;
    setSaving(true);
    try {
      await availabilityApi.patchSlot(slot.id, { status: 'OPEN' });
      toast.success(t('availability.slotUpdated'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.patchFailed'));
    } finally {
      setSaving(false);
    }
  };

  const markUnavailable = async () => {
    if (!slot || slot.status !== 'OPEN') return;
    setSaving(true);
    try {
      await availabilityApi.patchSlot(slot.id, { status: 'BLOCKED' });
      toast.success(t('availability.schedule.markedBlocked'));
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(apiMessage(err) || t('availability.patchFailed'));
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async () => {
    if (!slot) return;
    setSaving(true);
    try {
      await availabilityApi.deleteSlot(slot.id);
      toast.success(t('availability.removed'));
      onSaved();
      onClose();
    } catch {
      toast.error(t('availability.removeFailed'));
    } finally {
      setSaving(false);
    }
  };

  const renderDateTimeEditors = (endDateEditable: boolean) => (
    <>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('availability.schedule.start')}</span>
        <div className={styles.row2}>
          <input
            type="date"
            className="input-field"
            value={toDateInputValue(start)}
            onChange={(e) => {
              const next = combineDateAndTime(e.target.value, toTimeInputValue(start));
              if (next) setStart(next);
            }}
          />
          <input
            type="time"
            step={300}
            className="input-field"
            value={toTimeInputValue(start)}
            onChange={(e) => {
              const next = combineDateAndTime(toDateInputValue(start), e.target.value);
              if (next) setStart(next);
            }}
          />
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('availability.schedule.end')}</span>
        <div className={styles.row2}>
          <input
            type="date"
            className="input-field"
            disabled={!endDateEditable}
            style={!endDateEditable ? { opacity: 0.65 } : undefined}
            value={toDateInputValue(end)}
            onChange={(e) => {
              const next = combineDateAndTime(e.target.value, toTimeInputValue(end));
              if (next) setEnd(next);
            }}
          />
          <input
            type="time"
            step={300}
            className="input-field"
            value={toTimeInputValue(end)}
            onChange={(e) => {
              const next = combineDateAndTime(toDateInputValue(end), e.target.value);
              if (next) setEnd(next);
            }}
          />
        </div>
      </div>
    </>
  );

  let body: React.ReactNode = null;
  let primaryLabel = t('availability.schedule.save');
  let primaryDisabled = saving;
  let onPrimary: (() => void) | undefined;

  if (ctx.kind === 'new') {
    body = (
      <>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'lesson' ? styles.tabActive : ''}`}
            onClick={() => setTab('lesson')}
          >
            {t('availability.schedule.tabLesson')}
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'personal' ? styles.tabActive : ''}`}
            onClick={() => setTab('personal')}
          >
            {t('availability.schedule.tabPersonal')}
          </button>
        </div>
        {tab === 'lesson' && (
          <>
            <p className={styles.hint}>{t('availability.schedule.lessonHint')}</p>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('availability.schedule.duration')}</span>
              <select
                className="input-field"
                value={durationMin}
                onChange={(e) => onLessonDurationChange(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {t('availability.schedule.durationMinutes', { count: m })}
                  </option>
                ))}
              </select>
            </div>
            {renderDateTimeEditors(true)}
          </>
        )}
        {tab === 'personal' && (
          <>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sched-title-new">
                {t('availability.schedule.titleLabel')}
                <span className={styles.counter}>
                  {title.length} / 40
                </span>
              </label>
              <input
                id="sched-title-new"
                className="input-field"
                maxLength={40}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('availability.schedule.titlePlaceholder')}
              />
            </div>
            {renderDateTimeEditors(true)}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sched-desc-new">
                {t('availability.schedule.descriptionLabel')}
                <span className={styles.counter}>
                  {description.length} / 500
                </span>
              </label>
              <textarea
                id="sched-desc-new"
                className={`input-field ${styles.textarea}`}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </>
        )}
      </>
    );
    onPrimary =
      tab === 'lesson' ? () => void saveCreateLesson() : () => void savePersonalNew();
    primaryDisabled =
      saving ||
      (tab === 'personal' && !title.trim()) ||
      combineDateAndTime(toDateInputValue(start), toTimeInputValue(start)) === null ||
      combineDateAndTime(toDateInputValue(end), toTimeInputValue(end)) === null;
  }

  if (ctx.kind === 'slot' && status === 'OPEN') {
    body = (
      <>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'edit' ? styles.tabActive : ''}`}
            onClick={() => setTab('edit')}
          >
            {t('availability.schedule.tabEditTime')}
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'manage' ? styles.tabActive : ''}`}
            onClick={() => setTab('manage')}
          >
            {t('availability.schedule.tabSlot')}
          </button>
        </div>
        {tab === 'edit' && (
          <>
            <p className={styles.hint}>{t('availability.schedule.editOpenHint')}</p>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{t('availability.schedule.duration')}</span>
              <select
                className="input-field"
                value={durationMin}
                onChange={(e) => applyDurationFromStart(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {t('availability.schedule.durationMinutes', { count: m })}
                  </option>
                ))}
              </select>
            </div>
            {renderDateTimeEditors(true)}
          </>
        )}
        {tab === 'manage' && (
          <div className={styles.actionsStack}>
            <p className={styles.hint}>{t('availability.schedule.manageOpenHint')}</p>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void markUnavailable()}>
              {t('availability.schedule.markUnavailable')}
            </button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void removeSlot()}>
              {t('availability.menuDeleteSlot')}
            </button>
          </div>
        )}
      </>
    );
    if (tab === 'edit') {
      onPrimary = () => void saveEditTime();
      primaryDisabled = saving;
    } else {
      primaryLabel = t('common.close');
      onPrimary = onClose;
      primaryDisabled = saving;
    }
  }

  if (ctx.kind === 'slot' && status === 'BLOCKED') {
    body = (
      <>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'edit' ? styles.tabActive : ''}`}
            onClick={() => setTab('edit')}
          >
            {t('availability.schedule.tabEditTime')}
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'personal' ? styles.tabActive : ''}`}
            onClick={() => setTab('personal')}
          >
            {t('availability.schedule.tabPersonal')}
          </button>
        </div>
        {tab === 'edit' && (
          <>
            <p className={styles.hint}>{t('availability.schedule.editBlockedHint')}</p>
            {renderDateTimeEditors(true)}
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void openForBooking()}>
              {t('availability.schedule.makeBookable')}
            </button>
          </>
        )}
        {tab === 'personal' && (
          <>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sched-title-ed">
                {t('availability.schedule.titleLabel')}
                <span className={styles.counter}>{title.length} / 40</span>
              </label>
              <input
                id="sched-title-ed"
                className="input-field"
                maxLength={40}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('availability.schedule.titlePlaceholder')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sched-desc-ed">
                {t('availability.schedule.descriptionLabel')}
                <span className={styles.counter}>{description.length} / 500</span>
              </label>
              <textarea
                id="sched-desc-ed"
                className={`input-field ${styles.textarea}`}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void removeSlot()}>
              {t('availability.menuDeleteSlot')}
            </button>
          </>
        )}
      </>
    );
    if (tab === 'edit') {
      onPrimary = () => void saveEditTime();
      primaryDisabled = saving;
    } else {
      onPrimary = () => void savePersonalMeta();
      primaryDisabled = saving;
    }
  }

  if (ctx.kind === 'slot' && status === 'BOOKED') {
    const bookedSlot = ctx.slot;
    const studentName =
      bookedSlot.bookedBy?.displayName?.trim() ||
      bookedSlot.bookedBy?.username?.trim() ||
      t('availability.schedule.unknownStudent');
    body = (
      <>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'edit' ? styles.tabActive : ''}`}
            onClick={() => setTab('edit')}
          >
            {t('availability.schedule.tabEditTime')}
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.tab} ${tab === 'lesson' ? styles.tabActive : ''}`}
            onClick={() => setTab('lesson')}
          >
            {t('availability.schedule.tabLessonBooking')}
          </button>
        </div>
        {tab === 'edit' && (
          <>
            <p className={styles.hint}>{t('availability.schedule.editBookedHint')}</p>
            {renderDateTimeEditors(true)}
          </>
        )}
        {tab === 'lesson' && (
          <div className={styles.actionsStack}>
            <p className={styles.studentLine}>{t('availability.schedule.withStudent', { name: studentName })}</p>
            <p className={styles.lessonMeta}>{t('availability.schedule.bookingClassroomHint')}</p>
            {bookedSlot.classroomLinkId != null ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => navigate(`/class/${bookedSlot.classroomLinkId}`)}
              >
                {t('availability.schedule.openClassroom')}
              </button>
            ) : (
              <p className={styles.lessonMeta}>{t('availability.schedule.classroomMissing')}</p>
            )}
            <p className={styles.lessonMeta}>{t('availability.schedule.jitsiToolbarHint')}</p>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => onOpenMeetingModal(bookedSlot)}
            >
              {t('availability.menuMeetingLink')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => void onCancelBooking(bookedSlot)}
            >
              {t('availability.cancelBooking')}
            </button>
          </div>
        )}
      </>
    );
    if (tab === 'edit') {
      onPrimary = () => void saveEditTime();
      primaryDisabled = saving;
    } else {
      primaryLabel = t('common.close');
      onPrimary = onClose;
      primaryDisabled = saving;
    }
  }

  const fmtOverlapRange = (c: ConflictingSlotItem) => {
    const a = parseLocalIso(c.startTime);
    const b = parseLocalIso(c.endTime);
    const tf = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' });
    return `${tf.format(a)} → ${tf.format(b)}`;
  };

  const conflictStatusLabel = (c: ConflictingSlotItem) => {
    if (c.status === 'BOOKED' && c.bookedByName?.trim()) return c.bookedByName.trim();
    if (c.status === 'OPEN') return t('availability.statusOpen');
    if (c.status === 'BLOCKED') return t('availability.statusBlocked');
    if (c.status === 'BOOKED') return t('availability.statusBooked');
    return c.status;
  };

  const overlapBlocksFooter = overlapConflict !== null && overlapConflict.length > 0;

  return (
    <Modal title={headerTitle} onClose={onClose} wide>
      <p className={styles.headerSub}>{t('availability.schedule.modalFootnote')}</p>
      {body}
      {overlapBlocksFooter && (
        <div className={styles.overlapPanel}>
          <p className={styles.overlapTitle}>{t('availability.schedule.overlapTitle')}</p>
          <p className={styles.overlapLead}>{t('availability.schedule.overlapLead')}</p>
          <ul className={styles.overlapList}>
            {overlapConflict!.map((c) => (
              <li key={c.id}>
                <span className={styles.overlapRange}>{fmtOverlapRange(c)}</span>
                <span className={styles.overlapName}> — {conflictStatusLabel(c)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.overlapActions}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => void saveEditTime(true)}
            >
              {saving ? t('common.loading') : t('availability.schedule.shiftTogether')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setOverlapConflict(null)}
            >
              {t('availability.schedule.overlapDismiss')}
            </button>
          </div>
          <p className={styles.overlapHint}>{t('availability.schedule.onlyThisHint')}</p>
        </div>
      )}
      <div className={styles.footer}>
        <button
          type="button"
          className={`btn btn-primary ${styles.saveBtn}`}
          disabled={primaryDisabled || overlapBlocksFooter}
          onClick={() => onPrimary?.()}
        >
          {saving ? t('common.loading') : primaryLabel}
        </button>
      </div>
    </Modal>
  );
}
