import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '@ui';

import { availabilityApi, bookingsApi } from '@/shared/api/api-legacy';
import type { TeacherSlotItem } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { canLearnerCancelBooking } from '@/shared/lib/bookingRules';
import { useConfirm } from '@/shared/lib/confirm';

/**
 * Learner view: booked time slots with teachers (from availability calendar).
 */
export function MyBookingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const confirmDlg = useConfirm();
  const [slots, setSlots] = useState<TeacherSlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const reload = async () => {
    const { data } = await bookingsApi.myBookedSlots();
    setSlots(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await bookingsApi.myBookedSlots();
        if (!cancelled) setSlots(data);
      } catch {
        if (!cancelled) toast.error(t('bookings.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const formatRange = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const d = start.toLocaleDateString(i18n.language, {
      weekday: 'short',
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
    return `${d} · ${t1} – ${t2}`;
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

      <SectionCard title={t('bookings.sectionTitle', { count: slots.length })}>
        {loading ? (
          <Skeleton height={120} rounded={14} />
        ) : slots.length === 0 ? (
          <EmptyState
            icon='📅'
            title={t('bookings.empty')}
            description={t('bookings.emptyHint')}
          />
        ) : (
          <ul className='m-0 flex list-none flex-col gap-3 p-0'>
            {slots.map((s) => {
              const teacher = s.teacher;
              const label =
                teacher?.displayName ||
                teacher?.username ||
                t('bookings.unknownTeacher');
              const canCancel = canLearnerCancelBooking(s.startTime);
              const isFuture = new Date(s.startTime).getTime() > Date.now();
              const showWindowHint = isFuture && !canCancel;

              return (
                <li
                  key={s.id}
                  className='border-border bg-surface rounded-[12px] border px-4 py-3.5'
                >
                  <div className='mb-1 font-semibold'>
                    {formatRange(s.startTime, s.endTime)}
                  </div>
                  <div className='text-text2 mb-2.5 text-[13px]'>{label}</div>
                  <div className='mb-2.5 flex flex-wrap gap-2'>
                    {s.classroomLinkId != null && (
                      <button
                        type='button'
                        className='btn btn-primary btn-sm'
                        onClick={() => navigate(`/class/${s.classroomLinkId}`)}
                      >
                        {t('bookings.openClassroom')}
                      </button>
                    )}
                    {s.meetingUrl?.trim() && (
                      <a
                        href={s.meetingUrl.trim()}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='btn btn-secondary btn-sm'
                      >
                        {t('bookings.joinCall')}
                      </a>
                    )}
                  </div>
                  <p className='text-text3 mb-2.5 text-xs'>
                    {t('bookings.classroomRecordingHint')}
                  </p>
                  <p className='text-text3 mb-2.5 text-xs'>
                    {t('bookings.transcriptionHint')}
                  </p>
                  <p className='text-text3 mb-2.5 text-xs'>
                    {t('bookings.cancellationPolicyHint')}
                  </p>
                  {showWindowHint && (
                    <p className='text-text3 mb-2.5 text-xs'>
                      {t('bookings.cancelWindowHint')}
                    </p>
                  )}
                  <div className='flex flex-wrap gap-2'>
                    {teacher?.id != null && (
                      <Link
                        to={`/teachers/${teacher.id}`}
                        className='btn btn-secondary btn-sm'
                      >
                        {t('bookings.openTeacher')}
                      </Link>
                    )}
                    {canCancel && (
                      <Button
                        variant='danger'
                        size='sm'
                        disabled={cancellingId === s.id}
                        onClick={() => void handleCancel(s)}
                      >
                        {t('bookings.cancelBooking')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
