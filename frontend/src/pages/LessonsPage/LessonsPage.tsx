import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '@ui';

import { CreateLessonModal } from '@/features/CreateLesson';

import type { LessonItem } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useApiQuery } from '@/shared/lib/query';
import { useAuthStore } from '@/shared/lib/storeHooks';

/**
 * LessonsPage — landing page for lessons. Shows two sections:
 *   1. Lessons I prepared as a teacher (editable)
 *   2. Lessons that my teacher prepared for me (read-only)
 */
export function LessonsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const canTeach = userCanTeach(me?.role);
  const [showCreate, setShowCreate] = useState(false);

  const learningQuery = useApiQuery<LessonItem[]>({
    queryKey: ['lessons', 'my-learning'],
    url: '/lessons/my-learning',
  });
  const teachingQuery = useApiQuery<LessonItem[]>({
    queryKey: ['lessons', 'my-teaching'],
    url: '/lessons/my-teaching',
    enabled: canTeach,
  });
  const learning = learningQuery.data ?? [];
  const teaching = teachingQuery.data ?? [];
  const loading =
    learningQuery.isLoading || (canTeach && teachingQuery.isLoading);
  const loadFailed = learningQuery.isError || teachingQuery.isError;
  useEffect(() => {
    if (loadFailed) toast.error(t('lessons.loadFailed'));
  }, [loadFailed, t]);

  const locale = i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US';
  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

  return (
    <div className='box-border w-full pt-10 pb-12'>
      <PageHeader
        title={t('lessons.title')}
        subtitle={
          canTeach ? t('lessons.subtitle') : t('lessons.subtitleLearner')
        }
        actions={
          canTeach ? (
            <Button onClick={() => setShowCreate(true)}>
              + {t('lessons.newBtn')}
            </Button>
          ) : undefined
        }
      />

      {/* ── Lessons I created (teacher) ─────────────────────────────────── */}
      {canTeach && (
        <SectionCard
          title={t('lessons.teaching', { count: teaching.length })}
          description={t('lessons.teachingHelp')}
        >
          {loading ? (
            <Skeleton height={80} />
          ) : teaching.length === 0 ? (
            <EmptyState
              icon='🧑‍🏫'
              title={t('lessons.noTeaching')}
              description={t('lessons.noTeachingHelp')}
            >
              <Button onClick={() => setShowCreate(true)}>
                + {t('lessons.createFirst')}
              </Button>
            </EmptyState>
          ) : (
            <ul className='m-0 flex list-none flex-col gap-2.5 p-0'>
              {teaching.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  dateLabel={formatDate(lesson.updatedAt || lesson.createdAt)}
                  actionLabel={t('lessons.openEditor')}
                  canEdit
                  onOpen={() => navigate(`/lessons/${lesson.id}/edit`)}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* ── Lessons from my teachers (learner) ──────────────────────────── */}
      <SectionCard
        title={t('lessons.learning', { count: learning.length })}
        description={t('lessons.learningHelp')}
      >
        {loading ? (
          <Skeleton height={80} />
        ) : learning.length === 0 ? (
          <EmptyState
            icon='📚'
            title={t('lessons.noLearning')}
            description={t('lessons.noLearningHelp')}
          >
            {!canTeach && (
              <Button variant='secondary' onClick={() => navigate('/shared')}>
                {t('lessons.openSharedDecks')} →
              </Button>
            )}
          </EmptyState>
        ) : (
          <ul className='m-0 flex list-none flex-col gap-2.5 p-0'>
            {learning.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                dateLabel={formatDate(lesson.updatedAt || lesson.createdAt)}
                actionLabel={t('lessons.openLesson')}
                canEdit={false}
                onOpen={() => navigate(`/lessons/${lesson.id}`)}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      {showCreate && canTeach && (
        <CreateLessonModal
          onClose={() => setShowCreate(false)}
          onCreated={(lesson: LessonItem) => {
            setShowCreate(false);
            navigate(`/lessons/${lesson.id}/edit`);
          }}
        />
      )}
    </div>
  );
}

// ── Lesson card ────────────────────────────────────────────────────────────

interface LessonCardProps {
  lesson: LessonItem;
  dateLabel: string;
  actionLabel: string;
  canEdit: boolean;
  onOpen: () => void;
}

function LessonCard({
  lesson,
  dateLabel,
  actionLabel,
  canEdit,
  onOpen,
}: LessonCardProps) {
  const { t } = useTranslation();

  const hasStudent = lesson.student != null;
  const studentName =
    lesson.student?.displayName || lesson.student?.username || '';

  // Count all blocks across sections for the size indicator
  const blockCount = (lesson.sections ?? []).reduce(
    (sum, s) => sum + (s.blocks?.length ?? 0),
    0,
  );

  return (
    <li className='group flex items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--brand)]/30 hover:bg-[var(--bg2)]'>
      {/* Icon */}
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand)]/10 text-xl'>
        📘
      </div>

      {/* Content */}
      <div className='min-w-0 flex-1'>
        {/* Title */}
        <div className='truncate text-[15px] leading-tight font-semibold'>
          {lesson.title}
        </div>

        {/* Metadata row */}
        <div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--text3)]'>
          {lesson.summary && (
            <span className='max-w-[220px] truncate'>{lesson.summary}</span>
          )}
          {lesson.summary && <span>·</span>}
          <span>{dateLabel}</span>
        </div>

        {/* Pills row: student + block count */}
        <div className='mt-1.5 flex flex-wrap items-center gap-1.5'>
          {canEdit && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                hasStudent
                  ? 'bg-green-500/12 text-green-600 dark:text-green-400'
                  : 'bg-[var(--text3)]/10 text-[var(--text3)]',
              )}
            >
              {hasStudent ? `👤 ${studentName}` : t('lessons.draftLabel')}
            </span>
          )}
          {blockCount > 0 && (
            <span className='rounded-full bg-[var(--brand)]/8 px-2 py-0.5 text-[11px] text-[var(--brand)]'>
              {t('lessons.blockCount', { count: blockCount })}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <Button
        variant='secondary'
        size='sm'
        onClick={onOpen}
        className='shrink-0'
      >
        {actionLabel} →
      </Button>
    </li>
  );
}
