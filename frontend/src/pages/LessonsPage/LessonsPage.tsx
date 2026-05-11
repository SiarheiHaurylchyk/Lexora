import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '@ui';

import { CreateLessonModal } from '@/features/CreateLesson';

import { lessonsApi } from '@/shared/api/api-legacy';
import type { LessonItem } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useAppSelector } from '@/shared/lib/storeHooks';

const wideShellClasses = tw`box-border w-full pt-10 pb-12`;

/**
 * LessonsPage — landing page for lessons. It shows two sections:
 *   1. Lessons I prepared as a teacher (I can edit them)
 *   2. Lessons that a teacher prepared for me (I can read them)
 */
export function LessonsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const me = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(me?.role);
  const [teaching, setTeaching] = useState<LessonItem[]>([]);
  const [learning, setLearning] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const learningRes = await lessonsApi.getMyLearningLessons();
        if (cancelled) return;
        setLearning(learningRes.data);
        if (canTeach) {
          const teachingRes = await lessonsApi.getMyTeachingLessons();
          if (cancelled) return;
          setTeaching(teachingRes.data);
        } else {
          setTeaching([]);
        }
      } catch {
        if (!cancelled) toast.error(t('lessons.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, canTeach]);

  const locale = i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US';
  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString(locale) : '';

  return (
    <div className={wideShellClasses}>
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

      {canTeach && (
        <SectionCard
          title={t('lessons.teaching', { count: teaching.length })}
          description={t('lessons.teachingHelp')}
        >
          {loading ? (
            <Skeleton height={64} />
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
            teaching.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                dateLabel={formatDate(lesson.updatedAt || lesson.createdAt)}
                actionLabel={t('lessons.openEditor')}
                onOpen={() => navigate(`/lessons/${lesson.id}/edit`)}
              />
            ))
          )}
        </SectionCard>
      )}

      <SectionCard
        title={t('lessons.learning', { count: learning.length })}
        description={t('lessons.learningHelp')}
      >
        {loading ? (
          <Skeleton height={64} />
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
          learning.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              dateLabel={formatDate(lesson.updatedAt || lesson.createdAt)}
              actionLabel={t('lessons.openLesson')}
              onOpen={() => navigate(`/lessons/${lesson.id}`)}
            />
          ))
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

interface LessonRowProps {
  lesson: LessonItem;
  dateLabel: string;
  actionLabel: string;
  onOpen: () => void;
}

function LessonRow({ lesson, dateLabel, actionLabel, onOpen }: LessonRowProps) {
  return (
    <div className='border-border bg-surface mb-2 flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3.5'>
      <div className='min-w-0'>
        <div className='text-base font-semibold'>📘 {lesson.title}</div>
        <div className='text-text3 mt-0.5 text-[13px]'>
          {lesson.summary && <span>{lesson.summary} · </span>}
          {dateLabel}
          {lesson.student && (
            <span>
              {' '}
              · 👤 {lesson.student.displayName || lesson.student.username}
            </span>
          )}
        </div>
      </div>
      <Button variant='secondary' size='sm' onClick={onOpen}>
        {actionLabel} →
      </Button>
    </div>
  );
}
