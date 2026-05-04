import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { StudentLink } from '../../services/types';
import styles from './ClassCard.module.css';

type Props = {
  link: StudentLink;
  /** Teacher card shows student as peer; learner shows teacher. */
  peerRole: 'student' | 'teacher';
};

export default function ClassCard({ link, peerRole }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const u = link.user;
  const display = u.displayName?.trim() || u.username;
  const initial = display.slice(0, 1).toUpperCase();

  const subtitle =
    peerRole === 'student' ? t('classes.peerSubtitleStudent') : t('classes.peerSubtitleTeacher');

  const since =
    link.createdAt &&
    t('classes.since', {
      date: new Date(link.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    });

  return (
    <button type="button" className={styles.card} onClick={() => navigate(`/class/${link.linkId}`)}>
      <div className={styles.media}>
        {u.avatarUrl ? (
          <img src={u.avatarUrl} alt="" className={styles.cover} loading="lazy" />
        ) : (
          <div className={styles.coverFallback}>
            <GraduationCap className={styles.placeholderIcon} size={52} strokeWidth={2} aria-hidden />
          </div>
        )}
        <div className={styles.sharedBadge}>{t('classes.sharedClassBadge')}</div>
        {since && <div className={styles.statsBadge}>{since}</div>}
      </div>

      <div className={styles.body}>
        <div className={styles.kicker}>{t('hub.classesKicker')}</div>
        <div className={styles.nameRow}>
          <span className={styles.name}>{display}</span>
          <span className={styles.chevron} aria-hidden>
            ›
          </span>
        </div>
        <div className={styles.role}>{subtitle}</div>

        <div className={styles.pillRow}>
          <span className={styles.pill}>{initial}</span>
          <span className={styles.pill}>{u.username}</span>
        </div>

        {u.email && <p className={styles.bio}>{u.email}</p>}

        <div className={styles.footer}>
          <span className={styles.cta}>{t('classes.openClass')} →</span>
          <span className={styles.meta}>#{link.linkId}</span>
        </div>
      </div>
    </button>
  );
}
