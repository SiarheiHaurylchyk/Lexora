import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarClock, GraduationCap, Layers } from 'lucide-react';
import { bookingsApi } from '../services/api';
import type { NextBookingPayload } from '../services/types';
import { useAppSelector } from '../store/hooks';
import { userCanTeach } from '../lib/accountRole';
import styles from './HomeHubPage.module.css';

/**
 * Post-login hub: choose “classes” (people, classroom, schedule) or “flashcards” (decks).
 */
export default function HomeHubPage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(user?.role);
  const [nextBooking, setNextBooking] = useState<NextBookingPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await bookingsApi.nextBooking();
        if (!cancelled) setNextBooking(data);
      } catch {
        if (!cancelled) setNextBooking(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextBookingWhen =
    nextBooking?.hasBooking && nextBooking.startTime && nextBooking.endTime
      ? (() => {
          const start = new Date(nextBooking.startTime);
          const end = new Date(nextBooking.endTime);
          const d = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          const t1 = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const t2 = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          return `${d} · ${t1} – ${t2}`;
        })()
      : '';

  const classesPath = '/classes';
  const cardsPath = '/decks';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('hub.title')}</h1>
      <p className={styles.subtitle}>{t('hub.subtitle')}</p>

      {nextBooking?.hasBooking && nextBookingWhen && (
        <div className={styles.nextBanner}>
          <CalendarClock size={22} strokeWidth={2.25} style={{ color: 'var(--brand-light)', flexShrink: 0 }} aria-hidden />
          <div className={styles.nextBannerBody}>
            <div className={styles.nextBannerTitle}>{t('dashboard.nextLesson.title')}</div>
            <div className={styles.nextBannerMeta}>
              {nextBooking.asTeacher
                ? t('dashboard.nextLesson.withStudent', { name: nextBooking.counterpartName || '—' })
                : t('dashboard.nextLesson.withTeacher', { name: nextBooking.counterpartName || '—' })}
            </div>
            <div className={styles.nextBannerWhen}>{nextBookingWhen}</div>
          </div>
          <div className={styles.nextBannerActions}>
            {nextBooking.classroomLinkId != null && (
              <Link to={`/class/${nextBooking.classroomLinkId}`} className="btn btn-primary btn-sm">
                {t('dashboard.nextLesson.openClassroom')}
              </Link>
            )}
            {nextBooking.meetingUrl?.trim() && (
              <a
                href={nextBooking.meetingUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                {t('dashboard.nextLesson.join')}
              </a>
            )}
            {!nextBooking.asTeacher && (
              <Link to="/bookings" className="btn btn-secondary btn-sm">
                {t('dashboard.nextLesson.allBookings')}
              </Link>
            )}
            {nextBooking.asTeacher && (
              <Link to="/schedule" className="btn btn-secondary btn-sm">
                {t('dashboard.nextLesson.openSchedule')}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className={styles.cards}>
        <Link to={classesPath} className={styles.choiceCard}>
          <div className={`${styles.choiceTop} ${styles.choiceTopClasses}`}>
            <GraduationCap className={styles.choiceIcon} size={48} strokeWidth={2} aria-hidden />
          </div>
          <div className={styles.choiceBody}>
            <div className={styles.choiceLabel}>{t('hub.classesKicker')}</div>
            <h2 className={styles.choiceTitle}>{t('hub.classesTitle')}</h2>
            <p className={styles.choiceDesc}>{t(canTeach ? 'hub.classesDescTeacher' : 'hub.classesDescLearner')}</p>
            <span className={styles.choiceArrow}>
              {t('hub.go')} <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </span>
          </div>
        </Link>

        <Link to={cardsPath} className={styles.choiceCard}>
          <div className={`${styles.choiceTop} ${styles.choiceTopCards}`}>
            <Layers className={styles.choiceIcon} size={48} strokeWidth={2} aria-hidden />
          </div>
          <div className={styles.choiceBody}>
            <div className={styles.choiceLabel}>{t('hub.cardsKicker')}</div>
            <h2 className={styles.choiceTitle}>{t('hub.cardsTitle')}</h2>
            <p className={styles.choiceDesc}>{t('hub.cardsDesc')}</p>
            <span className={styles.choiceArrow}>
              {t('hub.go')} <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
