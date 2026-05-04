import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { studentsApi } from '../services/api';
import type { StudentLink } from '../services/types';
import ClassCard from '../components/classes/ClassCard';
import { userCanTeach } from '../lib/accountRole';
import { useAppSelector } from '../store/hooks';
import styles from './MyClassesPage.module.css';

function matchesQuery(link: StudentLink, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  const u = link.user;
  return (
    (u.displayName?.toLowerCase().includes(n) ?? false) ||
    u.username.toLowerCase().includes(n) ||
    (u.email?.toLowerCase().includes(n) ?? false) ||
    String(link.linkId).includes(n)
  );
}

/**
 * Grid of shared classrooms (teacher ↔ student), same entry point for both roles.
 */
export default function MyClassesPage() {
  const { t } = useTranslation();
  const me = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(me?.role);
  const [items, setItems] = useState<StudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(q.trim()), 280);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (canTeach) {
          const { data } = await studentsApi.getMyStudents();
          if (!cancelled) setItems(data);
        } else {
          const { data } = await studentsApi.getMyTeachers();
          if (!cancelled) setItems(data);
        }
      } catch {
        if (!cancelled) {
          toast.error(t('classes.loadFailed'));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canTeach, t]);

  const filtered = useMemo(() => items.filter((row) => matchesQuery(row, qDebounced)), [items, qDebounced]);

  const peerRole = canTeach ? 'student' : 'teacher';

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>{t('classes.title')}</h1>
        <p className={styles.subtitle}>{canTeach ? t('classes.subtitleTeacher') : t('classes.subtitleLearner')}</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={18} strokeWidth={2} className={styles.searchIcon} aria-hidden />
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder={t('classes.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('classes.searchPlaceholder')}
          />
        </div>
      </div>

      {!loading && filtered.length > 0 && (
        <p className={styles.found}>{t('classes.found', { count: filtered.length })}</p>
      )}

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeleton}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎓</div>
          <h2 className={styles.emptyTitle}>{t('classes.emptyTitle')}</h2>
          <p className={styles.emptyText}>
            {items.length === 0
              ? canTeach
                ? t('classes.emptyHelpTeacherZero')
                : t('classes.emptyHelpLearnerZero')
              : t('classes.emptyHelpSearch')}
          </p>
          {items.length === 0 && !canTeach && (
            <Link to="/teachers" className="btn btn-primary">
              {t('classes.findTeachers')}
            </Link>
          )}
          {items.length === 0 && canTeach && (
            <Link to="/students" className="btn btn-primary">
              {t('students.addFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((link) => (
            <ClassCard key={link.linkId} link={link} peerRole={peerRole} />
          ))}
        </div>
      )}

      {canTeach && (
        <div className={styles.footerLinks}>
          <Link to="/students" className={styles.rosterLink}>
            {t('classes.manageRoster')} →
          </Link>
        </div>
      )}
    </div>
  );
}
