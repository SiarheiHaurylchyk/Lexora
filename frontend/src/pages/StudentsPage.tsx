import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { studentsApi, teacherSummaryApi } from '../services/api';
import type { TeacherSummaryPayload } from '../services/types';
import type { StudentLink } from '../services/types';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton, useConfirm } from '../components/ui';
import AddStudentModal from '../components/students/AddStudentModal';
import PersonRow from '../components/students/PersonRow';
import { getApiErrorMessage } from '../lib/apiError';
import { useAppSelector } from '../store/hooks';
import { userCanTeach } from '../lib/accountRole';

/**
 * StudentsPage — page where the user manages teacher / student relationships.
 *
 * It has two sections:
 *   1. "My students"   — people I added by email. I can share decks and lessons with them.
 *   2. "My teachers"   — people who added me as a student. Their decks/lessons appear in my account.
 */
export default function StudentsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const me = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(me?.role);
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [teachers, setTeachers] = useState<StudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [summary, setSummary] = useState<TeacherSummaryPayload | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [savingNotesFor, setSavingNotesFor] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await studentsApi.getMyTeachers();
        if (cancelled) return;
        setTeachers(mine.data);
        if (canTeach) {
          const my = await studentsApi.getMyStudents();
          if (cancelled) return;
          setStudents(my.data);
          try {
            const s = await teacherSummaryApi.get();
            if (!cancelled) setSummary(s.data);
          } catch {
            if (!cancelled) setSummary(null);
          }
        } else {
          setStudents([]);
          setSummary(null);
        }
      } catch {
        if (!cancelled) toast.error(t('students.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t, canTeach]);

  useEffect(() => {
    const next: Record<number, string> = {};
    students.forEach((s) => {
      next[s.linkId] = s.privateNotes ?? '';
    });
    setNotesDraft(next);
  }, [students]);

  /** Add a freshly invited student to the top of the list. */
  const handleAdded = (link: StudentLink) => {
    setStudents((prev) => [link, ...prev]);
  };

  /** Remove a student from the teacher's list (after a confirm). */
  const handleRemove = async (link: StudentLink) => {
    const name = link.user.displayName || link.user.username;
    const ok = await confirm({
      message: t('students.removeConfirm', { name }),
      variant: 'danger',
      confirmText: t('students.remove'),
    });
    if (!ok) return;
    try {
      await studentsApi.removeStudent(link.linkId);
      setStudents((prev) => prev.filter((x) => x.linkId !== link.linkId));
      toast.success(t('students.removedToast', { name }));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('students.removeFailed'));
    }
  };

  const saveNotes = async (linkId: number) => {
    const text = notesDraft[linkId] ?? '';
    setSavingNotesFor(linkId);
    try {
      const { data } = await studentsApi.patchMyStudentNotes(linkId, { privateNotes: text });
      setStudents((prev) => prev.map((row) => (row.linkId === linkId ? { ...row, privateNotes: data.privateNotes } : row)));
      toast.success(t('students.notesSaved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('students.notesFailed'));
    } finally {
      setSavingNotesFor(null);
    }
  };

  return (
    <div style={{ padding: '40px 0', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 18 }}>
        <Link to="/classes" className="btn btn-secondary btn-sm">
          ← {t('classes.backToGrid')}
        </Link>
      </div>
      <PageHeader
        title={canTeach ? t('students.title') : t('students.titleLearner')}
        subtitle={canTeach ? t('students.subtitle') : t('students.subtitleLearner')}
        actions={
          canTeach ? (
            <Button onClick={() => setShowAdd(true)}>
              + {t('students.addBtn')}
            </Button>
          ) : undefined
        }
      />

      {canTeach && summary && (
        <SectionCard title={t('students.summaryTitle')}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
              fontSize: 14,
            }}
          >
            <div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>{t('students.summaryStudents')}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{summary.linkedStudents}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>{t('students.summaryBookings')}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{summary.upcomingBookings}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>{t('students.summaryAssignments')}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{summary.openAssignments}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>{t('students.summaryRating')}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {summary.averageRating != null ? summary.averageRating.toFixed(1) : '—'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text3)', fontSize: 12 }}>{t('students.summaryReviews')}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{summary.reviewCount}</div>
            </div>
          </div>
        </SectionCard>
      )}

      {canTeach && (
        <SectionCard
          title={t('students.myStudents', { count: students.length })}
          description={t('students.myStudentsHelp')}
        >
          {loading ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={64} />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon="👥"
              title={t('students.noStudents')}
              description={t('students.noStudentsHelp')}
            >
              <Button onClick={() => setShowAdd(true)}>
                + {t('students.addFirst')}
              </Button>
            </EmptyState>
          ) : (
            students.map((link) => (
              <div key={link.linkId} style={{ marginBottom: 16 }}>
                <PersonRow
                  name={link.user.displayName || link.user.username}
                  email={link.user.email}
                  avatarUrl={link.user.avatarUrl}
                  action={
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button kind="primary" size="sm" onClick={() => navigate(`/class/${link.linkId}`)}>
                        {t('students.openClassroom')}
                      </Button>
                      <Button kind="secondary" size="sm" onClick={() => navigate(`/messages/${link.user.id}`)}>
                        {t('chat.open')}
                      </Button>
                      <Button kind="ghost" size="sm" onClick={() => handleRemove(link)}>
                        {t('students.remove')}
                      </Button>
                    </div>
                  }
                />
                <div style={{ marginTop: 10, marginLeft: 52 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('students.privateNotesLabel')}</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    style={{ width: '100%', maxWidth: 480, boxSizing: 'border-box' }}
                    value={notesDraft[link.linkId] ?? ''}
                    placeholder={t('students.privateNotesPlaceholder')}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [link.linkId]: e.target.value,
                      }))
                    }
                  />
                  <div style={{ marginTop: 8 }}>
                    <Button
                      kind="secondary"
                      size="sm"
                      disabled={savingNotesFor === link.linkId}
                      onClick={() => void saveNotes(link.linkId)}
                    >
                      {savingNotesFor === link.linkId ? t('common.loading') : t('students.saveNotes')}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      )}

      <SectionCard
        title={t('students.myTeachers', { count: teachers.length })}
        description={t('students.myTeachersHelp')}
      >
        {loading ? (
          <Skeleton height={64} />
        ) : teachers.length === 0 ? (
          <EmptyState
            icon="🎓"
            title={t('students.noTeachers')}
            description={t('students.noTeachersHelp')}
          />
        ) : (
          teachers.map((link) => (
            <PersonRow
              key={link.linkId}
              name={link.user.displayName || link.user.username}
              email={link.user.email}
              avatarUrl={link.user.avatarUrl}
              badgeText={t('students.teacherBadge')}
              action={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button kind="primary" size="sm" onClick={() => navigate(`/class/${link.linkId}`)}>
                    {t('students.openClassroom')}
                  </Button>
                  <Button kind="secondary" size="sm" onClick={() => navigate(`/messages/${link.user.id}`)}>
                    {t('chat.open')}
                  </Button>
                </div>
              }
            />
          ))
        )}
      </SectionCard>

      {showAdd && canTeach && (
        <AddStudentModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}
    </div>
  );
}
