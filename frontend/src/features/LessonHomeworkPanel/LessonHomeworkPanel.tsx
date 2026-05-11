import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Button, SectionCard } from '@ui';

import type {
  LessonBlockItem,
  LessonBlockType,
  LessonItem,
  StudentAssignmentItem,
} from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { flattenLessonBlocks } from '@/shared/lib/lessonSections';
import { useApiMutation } from '@/shared/lib/query';

type DraftStudentId = number | '';

interface AssignmentCreateBody {
  studentUserId: number;
  title: string;
  instructions: string;
  dueDate?: string;
  lessonId: number;
}

interface Props {
  lesson: LessonItem;
  lessonId: number;
  draftStudentId: DraftStudentId;
}

function blockHomeworkLabel(
  block: LessonBlockItem,
  t: (k: string) => string,
): string {
  const custom = block.title?.trim();
  if (custom) return custom;
  const key: Record<LessonBlockType, string> = {
    TEXT: 'lesson.addText',
    ARTICLE: 'lesson.addArticle',
    YOUTUBE: 'lesson.addYoutube',
    LINK: 'lesson.addLink',
    IMAGE: 'lesson.addImage',
    NOTE: 'lesson.addNote',
    MULTIPLE_CHOICE: 'lesson.addMcq',
    TRUE_FALSE: 'lesson.addTrueFalse',
    MATCH_PAIRS: 'lesson.addMatchPairs',
    FILL_BLANK: 'lesson.addFillBlank',
    WORD_ORDER: 'lesson.addWordOrder',
    OPEN_PROMPT: 'lesson.addOpenPrompt',
  };
  return t(key[block.type]);
}

function buildAssignmentTitle(
  lessonTitle: string,
  t: (k: string, o?: Record<string, string>) => string,
): string {
  const prefix = t('lessons.homework.assignmentTitlePrefix');
  const max = 300;
  const budget = Math.max(1, max - prefix.length);
  const trimmed =
    lessonTitle.length > budget
      ? `${lessonTitle.slice(0, Math.max(0, budget - 1))}…`
      : lessonTitle;
  const full = prefix + trimmed;
  return full.length > max ? full.slice(0, max - 1) + '…' : full;
}

export function LessonHomeworkPanel({
  lesson,
  lessonId,
  draftStudentId,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const blocks = flattenLessonBlocks(lesson);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setSelected({});
  }, [lessonId]);

  const submitMutation = useApiMutation<
    StudentAssignmentItem,
    AssignmentCreateBody
  >({
    method: 'post',
    url: () => '/me/assignments',
    body: (v) => v,
    onSuccess: () => {
      toast.success(t('lessons.homework.sentToast'));
      setDueDate('');
      setNotes('');
      setSelected({});
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err) || t('lessons.homework.sendFailed'));
    },
  });

  const serverStudentId = lesson.student?.id;
  const studentAligned =
    serverStudentId != null &&
    draftStudentId !== '' &&
    Number(draftStudentId) === serverStudentId;

  const selectedBlocks = useMemo(
    () => blocks.filter((b) => selected[b.id]),
    [blocks, selected],
  );
  const canSubmit =
    studentAligned && selectedBlocks.length > 0 && blocks.length > 0;

  const toggle = (id: number) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const sendHomework = () => {
    if (!canSubmit || serverStudentId == null) return;
    const bullets = selectedBlocks
      .map((b) => `• ${blockHomeworkLabel(b, t)}`)
      .join('\n');
    let instructions = `${t('lessons.homework.instructionsIntro')}\n\n${bullets}`;
    if (notes.trim()) instructions += `\n\n${notes.trim()}`;
    instructions += `\n\n${t('lessons.homework.lessonLinkHint', { path: `/lessons/${lessonId}` })}`;

    submitMutation.mutate({
      studentUserId: serverStudentId,
      title: buildAssignmentTitle(lesson.title, t),
      instructions,
      dueDate: dueDate.trim() || undefined,
      lessonId,
    });
  };

  const studentLabel =
    lesson.student?.displayName?.trim() ||
    lesson.student?.username?.trim() ||
    t('lessons.studentNone');

  return (
    <SectionCard
      title={t('lessons.homework.sectionTitle')}
      description={t('lessons.homework.sectionHelp')}
    >
      {!studentAligned && (
        <p className='mb-3.5 text-sm text-[var(--text2)]'>
          {t('lessons.homework.needStudentSaved')}
        </p>
      )}
      {studentAligned && (
        <p className='mb-3.5 text-sm text-[var(--text2)]'>
          {t('lessons.homework.forStudent', { name: studentLabel })}
        </p>
      )}

      {blocks.length === 0 ? (
        <p className='m-0 text-sm text-[var(--text3)]'>
          {t('lessons.homework.noBlocks')}
        </p>
      ) : (
        <ul className='mb-4 list-none p-0'>
          {blocks.map((b) => (
            <li
              key={b.id}
              className='flex items-start gap-2.5 border-b border-[var(--border)] py-2'
            >
              <input
                type='checkbox'
                checked={!!selected[b.id]}
                disabled={!studentAligned}
                onChange={() => toggle(b.id)}
                id={`hw-block-${b.id}`}
              />
              <label
                htmlFor={`hw-block-${b.id}`}
                className={cn(
                  'text-sm',
                  studentAligned ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {blockHomeworkLabel(b, t)}
              </label>
            </li>
          ))}
        </ul>
      )}

      <label className='mb-3 block'>
        <span className='mb-1.5 block text-[13px] text-[var(--text2)]'>
          {t('assignments.fieldDue')}
        </span>
        <input
          type='date'
          className='input-field'
          disabled={!studentAligned}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>

      <label className='mb-4 block'>
        <span className='mb-1.5 block text-[13px] text-[var(--text2)]'>
          {t('lessons.homework.extraNotes')}
        </span>
        <textarea
          className='input-field'
          rows={3}
          disabled={!studentAligned}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('lessons.homework.extraNotesPh')}
        />
      </label>

      <Button
        onClick={sendHomework}
        disabled={!canSubmit || submitMutation.isPending}
      >
        {submitMutation.isPending
          ? t('common.loading')
          : t('lessons.homework.send')}
      </Button>
    </SectionCard>
  );
}
