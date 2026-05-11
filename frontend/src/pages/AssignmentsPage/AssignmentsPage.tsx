import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '@ui';

import { assignmentsApi, deckApi, studentsApi } from '@/shared/api/api-legacy';
import type { StudentAssignmentItem, StudentLink } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAppSelector } from '@/shared/lib/storeHooks';

const labelClasses = tw`mb-1.5 block text-[13px]`;
const rowClasses = tw`list-none rounded-[12px] border border-border bg-surface px-4 py-3.5`;

export function AssignmentsPage() {
  const { t, i18n } = useTranslation();
  const me = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(me?.role);

  const [received, setReceived] = useState<StudentAssignmentItem[]>([]);
  const [sent, setSent] = useState<StudentAssignmentItem[]>([]);
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [decks, setDecks] = useState<{ id: number; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [completeId, setCompleteId] = useState<number | null>(null);

  const [studentId, setStudentId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deckId, setDeckId] = useState<number | ''>('');
  const [responseMode, setResponseMode] = useState<
    'TEXT' | 'AUDIO_LINK' | 'READ_ALOUD'
  >('TEXT');
  const [responseDrafts, setResponseDrafts] = useState<Record<number, string>>(
    {},
  );
  const [savingResponseId, setSavingResponseId] = useState<number | null>(null);

  const reload = async () => {
    const { data } = await assignmentsApi.list();
    setReceived(data.received ?? []);
    setSent(data.sent ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await assignmentsApi.list();
        if (cancelled) return;
        setReceived(data.received ?? []);
        setSent(data.sent ?? []);
        if (canTeach) {
          const [st, dk] = await Promise.all([
            studentsApi.getMyStudents(),
            deckApi.getMyDecks(),
          ]);
          if (!cancelled) {
            setStudents(st.data);
            setDecks(dk.data.map((d) => ({ id: d.id, title: d.title })));
          }
        }
      } catch {
        if (!cancelled) toast.error(t('assignments.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, canTeach]);

  useEffect(() => {
    const d: Record<number, string> = {};
    received.forEach((x) => {
      d[x.id] = x.studentResponse ?? '';
    });
    setResponseDrafts(d);
  }, [received]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || studentId === '') {
      toast.error(t('assignments.needTitleStudent'));
      return;
    }
    setCreating(true);
    try {
      await assignmentsApi.create({
        studentUserId: Number(studentId),
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
        deckId: deckId === '' ? undefined : Number(deckId),
        responseMode,
      });
      toast.success(t('assignments.createdToast'));
      setTitle('');
      setInstructions('');
      setDueDate('');
      setDeckId('');
      setResponseMode('TEXT');
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('assignments.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleComplete = async (id: number) => {
    setCompleteId(id);
    try {
      await assignmentsApi.markComplete(id);
      toast.success(t('assignments.completedToast'));
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('assignments.completeFailed'));
    } finally {
      setCompleteId(null);
    }
  };

  const saveStudentResponse = async (id: number) => {
    setSavingResponseId(id);
    try {
      await assignmentsApi.patchStudentResponse(id, {
        studentResponse: responseDrafts[id] ?? '',
      });
      toast.success(t('assignments.responseSaved'));
      await reload();
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('assignments.responseSaveFailed'),
      );
    } finally {
      setSavingResponseId(null);
    }
  };

  const formatDue = (s: string | null | undefined) => {
    if (!s) return '';
    try {
      return new Date(s).toLocaleDateString(i18n.language);
    } catch {
      return s;
    }
  };

  const renderRow = (a: StudentAssignmentItem, mode: 'received' | 'sent') => (
    <li key={a.id} className={rowClasses}>
      <div className='mb-1.5 font-bold'>{a.title}</div>
      <div className='text-text2 mb-2 text-[13px]'>
        {mode === 'received'
          ? t('assignments.fromTeacher', { name: a.teacherName })
          : t('assignments.forStudent', { name: a.studentName })}
      </div>
      {a.instructions?.trim() && (
        <p className='mb-2.5 text-sm whitespace-pre-wrap'>{a.instructions}</p>
      )}
      {a.responseMode && a.responseMode !== 'TEXT' && (
        <p className='text-text2 mb-2 text-xs'>
          {t(`assignments.responseMode.${a.responseMode}`)}
        </p>
      )}
      <div className='text-text3 mb-2.5 text-xs'>
        {a.dueDate && (
          <span>
            {t('assignments.due')}: {formatDue(a.dueDate)} ·{' '}
          </span>
        )}
        <span>
          {t('assignments.status')}:{' '}
          {a.completedByStudent ? t('assignments.done') : t('assignments.open')}
        </span>
      </div>
      {mode === 'sent' && a.studentResponse?.trim() && (
        <p className='mb-2.5 text-[13px] whitespace-pre-wrap'>
          <strong>{t('assignments.studentReply')}:</strong> {a.studentResponse}
        </p>
      )}
      {mode === 'received' && !a.completedByStudent && (
        <div className='mb-2.5'>
          <label className='text-text2 mb-1.5 block text-xs'>
            {t('assignments.yourResponseLabel')}
          </label>
          <textarea
            className='input-field'
            rows={3}
            value={responseDrafts[a.id] ?? ''}
            onChange={(e) =>
              setResponseDrafts((p) => ({ ...p, [a.id]: e.target.value }))
            }
            placeholder={
              a.responseMode === 'AUDIO_LINK'
                ? t('assignments.responsePlaceholderAudio')
                : a.responseMode === 'READ_ALOUD'
                  ? t('assignments.responsePlaceholderReadAloud')
                  : t('assignments.responsePlaceholderText')
            }
          />
          <div className='mt-2'>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              disabled={savingResponseId === a.id}
              onClick={() => void saveStudentResponse(a.id)}
            >
              {savingResponseId === a.id
                ? t('common.loading')
                : t('assignments.saveResponse')}
            </Button>
          </div>
        </div>
      )}
      <div className='flex flex-wrap gap-2'>
        {a.deckId != null && (
          <Link to={`/decks/${a.deckId}`} className='btn btn-secondary btn-sm'>
            {t('assignments.openDeck')}
          </Link>
        )}
        {a.lessonId != null && (
          <Link
            to={`/lessons/${a.lessonId}`}
            className='btn btn-secondary btn-sm'
          >
            {t('assignments.openLesson')}
          </Link>
        )}
        {mode === 'received' && !a.completedByStudent && (
          <Button
            variant='primary'
            size='sm'
            disabled={completeId === a.id}
            onClick={() => void handleComplete(a.id)}
          >
            {completeId === a.id
              ? t('common.loading')
              : t('assignments.markDone')}
          </Button>
        )}
      </div>
    </li>
  );

  return (
    <div className='box-border w-full py-10'>
      <PageHeader
        title={t('assignments.title')}
        subtitle={t('assignments.subtitle')}
      />

      {canTeach && (
        <SectionCard
          title={t('assignments.createTitle')}
          description={t('assignments.createHelp')}
        >
          <form
            onSubmit={(e) => void handleCreate(e)}
            className='grid max-w-[520px] gap-3'
          >
            <label>
              <span className={labelClasses}>
                {t('assignments.fieldStudent')}
              </span>
              <select
                className='input-field'
                value={studentId === '' ? '' : String(studentId)}
                onChange={(e) =>
                  setStudentId(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
                required
              >
                <option value=''>{t('assignments.pickStudent')}</option>
                {students.map((s) => (
                  <option key={s.linkId} value={s.user.id}>
                    {s.user.displayName || s.user.username}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClasses}>
                {t('assignments.fieldTitle')}
              </span>
              <input
                className='input-field'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                required
              />
            </label>
            <label>
              <span className={labelClasses}>
                {t('assignments.fieldInstructions')}
              </span>
              <textarea
                className='input-field'
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
            <label>
              <span className={labelClasses}>{t('assignments.fieldDue')}</span>
              <input
                className='input-field'
                type='date'
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <label>
              <span className={labelClasses}>{t('assignments.fieldDeck')}</span>
              <select
                className='input-field'
                value={deckId === '' ? '' : String(deckId)}
                onChange={(e) =>
                  setDeckId(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                <option value=''>{t('assignments.noDeck')}</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClasses}>
                {t('assignments.fieldResponseMode')}
              </span>
              <select
                className='input-field'
                value={responseMode}
                onChange={(e) =>
                  setResponseMode(
                    e.target.value as 'TEXT' | 'AUDIO_LINK' | 'READ_ALOUD',
                  )
                }
              >
                <option value='TEXT'>
                  {t('assignments.responseMode.TEXT')}
                </option>
                <option value='AUDIO_LINK'>
                  {t('assignments.responseMode.AUDIO_LINK')}
                </option>
                <option value='READ_ALOUD'>
                  {t('assignments.responseMode.READ_ALOUD')}
                </option>
              </select>
            </label>
            <div>
              <Button type='submit' disabled={creating}>
                {creating ? t('common.loading') : t('assignments.submit')}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title={t('assignments.receivedTitle', { count: received.length })}
      >
        {loading ? (
          <Skeleton height={100} rounded={14} />
        ) : received.length === 0 ? (
          <EmptyState
            icon='📝'
            title={t('assignments.receivedEmpty')}
            description={t('assignments.receivedEmptyHint')}
          />
        ) : (
          <ul className='m-0 flex flex-col gap-3 p-0'>
            {received.map((a) => renderRow(a, 'received'))}
          </ul>
        )}
      </SectionCard>

      {canTeach && (
        <SectionCard title={t('assignments.sentTitle', { count: sent.length })}>
          {loading ? (
            <Skeleton height={100} rounded={14} />
          ) : sent.length === 0 ? (
            <EmptyState
              icon='✉️'
              title={t('assignments.sentEmpty')}
              description={t('assignments.sentEmptyHint')}
            />
          ) : (
            <ul className='m-0 flex flex-col gap-3 p-0'>
              {sent.map((a) => renderRow(a, 'sent'))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
