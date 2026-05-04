import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { lessonsApi } from '../services/api';
import type { LessonItem } from '../services/types';
import { Button, EmptyState, PageHeader, SectionCard, Skeleton } from '../components/ui';
import CreateLessonModal from '../components/lessons/CreateLessonModal';
import { wideContentShellStyle } from '../styles/wideContentShell';
import { useAppSelector } from '../store/hooks';
import { userCanTeach } from '../lib/accountRole';

/**
 * LessonsPage — landing page for lessons. It shows two sections:
 *   1. Lessons I prepared as a teacher (I can edit them)
 *   2. Lessons that a teacher prepared for me (I can read them)
 */
export default function LessonsPage() {
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
    return () => { cancelled = true; };
  }, [t, canTeach]);

  const locale = i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US';
  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString(locale) : '';

  return (
    <div style={wideContentShellStyle}>
      <PageHeader
        title={t('lessons.title')}
        subtitle={canTeach ? t('lessons.subtitle') : t('lessons.subtitleLearner')}
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
              icon="🧑‍🏫"
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
            icon="📚"
            title={t('lessons.noLearning')}
            description={t('lessons.noLearningHelp')}
          >
            {!canTeach && (
              <Button kind="secondary" onClick={() => navigate('/shared')}>
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
          onCreated={(lesson) => {
            setShowCreate(false);
            navigate(`/lessons/${lesson.id}/edit`);
          }}
        />
      )}
    </div>
  );
}

/** A single row in the lessons list, with a title and an "open" button. */
function LessonRow({
  lesson,
  dateLabel,
  actionLabel,
  onOpen,
}: {
  lesson: LessonItem;
  dateLabel: string;
  actionLabel: string;
  onOpen: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>📘 {lesson.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
          {lesson.summary && <span>{lesson.summary} · </span>}
          {dateLabel}
          {lesson.student && (
            <span> · 👤 {lesson.student.displayName || lesson.student.username}</span>
          )}
        </div>
      </div>
      <Button kind="secondary" size="sm" onClick={onOpen}>
        {actionLabel} →
      </Button>
    </div>
  );
}
