import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '@ui';

import { AddStudentModal } from '@/features/AddStudent';

import { PersonRow } from '@/entities/User';

import { studentsApi, teacherSummaryApi } from '@/shared/api/api-legacy';
import type { StudentLink, TeacherSummaryPayload } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useConfirm } from '@/shared/lib/confirm';
import { useAppSelector } from '@/shared/lib/storeHooks';

/**
 * StudentsPage — page where the user manages teacher / student relationships.
 *
 * It has two sections:
 *   1. "My students"   — people I added by email. I can share decks and lessons with them.
 *   2. "My teachers"   — people who added me as a student. Their decks/lessons appear in my account.
 */
export function StudentsPage() {
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
    return () => {
      cancelled = true;
    };
  }, [t, canTeach]);

  useEffect(() => {
    const next: Record<number, string> = {};
    students.forEach((s) => {
      next[s.linkId] = s.privateNotes ?? '';
    });
    setNotesDraft(next);
  }, [students]);

  const handleAdded = (link: StudentLink) => {
    setStudents((prev) => [link, ...prev]);
  };

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
      const { data } = await studentsApi.patchMyStudentNotes(linkId, {
        privateNotes: text,
      });
      setStudents((prev) =>
        prev.map((row) =>
          row.linkId === linkId
            ? { ...row, privateNotes: data.privateNotes }
            : row,
        ),
      );
      toast.success(t('students.notesSaved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('students.notesFailed'));
    } finally {
      setSavingNotesFor(null);
    }
  };

  return (
    <div className='box-border w-full py-10'>
      <div className='mb-4'>
        <Link to='/classes' className='btn btn-secondary btn-sm'>
          ← {t('classes.backToGrid')}
        </Link>
      </div>
      <PageHeader
        title={canTeach ? t('students.title') : t('students.titleLearner')}
        subtitle={
          canTeach ? t('students.subtitle') : t('students.subtitleLearner')
        }
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
          <div className='grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 text-sm'>
            <div>
              <div className='text-text3 text-xs'>
                {t('students.summaryStudents')}
              </div>
              <div className='text-lg font-bold'>{summary.linkedStudents}</div>
            </div>
            <div>
              <div className='text-text3 text-xs'>
                {t('students.summaryBookings')}
              </div>
              <div className='text-lg font-bold'>
                {summary.upcomingBookings}
              </div>
            </div>
            <div>
              <div className='text-text3 text-xs'>
                {t('students.summaryAssignments')}
              </div>
              <div className='text-lg font-bold'>{summary.openAssignments}</div>
            </div>
            <div>
              <div className='text-text3 text-xs'>
                {t('students.summaryRating')}
              </div>
              <div className='text-lg font-bold'>
                {summary.averageRating != null
                  ? summary.averageRating.toFixed(1)
                  : '—'}
              </div>
            </div>
            <div>
              <div className='text-text3 text-xs'>
                {t('students.summaryReviews')}
              </div>
              <div className='text-lg font-bold'>{summary.reviewCount}</div>
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
            <div className='grid gap-2'>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={64} />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon='👥'
              title={t('students.noStudents')}
              description={t('students.noStudentsHelp')}
            >
              <Button onClick={() => setShowAdd(true)}>
                + {t('students.addFirst')}
              </Button>
            </EmptyState>
          ) : (
            students.map((link) => (
              <div key={link.linkId} className='mb-4'>
                <PersonRow
                  name={link.user.displayName || link.user.username}
                  email={link.user.email}
                  avatarUrl={link.user.avatarUrl}
                  action={
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='primary'
                        size='sm'
                        onClick={() => navigate(`/class/${link.linkId}`)}
                      >
                        {t('students.openClassroom')}
                      </Button>
                      <Button
                        variant='secondary'
                        size='sm'
                        onClick={() => navigate(`/messages/${link.user.id}`)}
                      >
                        {t('chat.open')}
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemove(link)}
                      >
                        {t('students.remove')}
                      </Button>
                    </div>
                  }
                />
                <div className='mt-2.5 ml-[52px]'>
                  <label className='mb-1.5 block text-[13px]'>
                    {t('students.privateNotesLabel')}
                  </label>
                  <textarea
                    className='input-field box-border w-full max-w-[480px]'
                    rows={3}
                    value={notesDraft[link.linkId] ?? ''}
                    placeholder={t('students.privateNotesPlaceholder')}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [link.linkId]: e.target.value,
                      }))
                    }
                  />
                  <div className='mt-2'>
                    <Button
                      variant='secondary'
                      size='sm'
                      disabled={savingNotesFor === link.linkId}
                      onClick={() => void saveNotes(link.linkId)}
                    >
                      {savingNotesFor === link.linkId
                        ? t('common.loading')
                        : t('students.saveNotes')}
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
            icon='🎓'
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
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='primary'
                    size='sm'
                    onClick={() => navigate(`/class/${link.linkId}`)}
                  >
                    {t('students.openClassroom')}
                  </Button>
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => navigate(`/messages/${link.user.id}`)}
                  >
                    {t('chat.open')}
                  </Button>
                </div>
              }
            />
          ))
        )}
      </SectionCard>

      {showAdd && canTeach && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}
