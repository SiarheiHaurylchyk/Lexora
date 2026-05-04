import React from 'react';
import { Navigate } from 'react-router-dom';
import AvailabilityEditor from '../components/teachers/AvailabilityEditor';
import { userCanTeach } from '../lib/accountRole';
import { useAppSelector } from '../store/hooks';
import styles from './SchedulePage.module.css';

/**
 * Teacher-only weekly availability — standalone route (sidebar “My schedule”).
 * No Settings chrome so this entry never feels like “opening settings”.
 */
export default function SchedulePage() {
  const user = useAppSelector((s) => s.auth.user);

  if (!userCanTeach(user?.role)) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className={styles.page}>
      <AvailabilityEditor variant="page" />
    </div>
  );
}
