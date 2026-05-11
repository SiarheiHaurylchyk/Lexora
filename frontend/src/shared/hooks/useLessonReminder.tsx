import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { bookingsApi } from '../api/api-legacy';

const POLL_MS = 90_000;

/**
 * While the user is logged in, polls the server for a lesson starting within the next hour
 * and shows an on-screen reminder (toast). Email reminders are handled server-side.
 */
export function useLessonReminder() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lastToastDedupeKey = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const { data } = await bookingsApi.lessonReminder();
        if (cancelled) return;

        if (!data.active || data.slotId == null || !data.startTime) {
          lastToastDedupeKey.current = null;
          return;
        }

        const dedupeKey = `${data.slotId}:${data.startTime}`;
        if (lastToastDedupeKey.current === dedupeKey) return;
        lastToastDedupeKey.current = dedupeKey;

        const start = new Date(data.startTime);
        const when = start.toLocaleString(i18n.language, {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        const name = data.counterpartName || '';
        const body = data.asTeacher
          ? t('reminders.toastTeacher', { name, when })
          : t('reminders.toastStudent', { name, when });

        toast.custom(
          (toastItem) => (
            <div
              style={{
                background: '#1E1E28',
                color: '#F4F4F8',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '14px 16px',
                maxWidth: 340,
                boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {t('reminders.toastTitle')}
              </div>
              <div style={{ opacity: 0.92 }}>{body}</div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {data.classroomLinkId != null && (
                  <button
                    type='button'
                    onClick={() => {
                      navigate(`/class/${data.classroomLinkId}`);
                      toast.dismiss(toastItem.id);
                    }}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {t('reminders.openClassroom')} →
                  </button>
                )}
                {data.meetingUrl?.trim() && (
                  <a
                    href={data.meetingUrl.trim()}
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{
                      display: 'inline-block',
                      fontSize: 13,
                      color: 'var(--brand-light, #a78bfa)',
                      fontWeight: 600,
                      alignSelf: 'center',
                    }}
                  >
                    {t('reminders.joinCall')} →
                  </a>
                )}
              </div>
              <button
                type='button'
                onClick={() => toast.dismiss(toastItem.id)}
                style={{
                  marginTop: 12,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 13,
                }}
              >
                {t('reminders.dismiss')}
              </button>
            </div>
          ),
          { duration: 25000, id: `lesson-reminder-${data.slotId}` },
        );
      } catch {
        /* ignore network errors */
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [t, i18n.language, navigate]);
}
