import { useTranslation } from 'react-i18next';

import type { LessonItem } from '@/shared/api/types';

interface Props {
  lesson: LessonItem;
}

export function ClassroomLessonHero({ lesson }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className='mb-5 rounded-[20px] border border-[var(--border2)] p-7'
      style={{
        background:
          'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.10))',
      }}
    >
      <div className='mb-2 text-[13px] text-[var(--text3)]'>
        📘 {t('lessons.lessonLabel')}
      </div>
      <h2 className='mb-2.5 text-[28px] leading-tight font-bold'>
        {lesson.title}
      </h2>
      {lesson.summary && (
        <p className='m-0 text-base leading-relaxed text-[var(--text2)]'>
          {lesson.summary}
        </p>
      )}
      <div className='mt-3.5 flex flex-wrap gap-3 text-[13px]'>
        <span className='text-[var(--text3)]'>
          🧑‍🏫 {lesson.teacher?.displayName || lesson.teacher?.username}
        </span>
        {lesson.student && (
          <span className='text-[var(--text3)]'>
            👤 {lesson.student.displayName || lesson.student.username}
          </span>
        )}
      </div>
    </div>
  );
}
