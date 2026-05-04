import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { bookingsApi, availabilityApi } from '../services/api';
import type { TeacherSlotItem } from '../services/types';
import { EmptyState, PageHeader, SectionCard, Skeleton, useConfirm, Button } from '../components/ui';
import { getApiErrorMessage } from '../lib/apiError';
import { canLearnerCancelBooking } from '../lib/bookingRules';

/**
 * Learner view: booked time slots with teachers (from availability calendar).
 */
export default function MyBookingsPage() {
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
    const d = start.toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
    const t1 = start.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    const t2 = end.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
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
    <div style={{ padding: '40px 0', width: '100%', boxSizing: 'border-box' }}>
      <PageHeader title={t('bookings.title')} subtitle={t('bookings.subtitle')} />

      <SectionCard title={t('bookings.sectionTitle', { count: slots.length })}>
        {loading ? (
          <Skeleton height={120} rounded={14} />
        ) : slots.length === 0 ? (
          <EmptyState icon="📅" title={t('bookings.empty')} description={t('bookings.emptyHint')} />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slots.map((s) => {
              const teacher = s.teacher;
              const label = teacher?.displayName || teacher?.username || t('bookings.unknownTeacher');
              const canCancel = canLearnerCancelBooking(s.startTime);
              const isFuture = new Date(s.startTime).getTime() > Date.now();
              const showWindowHint = isFuture && !canCancel;

              return (
                <li
                  key={s.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatRange(s.startTime, s.endTime)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {s.classroomLinkId != null && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/class/${s.classroomLinkId}`)}
                      >
                        {t('bookings.openClassroom')}
                      </button>
                    )}
                    {s.meetingUrl?.trim() && (
                      <a href={s.meetingUrl.trim()} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        {t('bookings.joinCall')}
                      </a>
                    )}
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text3)' }}>{t('bookings.classroomRecordingHint')}</p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text3)' }}>{t('bookings.transcriptionHint')}</p>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text3)' }}>{t('bookings.cancellationPolicyHint')}</p>
                  {showWindowHint && (
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text3)' }}>
                      {t('bookings.cancelWindowHint')}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {teacher?.id != null && (
                      <Link to={`/teachers/${teacher.id}`} className="btn btn-secondary btn-sm">
                        {t('bookings.openTeacher')}
                      </Link>
                    )}
                    {canCancel && (
                      <Button
                        kind="danger"
                        size="sm"
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
