import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { TeacherDirectoryEntry } from '../../services/types';
import { getYouTubeThumbUrl } from '../../lib/youtube';
import styles from './TeacherCard.module.css';

interface Props {
  teacher: TeacherDirectoryEntry;
}

/**
 * One tutor card for the discovery grid (italki-style layout, Lexora dark theme).
 */
export default function TeacherCard({ teacher }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const thumb = teacher.introVideoUrl ? getYouTubeThumbUrl(teacher.introVideoUrl) : null;
  const langs = teacher.languages ?? [];
  const headline =
    teacher.headline?.trim() || t('teachers.card.defaultHeadline');

  const statsLine = t('teachers.card.statsShort', {
    students: teacher.studentCount,
    lessons: teacher.lessonCount,
  });

  const rateLabel =
    teacher.hourlyRate != null && teacher.hourlyRate > 0
      ? t('teachers.card.rateFrom', { amount: teacher.hourlyRate.toFixed(2) })
      : t('teachers.card.rateAsk');

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => navigate(`/teachers/${teacher.id}`)}
    >
      <div className={styles.media}>
        {thumb ? (
          <>
            <img src={thumb} alt="" className={styles.cover} loading="lazy" />
            <span className={styles.playBadge} aria-hidden>▶</span>
          </>
        ) : teacher.avatarUrl ? (
          <img src={teacher.avatarUrl} alt="" className={styles.cover} loading="lazy" />
        ) : (
          <div className={styles.coverFallback}>
            {(teacher.displayName || teacher.username)[0].toUpperCase()}
          </div>
        )}
        <div className={styles.statsBadge}>{statsLine}</div>
        {teacher.offersTrialLesson && (
          <div className={styles.trialBadge}>{t('teachers.card.trial')}</div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{teacher.displayName}</span>
          <span className={styles.chevron} aria-hidden>›</span>
        </div>
        <div className={styles.role}>{headline}</div>

        {langs.length > 0 && (
          <div className={styles.langRow}>
            {langs.slice(0, 6).map((code) => (
              <span key={code} className={styles.pill}>
                {t(`languages.${code}`, { defaultValue: code })}
              </span>
            ))}
          </div>
        )}

        {teacher.bioPreview && (
          <p className={styles.bio}>{teacher.bioPreview}</p>
        )}

        <div className={styles.footer}>
          <span className={styles.price}>{rateLabel}</span>
          <span className={styles.priceHint}>
            {t('teachers.card.decksPublic', { count: teacher.publicDeckCount })}
          </span>
        </div>
      </div>
    </button>
  );
}
