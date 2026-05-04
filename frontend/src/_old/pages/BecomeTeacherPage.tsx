import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUser } from '../store/authSlice';
import styles from './BecomeTeacherPage.module.css';

const FEATURES = [
  { icon: '👥', titleKey: 'become.feature1Title', textKey: 'become.feature1Text' },
  { icon: '📘', titleKey: 'become.feature2Title', textKey: 'become.feature2Text' },
  { icon: '📅', titleKey: 'become.feature3Title', textKey: 'become.feature3Text' },
  { icon: '🎯', titleKey: 'become.feature4Title', textKey: 'become.feature4Text' },
] as const;

/**
 * Page that converts a learner account to a teacher account in one click.
 * After upgrading the user lands on the teacher listing form to fill in details.
 */
export default function BecomeTeacherPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const isTeacher = user.role === 'TEACHER' || user.role === 'ADMIN';

  const handleUpgrade = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.upgradeToTeacher();
      dispatch(updateUser(data));
      toast.success(t('become.success'));
      navigate('/settings?tab=teacher');
    } catch {
      toast.error(t('become.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.badge}>{t('become.badge')}</span>
        <h1 className={styles.title}>{t('become.title')}</h1>
        <p className={styles.subtitle}>{t('become.subtitle')}</p>

        {isTeacher ? (
          <div className={styles.alreadyCard}>
            <strong>{t('become.alreadyTitle')}</strong>
            <p>{t('become.alreadyHelp')}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/settings?tab=teacher')}
            >
              {t('become.openListing')} →
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={busy}
            onClick={() => void handleUpgrade()}
          >
            {busy ? t('common.loading') : t('become.cta')} →
          </button>
        )}
      </div>

      <div className={styles.featureGrid}>
        {FEATURES.map((f) => (
          <div key={f.titleKey} className={styles.featureCard}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <h3 className={styles.featureTitle}>{t(f.titleKey)}</h3>
            <p className={styles.featureText}>{t(f.textKey)}</p>
          </div>
        ))}
      </div>

      <div className={styles.faq}>
        <h2 className={styles.faqTitle}>{t('become.faqTitle')}</h2>
        <details className={styles.faqItem}>
          <summary>{t('become.q1')}</summary>
          <p>{t('become.a1')}</p>
        </details>
        <details className={styles.faqItem}>
          <summary>{t('become.q2')}</summary>
          <p>{t('become.a2')}</p>
        </details>
        <details className={styles.faqItem}>
          <summary>{t('become.q3')}</summary>
          <p>{t('become.a3')}</p>
        </details>
      </div>
    </div>
  );
}
