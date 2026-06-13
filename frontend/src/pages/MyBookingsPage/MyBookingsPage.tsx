import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '@ui';

import { availabilityApi } from '@/shared/api/api-legacy';
import type { TeacherSlotItem } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { canLearnerCancelBooking } from '@/shared/lib/bookingRules';
import { slotDurationMinutes, timeUntilLabel } from '@/shared/lib/calendar';
import { useConfirm } from '@/shared/lib/confirm';
import { useApiQuery } from '@/shared/lib/query';

/**
 * Learner view: booked lessons with teachers split into upcoming and past.
 *
 * Each card shows:
 * - Date + time range
 * - Duration ("60 min")
 * - Time until lesson starts (upcoming only, via Intl.RelativeTimeFormat)
 * - Teacher name
 * - Join links (classroom / external meeting)
 * - Cancel button (only within the 24h cancellation window)
 */
export function MyBookingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const confirmDlg = useConfirm();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  const slotsQuery = useApiQuery<TeacherSlotItem[]>({
    queryKey: ['bookings', 'mine'],
    url: '/me/booked-slots',
  });
  const slots = slotsQuery.data ?? [];
  const loading = slotsQuery.isLoading;
  useEffect(() => {
    if (slotsQuery.isError) toast.error(t('bookings.loadFailed'));
  }, [slotsQuery.isError, t]);

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });

  // Split into upcoming (future) and past slots.
  const now = Date.now();
  const { upcomingSlots, pastSlots } = useMemo(() => {
    const upcoming: TeacherSlotItem[] = [];
    const past: TeacherSlotItem[] = [];
    for (const s of slots) {
      if (new Date(s.startTime).getTime() > now) upcoming.push(s);
      else past.push(s);
    }
    // Upcoming: earliest first; Past: most recent first
    upcoming.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    past.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
    return { upcomingSlots: upcoming, pastSlots: past };
  }, [slots, now]);

  const formatRange = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const dateLabel = start.toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const t1 = start.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const t2 = end.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { dateLabel, timeRange: `${t1} – ${t2}` };
  };

  const handleCancel = async (s: TeacherSlotItem) => {
    if (!canLearnerCancelBooking(s.startTime)) return;
    const ok = await confirmDlg({
      message: t('bookings.cancelConfirm'),
      variant: 'danger',
      confirmText: t('bookings.cancelBooking'),
    });
    if (!ok) return;
    setCancellingId(s.id);
    try {
      await availabilityApi.cancelBooking(s.id);
      toast.success(t('bookings.cancelledToast'));
      await reload();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || t('bookings.cancelFailed'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className='box-border w-full py-10'>
      <PageHeader
        title={t('bookings.title')}
        subtitle={t('bookings.subtitle')}
      />

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {loading && <Skeleton height={200} rounded={14} />}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!loading && slots.length === 0 && (
        <EmptyState
          icon='📅'
          title={t('bookings.empty')}
          description={t('bookings.emptyHint')}
        />
      )}

      {/* ── Upcoming lessons ────────────────────────────────────────────── */}
      {!loading && upcomingSlots.length > 0 && (
        <SectionCard
          title={t('bookings.sectionUpcoming', { count: upcomingSlots.length })}
          className='mb-5'
        >
          <ul className='m-0 flex list-none flex-col gap-3 p-0'>
            {upcomingSlots.map((s) => (
              <BookingCard
                key={s.id}
                slot={s}
                locale={i18n.language}
                formatRange={formatRange}
                cancellingId={cancellingId}
                onCancel={() => void handleCancel(s)}
                onNavigate={(path: string) => navigate(path)}
                t={t}
                isUpcoming
              />
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Past lessons ────────────────────────────────────────────────── */}
      {!loading && pastSlots.length > 0 && (
        <div>
          <button
            type='button'
            className='btn btn-ghost btn-sm mb-3 text-[var(--text3)]'
            onClick={() => setShowPast((v) => !v)}
          >
            {showPast
              ? t('bookings.hidePast')
              : t('bookings.showPast', { count: pastSlots.length })}
          </button>

          {showPast && (
            <SectionCard
              title={t('bookings.sectionPast', { count: pastSlots.length })}
            >
              <ul className='m-0 flex list-none flex-col gap-3 p-0'>
                {pastSlots.map((s) => (
                  <BookingCard
                    key={s.id}
                    slot={s}
                    locale={i18n.language}
                    formatRange={formatRange}
                    cancellingId={cancellingId}
                    onCancel={() => void handleCancel(s)}
                    onNavigate={(path: string) => navigate(path)}
                    t={t}
                    isUpcoming={false}
                  />
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Single policy note at the bottom (not repeated per card) ──────── */}
      {!loading && slots.length > 0 && (
        <p className='text-text3 mt-6 text-xs'>{t('bookings.policyNote')}</p>
      )}
    </div>
  );
}

// ── BookingCard sub-component ──────────────────────────────────────────────

interface BookingCardProps {
  slot: TeacherSlotItem;
  locale: string;
  isUpcoming: boolean;
  cancellingId: number | null;
  formatRange: (
    start: string,
    end: string,
  ) => { dateLabel: string; timeRange: string };
  onCancel: () => void;
  onNavigate: (path: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function BookingCard({
  slot,
  locale,
  isUpcoming,
  cancellingId,
  formatRange,
  onCancel,
  onNavigate,
  t,
}: BookingCardProps) {
  const teacher = slot.teacher;
  const teacherName =
    teacher?.displayName || teacher?.username || t('bookings.unknownTeacher');
  const canCancel = canLearnerCancelBooking(slot.startTime);
  const showWindowHint = isUpcoming && !canCancel;
  const { dateLabel, timeRange } = formatRange(slot.startTime, slot.endTime);
  const durationMins = slotDurationMinutes(slot.startTime, slot.endTime);
  const countdown = isUpcoming ? timeUntilLabel(slot.startTime, locale) : null;

  return (
    <li
      className={cn(
        'rounded-[14px] border bg-[var(--surface)] px-4 py-3.5 transition-colors',
        isUpcoming
          ? 'border-l-4 border-[var(--brand)]/25 border-l-[var(--brand)]'
          : 'border-[var(--border)] opacity-75',
      )}
    >
      {/* Date + countdown pill */}
      <div className='mb-1 flex items-baseline gap-2'>
        <span className='text-[15px] font-semibold text-[var(--text)]'>
          {dateLabel}
        </span>
        {countdown && (
          <span className='rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-light)]'>
            {countdown}
          </span>
        )}
      </div>

      {/* Time range + duration */}
      <div className='text-text2 mb-2 flex items-center gap-2 text-[13px]'>
        <span>{timeRange}</span>
        <span className='text-text3'>·</span>
        <span>{t('bookings.durationMin', { count: durationMins })}</span>
      </div>

      {/* Teacher name */}
      <div className='text-text3 mb-3 text-[13px]'>{teacherName}</div>

      {/* Action buttons */}
      <div className='flex flex-wrap gap-2'>
        {slot.classroomLinkId != null && (
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={() => onNavigate(`/class/${slot.classroomLinkId}`)}
          >
            {t('bookings.openClassroom')}
          </button>
        )}
        {slot.meetingUrl?.trim() && (
          <a
            href={slot.meetingUrl.trim()}
            target='_blank'
            rel='noopener noreferrer'
            className='btn btn-secondary btn-sm'
          >
            {t('bookings.joinCall')}
          </a>
        )}
        {teacher?.id != null && (
          <Link to={`/teachers/${teacher.id}`} className='btn btn-ghost btn-sm'>
            {t('bookings.openTeacher')}
          </Link>
        )}
        {canCancel && (
          <Button
            variant='danger'
            size='sm'
            disabled={cancellingId === slot.id}
            onClick={onCancel}
          >
            {t('bookings.cancelBooking')}
          </Button>
        )}
      </div>

      {/* Cancellation window hint (only when past the 24h cutoff) */}
      {showWindowHint && (
        <p className='text-text3 mt-2 text-[11px]'>
          {t('bookings.cancelWindowHint')}
        </p>
      )}
    </li>
  );
}
