import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { assignmentsApi, deckApi, studentsApi } from '../services/api';
import type { StudentAssignmentItem, StudentLink } from '../services/types';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '../components/ui';
import { getApiErrorMessage } from '../lib/apiError';
import { userCanTeach } from '../lib/accountRole';
import { useAppSelector } from '../store/hooks';

export default function AssignmentsPage() {
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
  const [responseMode, setResponseMode] = useState<'TEXT' | 'AUDIO_LINK' | 'READ_ALOUD'>('TEXT');
  const [responseDrafts, setResponseDrafts] = useState<Record<number, string>>({});
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
          const [st, dk] = await Promise.all([studentsApi.getMyStudents(), deckApi.getMyDecks()]);
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

  const handleCreate = async (e: React.FormEvent) => {
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
      await assignmentsApi.patchStudentResponse(id, { studentResponse: responseDrafts[id] ?? '' });
      toast.success(t('assignments.responseSaved'));
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('assignments.responseSaveFailed'));
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
    <li
      key={a.id}
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        listStyle: 'none',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{a.title}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
        {mode === 'received'
          ? t('assignments.fromTeacher', { name: a.teacherName })
          : t('assignments.forStudent', { name: a.studentName })}
      </div>
      {a.instructions?.trim() && (
        <p style={{ margin: '0 0 10px', fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.instructions}</p>
      )}
      {(a.responseMode && a.responseMode !== 'TEXT') && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text2)' }}>
          {t(`assignments.responseMode.${a.responseMode}`)}
        </p>
      )}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
        {a.dueDate && <span>{t('assignments.due')}: {formatDue(a.dueDate)} · </span>}
        <span>{t('assignments.status')}: {a.completedByStudent ? t('assignments.done') : t('assignments.open')}</span>
      </div>
      {mode === 'sent' && a.studentResponse?.trim() && (
        <p style={{ margin: '0 0 10px', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          <strong>{t('assignments.studentReply')}:</strong> {a.studentResponse}
        </p>
      )}
      {mode === 'received' && !a.completedByStudent && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
            {t('assignments.yourResponseLabel')}
          </label>
          <textarea
            className="input-field"
            rows={3}
            value={responseDrafts[a.id] ?? ''}
            onChange={(e) => setResponseDrafts((p) => ({ ...p, [a.id]: e.target.value }))}
            placeholder={
              a.responseMode === 'AUDIO_LINK'
                ? t('assignments.responsePlaceholderAudio')
                : a.responseMode === 'READ_ALOUD'
                  ? t('assignments.responsePlaceholderReadAloud')
                  : t('assignments.responsePlaceholderText')
            }
          />
          <div style={{ marginTop: 8 }}>
            <Button
              type="button"
              kind="secondary"
              size="sm"
              disabled={savingResponseId === a.id}
              onClick={() => void saveStudentResponse(a.id)}
            >
              {savingResponseId === a.id ? t('common.loading') : t('assignments.saveResponse')}
            </Button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {a.deckId != null && (
          <Link to={`/decks/${a.deckId}`} className="btn btn-secondary btn-sm">
            {t('assignments.openDeck')}
          </Link>
        )}
        {a.lessonId != null && (
          <Link to={`/lessons/${a.lessonId}`} className="btn btn-secondary btn-sm">
            {t('assignments.openLesson')}
          </Link>
        )}
        {mode === 'received' && !a.completedByStudent && (
          <Button
            kind="primary"
            size="sm"
            disabled={completeId === a.id}
            onClick={() => void handleComplete(a.id)}
          >
            {completeId === a.id ? t('common.loading') : t('assignments.markDone')}
          </Button>
        )}
      </div>
    </li>
  );

  return (
    <div style={{ padding: '40px 0', width: '100%', boxSizing: 'border-box' }}>
      <PageHeader title={t('assignments.title')} subtitle={t('assignments.subtitle')} />

      {canTeach && (
        <SectionCard title={t('assignments.createTitle')} description={t('assignments.createHelp')}>
          <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <label>
              <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('assignments.fieldStudent')}</span>
              <select
                className="input-field"
                value={studentId === '' ? '' : String(studentId)}
                onChange={(e) => setStudentId(e.target.value === '' ? '' : Number(e.target.value))}
                required
              >
                <option value="">{t('assignments.pickStudent')}</option>
                {students.map((s) => (
                  <option key={s.linkId} value={s.user.id}>
                    {s.user.displayName || s.user.username}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('assignments.fieldTitle')}</span>
              <input
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                required
              />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('assignments.fieldInstructions')}</span>
              <textarea className="input-field" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('assignments.fieldDue')}</span>
              <input className="input-field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('assignments.fieldDeck')}</span>
              <select
                className="input-field"
                value={deckId === '' ? '' : String(deckId)}
                onChange={(e) => setDeckId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">{t('assignments.noDeck')}</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{t('assignments.fieldResponseMode')}</span>
              <select
                className="input-field"
                value={responseMode}
                onChange={(e) =>
                  setResponseMode(e.target.value as 'TEXT' | 'AUDIO_LINK' | 'READ_ALOUD')
                }
              >
                <option value="TEXT">{t('assignments.responseMode.TEXT')}</option>
                <option value="AUDIO_LINK">{t('assignments.responseMode.AUDIO_LINK')}</option>
                <option value="READ_ALOUD">{t('assignments.responseMode.READ_ALOUD')}</option>
              </select>
            </label>
            <div>
              <Button type="submit" disabled={creating}>
                {creating ? t('common.loading') : t('assignments.submit')}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title={t('assignments.receivedTitle', { count: received.length })}>
        {loading ? (
          <Skeleton height={100} rounded={14} />
        ) : received.length === 0 ? (
          <EmptyState icon="📝" title={t('assignments.receivedEmpty')} description={t('assignments.receivedEmptyHint')} />
        ) : (
          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {received.map((a) => renderRow(a, 'received'))}
          </ul>
        )}
      </SectionCard>

      {canTeach && (
        <SectionCard title={t('assignments.sentTitle', { count: sent.length })}>
          {loading ? (
            <Skeleton height={100} rounded={14} />
          ) : sent.length === 0 ? (
            <EmptyState icon="✉️" title={t('assignments.sentEmpty')} description={t('assignments.sentEmptyHint')} />
          ) : (
            <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sent.map((a) => renderRow(a, 'sent'))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
