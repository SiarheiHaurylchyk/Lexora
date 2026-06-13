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
import { lessonSectionsSorted } from '@/shared/lib/lessonSections';
import { useApiMutation } from '@/shared/lib/query';

// ── Block metadata (icons + label keys) ───────────────────────────────────
// These match the constants in LessonBlockEditor.tsx for visual consistency.

const BLOCK_ICONS: Record<LessonBlockType, string> = {
  TEXT: '📝',
  ARTICLE: '📰',
  YOUTUBE: '🎬',
  LINK: '🔗',
  IMAGE: '🖼',
  NOTE: '📌',
  MULTIPLE_CHOICE: '✅',
  TRUE_FALSE: '❓',
  MATCH_PAIRS: '🔀',
  FILL_BLANK: '✏️',
  WORD_ORDER: '🔤',
  OPEN_PROMPT: '💭',
};

const BLOCK_LABEL_KEYS: Record<LessonBlockType, string> = {
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

// ── Content snippet extractor ──────────────────────────────────────────────
// Tries to pull a short human-readable preview from a block's content field.
// JSON blocks (interactive exercises) use known field names.

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function blockContentSnippet(block: LessonBlockItem): string | null {
  const raw = block.content?.trim();
  if (!raw) return null;

  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      // Multiple choice, True/False
      if (typeof obj.question === 'string') return truncate(obj.question, 80);
      if (typeof obj.statement === 'string') return truncate(obj.statement, 80);
      // Open prompt
      if (typeof obj.prompt === 'string') return truncate(obj.prompt, 80);
      // Fill in the blank — show the text with blanks
      if (typeof obj.text === 'string') return truncate(obj.text, 80);
      // Word order — show words joined
      if (Array.isArray(obj.words))
        return truncate((obj.words as string[]).join(' '), 80);
      // Match pairs — show first pair
      if (Array.isArray(obj.pairs) && obj.pairs.length > 0) {
        const first = obj.pairs[0] as { left?: string; right?: string };
        if (first.left)
          return truncate(`${first.left} ↔ ${first.right ?? '…'}`, 80);
      }
    } catch {
      // Not valid JSON — fall through to raw text
    }
  }

  return truncate(raw, 80);
}

// ── Assignment title builder ───────────────────────────────────────────────

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

// ── API types ──────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────

export function LessonHomeworkPanel({
  lesson,
  lessonId,
  draftStudentId,
}: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Group blocks by section (preserves sort order)
  const sections = useMemo(() => lessonSectionsSorted(lesson), [lesson]);
  const allBlocks = useMemo(
    () => sections.flatMap((s) => s.blocks ?? []),
    [sections],
  );

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
    () => allBlocks.filter((b) => selected[b.id]),
    [allBlocks, selected],
  );
  const selectedCount = selectedBlocks.length;
  const canSubmit = studentAligned && selectedCount > 0 && allBlocks.length > 0;

  // ── Selection helpers ──────────────────────────────────────────────────

  const toggleBlock = (id: number) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const allBlockIds = allBlocks.map((b) => b.id);
  const allSelected =
    allBlockIds.length > 0 && allBlockIds.every((id) => selected[id]);

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<number, boolean> = {};
      allBlockIds.forEach((id) => {
        next[id] = true;
      });
      setSelected(next);
    }
  };

  const toggleSection = (sectionBlocks: LessonBlockItem[]) => {
    const ids = sectionBlocks.map((b) => b.id);
    const allSectionSelected = ids.every((id) => selected[id]);
    setSelected((prev) => {
      const next = { ...prev };
      if (allSectionSelected) {
        ids.forEach((id) => {
          delete next[id];
        });
      } else {
        ids.forEach((id) => {
          next[id] = true;
        });
      }
      return next;
    });
  };

  // ── Send homework ─────────────────────────────────────────────────────

  const sendHomework = () => {
    if (!canSubmit || serverStudentId == null) return;
    const bullets = selectedBlocks
      .map((b) => {
        const icon = BLOCK_ICONS[b.type];
        const label = b.title?.trim() || t(BLOCK_LABEL_KEYS[b.type]);
        const snippet = blockContentSnippet(b);
        return snippet
          ? `• ${icon} ${label}: ${snippet}`
          : `• ${icon} ${label}`;
      })
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

  const sectionCardTitle =
    selectedCount > 0
      ? `${t('lessons.homework.sectionTitle')} · ${t('lessons.homework.selectedCount', { count: selectedCount })}`
      : t('lessons.homework.sectionTitle');

  return (
    <SectionCard
      title={sectionCardTitle}
      description={t('lessons.homework.sectionHelp')}
    >
      {/* Student link hint */}
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

      {allBlocks.length === 0 ? (
        <p className='m-0 text-sm text-[var(--text3)]'>
          {t('lessons.homework.noBlocks')}
        </p>
      ) : (
        <>
          {/* Select all + count bar */}
          <div className='mb-3 flex items-center justify-between'>
            <button
              type='button'
              disabled={!studentAligned}
              className={cn(
                'text-[13px] font-medium transition-colors',
                studentAligned
                  ? 'text-[var(--brand)] hover:underline'
                  : 'cursor-default text-[var(--text3)]',
              )}
              onClick={toggleAll}
            >
              {allSelected
                ? t('lessons.homework.deselectAll')
                : t('lessons.homework.selectAll')}
            </button>
            {selectedCount > 0 && (
              <span className='rounded-full bg-[var(--brand)]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[var(--brand)]'>
                {t('lessons.homework.selectedCount', { count: selectedCount })}
              </span>
            )}
          </div>

          {/* Blocks grouped by section */}
          <div className='mb-4 flex flex-col gap-4'>
            {sections.map((section) => {
              const sectionBlocks = section.blocks ?? [];
              if (sectionBlocks.length === 0) return null;
              const sectionAllSelected = sectionBlocks.every(
                (b) => selected[b.id],
              );

              return (
                <div key={section.id}>
                  {/* Section header */}
                  {sections.length > 1 && (
                    <div className='mb-1.5 flex items-center justify-between'>
                      <span className='text-[12px] font-semibold tracking-wide text-[var(--text3)] uppercase'>
                        {section.title}
                      </span>
                      {studentAligned && (
                        <button
                          type='button'
                          className='text-[11px] text-[var(--brand)] hover:underline'
                          onClick={() => toggleSection(sectionBlocks)}
                        >
                          {sectionAllSelected
                            ? t('lessons.homework.deselectSection')
                            : t('lessons.homework.selectSection')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Block list for this section */}
                  <ul className='m-0 list-none rounded-[10px] border border-[var(--border)] p-0'>
                    {sectionBlocks.map((block, idx) => {
                      const isChecked = !!selected[block.id];
                      const icon = BLOCK_ICONS[block.type];
                      const label =
                        block.title?.trim() || t(BLOCK_LABEL_KEYS[block.type]);
                      const snippet = blockContentSnippet(block);

                      return (
                        <li
                          key={block.id}
                          className={cn(
                            'flex items-start gap-3 border-b border-[var(--border)] px-3 py-2.5 transition-colors last:border-b-0',
                            isChecked && 'bg-[var(--brand)]/[0.06]',
                            idx === 0 && 'rounded-t-[10px]',
                            idx === sectionBlocks.length - 1 &&
                              'rounded-b-[10px]',
                          )}
                        >
                          <input
                            type='checkbox'
                            id={`hw-block-${block.id}`}
                            checked={isChecked}
                            disabled={!studentAligned}
                            onChange={() => toggleBlock(block.id)}
                            className='mt-0.5 shrink-0 cursor-pointer'
                          />
                          <label
                            htmlFor={`hw-block-${block.id}`}
                            className={cn(
                              'min-w-0 flex-1',
                              studentAligned
                                ? 'cursor-pointer'
                                : 'cursor-default',
                            )}
                          >
                            <div className='flex items-center gap-1.5 text-[13px] font-medium'>
                              <span>{icon}</span>
                              <span>{label}</span>
                            </div>
                            {snippet && (
                              <div className='text-text3 mt-0.5 truncate text-[12px]'>
                                {snippet}
                              </div>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Due date */}
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

      {/* Extra notes */}
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
