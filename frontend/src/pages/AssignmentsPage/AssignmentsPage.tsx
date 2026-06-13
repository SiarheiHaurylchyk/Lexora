import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  EmptyState,
  Modal,
  PageHeader,
  SectionCard,
  Skeleton,
} from '@ui';

import { assignmentsApi } from '@/shared/api/api-legacy';
import type {
  AssignmentsViewPayload,
  DeckItem,
  StudentAssignmentItem,
  StudentLink,
} from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useApiQuery } from '@/shared/lib/query';
import { useAuthStore } from '@/shared/lib/storeHooks';

// ── Due-date urgency helpers ───────────────────────────────────────────────

function isDueOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

function isDueSoon(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff <= 48 * 60 * 60 * 1000; // within 48 hours
}

// ── Filter ─────────────────────────────────────────────────────────────────

type AssignmentFilter = 'all' | 'open' | 'overdue' | 'done';

function applyFilter(
  list: StudentAssignmentItem[],
  filter: AssignmentFilter,
): StudentAssignmentItem[] {
  return list.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'done') return a.completedByStudent;
    if (filter === 'overdue')
      return !a.completedByStudent && isDueOverdue(a.dueDate);
    return !a.completedByStudent; // 'open' = not done (including overdue)
  });
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({
  a,
  doneLabel,
  overdueLabel,
  dueSoonLabel,
}: {
  a: StudentAssignmentItem;
  doneLabel: string;
  overdueLabel: string;
  dueSoonLabel: string;
}) {
  if (a.completedByStudent)
    return (
      <span className='rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400'>
        ✓ {doneLabel}
      </span>
    );
  if (isDueOverdue(a.dueDate))
    return (
      <span className='rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-500'>
        ⚠ {overdueLabel}
      </span>
    );
  if (isDueSoon(a.dueDate))
    return (
      <span className='rounded-full bg-orange-400/15 px-2 py-0.5 text-[11px] font-semibold text-orange-500'>
        ⏰ {dueSoonLabel}
      </span>
    );
  return null;
}

// ── Assignment card ────────────────────────────────────────────────────────

interface AssignmentCardProps {
  a: StudentAssignmentItem;
  mode: 'received' | 'sent';
  responseDraft: string;
  onResponseChange: (val: string) => void;
  savingResponseId: number | null;
  completeId: number | null;
  onSaveResponse: () => void;
  onMarkDone: () => void;
  locale: string;
}

function AssignmentCard({
  a,
  mode,
  responseDraft,
  onResponseChange,
  savingResponseId,
  completeId,
  onSaveResponse,
  onMarkDone,
  locale,
}: AssignmentCardProps) {
  const { t } = useTranslation();
  const [responseOpen, setResponseOpen] = useState(false);

  const formatDue = (s: string | null | undefined) => {
    if (!s) return '';
    try {
      return new Date(s).toLocaleDateString(locale);
    } catch {
      return s;
    }
  };

  const cardBorderClass = cn(
    'rounded-[14px] border bg-[var(--surface)] px-4 py-3.5 transition-colors',
    a.completedByStudent
      ? 'border-l-4 border-green-500/20 border-l-green-500/60'
      : isDueOverdue(a.dueDate)
        ? 'border-l-4 border-red-500/20 border-l-red-500'
        : 'border-[var(--border)]',
  );

  return (
    <li className={cardBorderClass}>
      {/* Title + status */}
      <div className='mb-1 flex flex-wrap items-center gap-2'>
        <span className='font-semibold'>{a.title}</span>
        <StatusBadge
          a={a}
          doneLabel={t('assignments.done')}
          overdueLabel={t('assignments.statusOverdue')}
          dueSoonLabel={t('assignments.statusDueSoon')}
        />
      </div>

      {/* From / for */}
      <div className='text-text2 mb-2 text-[13px]'>
        {mode === 'received'
          ? t('assignments.fromTeacher', { name: a.teacherName })
          : t('assignments.forStudent', { name: a.studentName })}
      </div>

      {/* Instructions */}
      {a.instructions?.trim() && (
        <p className='mb-2.5 text-sm whitespace-pre-wrap'>{a.instructions}</p>
      )}

      {/* Response mode badge (non-TEXT) */}
      {a.responseMode && a.responseMode !== 'TEXT' && (
        <span className='mb-2 inline-block rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] text-[var(--accent)]'>
          {t(`assignments.responseMode.${a.responseMode}`)}
        </span>
      )}

      {/* Due date */}
      {a.dueDate && (
        <div
          className={cn(
            'mb-2.5 text-[12px]',
            isDueOverdue(a.dueDate) && !a.completedByStudent
              ? 'font-semibold text-red-500'
              : 'text-[var(--text3)]',
          )}
        >
          {t('assignments.due')}: {formatDue(a.dueDate)}
        </div>
      )}

      {/* Teacher sees student reply inline */}
      {mode === 'sent' && a.studentResponse?.trim() && (
        <p className='mb-2.5 rounded-[8px] bg-[var(--bg2)] p-2.5 text-[13px] whitespace-pre-wrap'>
          <strong className='text-[var(--text2)]'>
            {t('assignments.studentReply')}:
          </strong>{' '}
          {a.studentResponse}
        </p>
      )}

      {/* Learner response toggle */}
      {mode === 'received' && !a.completedByStudent && (
        <div className='mb-2.5'>
          <button
            type='button'
            className='mb-2 text-[12px] text-[var(--brand)] underline underline-offset-2'
            onClick={() => setResponseOpen((v) => !v)}
          >
            {responseOpen
              ? t('assignments.collapseResponse')
              : t('assignments.yourResponseLabel')}
          </button>
          {responseOpen && (
            <>
              <textarea
                className='input-field'
                rows={3}
                value={responseDraft}
                onChange={(e) => onResponseChange(e.target.value)}
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
                  onClick={onSaveResponse}
                >
                  {savingResponseId === a.id
                    ? t('common.loading')
                    : t('assignments.saveResponse')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
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
            onClick={onMarkDone}
          >
            {completeId === a.id
              ? t('common.loading')
              : t('assignments.markDone')}
          </Button>
        )}
      </div>
    </li>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function AssignmentsPage() {
  const { t, i18n } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const canTeach = userCanTeach(me?.role);
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<AssignmentFilter>('all');
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<number, string>>(
    {},
  );
  const [savingResponseId, setSavingResponseId] = useState<number | null>(null);

  const assignmentsQuery = useApiQuery<AssignmentsViewPayload>({
    queryKey: ['assignments', 'mine'],
    url: '/me/assignments',
  });
  const studentsQuery = useApiQuery<StudentLink[]>({
    queryKey: ['students', 'my-students'],
    url: '/students/my-students',
    enabled: canTeach,
  });
  const decksQuery = useApiQuery<DeckItem[]>({
    queryKey: ['decks', 'my'],
    url: '/decks/my',
    enabled: canTeach,
  });

  const received = assignmentsQuery.data?.received ?? [];
  const sent = assignmentsQuery.data?.sent ?? [];
  const students = studentsQuery.data ?? [];
  const decks = (decksQuery.data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
  }));
  const loading =
    assignmentsQuery.isLoading ||
    (canTeach && (studentsQuery.isLoading || decksQuery.isLoading));
  const loadFailed =
    assignmentsQuery.isError || studentsQuery.isError || decksQuery.isError;
  useEffect(() => {
    if (loadFailed) toast.error(t('assignments.loadFailed'));
  }, [loadFailed, t]);

  // Seed response drafts from API data
  useEffect(() => {
    const d: Record<number, string> = {};
    received.forEach((x) => {
      d[x.id] = x.studentResponse ?? '';
    });
    setResponseDrafts(d);
  }, [received]);

  const reload = () =>
    queryClient.invalidateQueries({ queryKey: ['assignments', 'mine'] });

  // Stats (teacher perspective: count from sent; learner: from received)
  const statsSource = canTeach ? sent : received;
  const openCount = statsSource.filter(
    (a) => !a.completedByStudent && !isDueOverdue(a.dueDate),
  ).length;
  const overdueCount = statsSource.filter(
    (a) => !a.completedByStudent && isDueOverdue(a.dueDate),
  ).length;
  const doneCount = statsSource.filter((a) => a.completedByStudent).length;

  // Filtered lists
  const filteredReceived = useMemo(
    () => applyFilter(received, filter),
    [received, filter],
  );
  const filteredSent = useMemo(() => applyFilter(sent, filter), [sent, filter]);

  // Filter tab counts (total for all sources combined)
  const allItems = [...received, ...sent];
  const filterCounts: Record<AssignmentFilter, number> = {
    all: allItems.length,
    open: applyFilter(allItems, 'open').length,
    overdue: applyFilter(allItems, 'overdue').length,
    done: applyFilter(allItems, 'done').length,
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

  const filterTabs: { key: AssignmentFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'assignments.filterAll' },
    { key: 'open', labelKey: 'assignments.filterOpen' },
    { key: 'overdue', labelKey: 'assignments.filterOverdue' },
    { key: 'done', labelKey: 'assignments.filterDone' },
  ];

  return (
    <div className='box-border w-full py-10'>
      <PageHeader
        title={t('assignments.title')}
        subtitle={t('assignments.subtitle')}
        actions={
          canTeach ? (
            <Button onClick={() => setShowCreate(true)}>
              + {t('assignments.createNew')}
            </Button>
          ) : undefined
        }
      />

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      {!loading && (received.length > 0 || sent.length > 0) && (
        <div className='mb-5 flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5'>
          <span className='flex items-center gap-1.5 text-[12px] text-[var(--text2)]'>
            <span className='h-2.5 w-2.5 rounded-full bg-[var(--brand)]/60' />
            {t('assignments.statsOpen', { count: openCount })}
          </span>
          {overdueCount > 0 && (
            <span className='flex items-center gap-1.5 text-[12px] text-red-500'>
              <span className='h-2.5 w-2.5 rounded-full bg-red-500/70' />
              {t('assignments.statsOverdue', { count: overdueCount })}
            </span>
          )}
          <span className='flex items-center gap-1.5 text-[12px] text-[var(--text2)]'>
            <span className='h-2.5 w-2.5 rounded-full bg-green-500/60' />
            {t('assignments.statsDone', { count: doneCount })}
          </span>
        </div>
      )}

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      {!loading && allItems.length > 0 && (
        <div className='mb-5 flex flex-wrap gap-1'>
          {filterTabs.map(({ key, labelKey }) => (
            <button
              key={key}
              type='button'
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-3 py-1 text-[13px] font-medium transition-colors',
                filter === key
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)]',
              )}
            >
              {t(labelKey)}{' '}
              <span className='opacity-70'>({filterCounts[key]})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && <Skeleton height={160} rounded={14} />}

      {/* ── Received: assignments from teachers ───────────────────────────── */}
      {!loading && (
        <SectionCard
          title={t('assignments.receivedTitle', {
            count: filteredReceived.length,
          })}
          className='mb-5'
        >
          {received.length === 0 ? (
            <EmptyState
              icon='📝'
              title={t('assignments.receivedEmpty')}
              description={t('assignments.receivedEmptyHint')}
            />
          ) : filteredReceived.length === 0 ? (
            <p className='text-text3 text-sm'>
              {t('assignments.filterNoMatch')}
            </p>
          ) : (
            <ul className='m-0 flex flex-col gap-3 p-0'>
              {filteredReceived.map((a) => (
                <AssignmentCard
                  key={a.id}
                  a={a}
                  mode='received'
                  responseDraft={responseDrafts[a.id] ?? ''}
                  onResponseChange={(val) =>
                    setResponseDrafts((p) => ({ ...p, [a.id]: val }))
                  }
                  savingResponseId={savingResponseId}
                  completeId={completeId}
                  onSaveResponse={() => void saveStudentResponse(a.id)}
                  onMarkDone={() => void handleComplete(a.id)}
                  locale={i18n.language}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* ── Sent: assignments I sent as teacher ───────────────────────────── */}
      {!loading && canTeach && (
        <SectionCard
          title={t('assignments.sentTitle', { count: filteredSent.length })}
        >
          {sent.length === 0 ? (
            <EmptyState
              icon='✉️'
              title={t('assignments.sentEmpty')}
              description={t('assignments.sentEmptyHint')}
            />
          ) : filteredSent.length === 0 ? (
            <p className='text-text3 text-sm'>
              {t('assignments.filterNoMatch')}
            </p>
          ) : (
            <ul className='m-0 flex flex-col gap-3 p-0'>
              {filteredSent.map((a) => (
                <AssignmentCard
                  key={a.id}
                  a={a}
                  mode='sent'
                  responseDraft={responseDrafts[a.id] ?? ''}
                  onResponseChange={(val) =>
                    setResponseDrafts((p) => ({ ...p, [a.id]: val }))
                  }
                  savingResponseId={savingResponseId}
                  completeId={completeId}
                  onSaveResponse={() => void saveStudentResponse(a.id)}
                  onMarkDone={() => void handleComplete(a.id)}
                  locale={i18n.language}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* ── Create assignment modal ────────────────────────────────────────── */}
      {showCreate && canTeach && (
        <CreateAssignmentModal
          students={students}
          decks={decks}
          onClose={() => setShowCreate(false)}
          onCreated={() => void reload()}
        />
      )}
    </div>
  );
}

// ── Create assignment modal ────────────────────────────────────────────────

interface CreateAssignmentModalProps {
  students: StudentLink[];
  decks: Array<{ id: number; title: string }>;
  onClose: () => void;
  onCreated: () => void;
}

function CreateAssignmentModal({
  students,
  decks,
  onClose,
  onCreated,
}: CreateAssignmentModalProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [studentId, setStudentId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deckId, setDeckId] = useState<number | ''>('');
  const [responseMode, setResponseMode] = useState<
    'TEXT' | 'AUDIO_LINK' | 'READ_ALOUD'
  >('TEXT');

  const labelCls = tw`mb-1.5 block text-[13px] text-[var(--text2)]`;

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
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('assignments.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title={t('assignments.createTitle')} onClose={onClose}>
      <p className='text-text2 mb-4 text-sm'>{t('assignments.createHelp')}</p>
      <form onSubmit={(e) => void handleCreate(e)} className='grid gap-3.5'>
        {/* Student picker */}
        <label>
          <span className={labelCls}>{t('assignments.fieldStudent')}</span>
          <select
            className='input-field'
            value={studentId === '' ? '' : String(studentId)}
            onChange={(e) =>
              setStudentId(e.target.value === '' ? '' : Number(e.target.value))
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

        {/* Title */}
        <label>
          <span className={labelCls}>{t('assignments.fieldTitle')}</span>
          <input
            className='input-field'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            placeholder={t('assignments.titlePlaceholder')}
            required
          />
        </label>

        {/* Instructions */}
        <label>
          <span className={labelCls}>{t('assignments.fieldInstructions')}</span>
          <textarea
            className='input-field'
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t('assignments.instructionsPlaceholder')}
          />
        </label>

        {/* Row: due date + linked deck */}
        <div className='grid grid-cols-2 gap-3'>
          <label>
            <span className={labelCls}>{t('assignments.fieldDue')}</span>
            <input
              className='input-field'
              type='date'
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label>
            <span className={labelCls}>{t('assignments.fieldDeck')}</span>
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
        </div>

        {/* Response mode — visual option buttons */}
        <div>
          <span className={labelCls}>{t('assignments.fieldResponseMode')}</span>
          <div className='flex flex-wrap gap-2'>
            {(['TEXT', 'AUDIO_LINK', 'READ_ALOUD'] as const).map((mode) => (
              <button
                key={mode}
                type='button'
                onClick={() => setResponseMode(mode)}
                className={cn(
                  'rounded-[10px] border px-3 py-2 text-[13px] transition-colors',
                  responseMode === mode
                    ? 'border-[var(--brand)] bg-[var(--brand)]/10 font-semibold text-[var(--brand)]'
                    : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--brand)]/40',
                )}
              >
                {mode === 'TEXT' && '✍️ '}
                {mode === 'AUDIO_LINK' && '🎤 '}
                {mode === 'READ_ALOUD' && '📖 '}
                {t(`assignments.responseMode.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        <div className='flex gap-2 pt-1'>
          <Button type='submit' disabled={creating}>
            {creating ? t('common.loading') : t('assignments.submit')}
          </Button>
          <Button type='button' variant='ghost' onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
