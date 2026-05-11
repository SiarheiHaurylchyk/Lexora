import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Skeleton } from '@ui';

import { LessonBlockView } from '@/entities/LessonBlock';

import { lessonsApi } from '@/shared/api/api-legacy';
import type { LessonItem } from '@/shared/api/types';
import { lessonSectionsSorted } from '@/shared/lib/lessonSections';
import { useAppSelector } from '@/shared/lib/storeHooks';

const wideShellClasses = tw`box-border w-full pt-10 pb-12`;
const sectionBtnBase = tw`w-full text-left rounded-[12px] px-3 py-2.5 font-semibold cursor-pointer border bg-transparent`;

/**
 * LessonViewPage — read-only page that the student sees when they open a lesson.
 *
 * The page renders all lesson blocks from top to bottom. YouTube videos play
 * inside the page (via embedded iframe), so the student does not have to leave
 * Lexora to watch them.
 *
 * If the current user is also the teacher of the lesson, an "Edit" button takes
 * them to the editor.
 */
export function LessonViewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = useAppSelector((s) => s.auth.user);
  const [lesson, setLesson] = useState<LessonItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await lessonsApi.getLesson(Number(id));
        if (!cancelled) setLesson(data);
      } catch {
        if (!cancelled) {
          toast.error(t('lessons.notFound'));
          navigate('/lessons');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, t]);

  const sections = useMemo(() => lessonSectionsSorted(lesson), [lesson]);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSectionId(null);
      return;
    }
    setActiveSectionId((prev) => {
      if (prev != null && sections.some((s) => s.id === prev)) return prev;
      return sections[0].id;
    });
  }, [sections]);

  if (loading) {
    return (
      <div className={wideShellClasses}>
        <Skeleton height={120} rounded={20} />
        <div className='h-4' />
        <Skeleton height={300} rounded={20} />
      </div>
    );
  }

  if (!lesson) return null;

  const isTeacher = me?.id === lesson.teacher?.id;
  const activeSection = sections.find((s) => s.id === activeSectionId) ?? null;

  return (
    <div className={wideShellClasses}>
      <Button
        variant='ghost'
        onClick={() => navigate('/lessons')}
        className='mb-5'
      >
        {t('common.back')}
      </Button>

      <div className='border-border2 mb-6 rounded-[20px] border bg-[linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.10))] p-7'>
        <div className='text-text3 mb-2 text-[13px]'>
          📘 {t('lessons.lessonLabel')}
        </div>
        <h1 className='mb-2.5 text-[32px]'>{lesson.title}</h1>
        {lesson.summary && (
          <p className='text-text2 text-base leading-[1.6]'>{lesson.summary}</p>
        )}
        <div className='mt-3.5 flex flex-wrap gap-3 text-[13px]'>
          <span className='text-text3'>
            🧑‍🏫 {lesson.teacher?.displayName || lesson.teacher?.username}
          </span>
          {lesson.student && (
            <span className='text-text3'>
              👤 {lesson.student.displayName || lesson.student.username}
            </span>
          )}
          {isTeacher && (
            <Button
              variant='secondary'
              size='sm'
              onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
            >
              ✏️ {t('lessons.openEditor')}
            </Button>
          )}
        </div>
      </div>

      {sections.length === 0 ? (
        <p className='text-text3 py-10 text-center'>{t('lesson.empty')}</p>
      ) : (
        <div className='flex flex-wrap items-start gap-7'>
          <nav
            className='border-border min-w-[200px] flex-[0_0_220px] border-r pr-3'
            aria-label={t('classroom.shell.sectionsTitle')}
          >
            <div className='text-text3 mb-3 text-xs font-extrabold tracking-[0.06em] uppercase'>
              {t('classroom.shell.sectionsTitle')}
            </div>
            <ul className='m-0 flex list-none flex-col gap-1.5 p-0'>
              {sections.map((s, idx) => {
                const active = s.id === activeSectionId;
                return (
                  <li key={s.id}>
                    <button
                      type='button'
                      onClick={() => setActiveSectionId(s.id)}
                      className={cn(
                        sectionBtnBase,
                        active
                          ? 'text-accent border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))] font-bold'
                          : 'text-text2 border-transparent',
                      )}
                    >
                      {idx + 1}. {s.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className='min-w-0 flex-[1_1_320px]'>
            {activeSection && (
              <>
                <h2 className='mb-4 text-[22px] font-extrabold'>
                  {activeSection.title}
                </h2>
                {(activeSection.blocks ?? []).length === 0 ? (
                  <p className='text-text3'>{t('lesson.sectionEmpty')}</p>
                ) : (
                  (activeSection.blocks ?? []).map((block) => (
                    <LessonBlockView key={block.id} block={block} />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
