import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { getLastClassroomPath } from '../lib/classroomReturn';
import styles from './ClassroomReturnBar.module.css';

/**
 * When the user left a shared class via sidebar or deep link, offers one tap to jump back.
 */
export default function ClassroomReturnBar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const back = getLastClassroomPath();

  if (!back || pathname === back || pathname.startsWith(`${back}/`)) {
    return null;
  }

  return (
    <div className={styles.bar} role="region" aria-label={t('classroom.returnBarAria')}>
      <Link to={back} className={styles.link}>
        <ArrowLeft size={16} strokeWidth={2.5} aria-hidden />
        <span>{t('classroom.returnToClass')}</span>
      </Link>
    </div>
  );
}
