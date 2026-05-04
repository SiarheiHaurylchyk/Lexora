import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LessonItem } from '../../services/types';

interface Props {
  lesson: LessonItem;
}

/** Same visual language as LessonViewPage — title row + participants. */
export default function ClassroomLessonHero({ lesson }: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.10))',
        padding: 28,
        borderRadius: 20,
        marginBottom: 20,
        border: '1px solid var(--border2)',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
        📘 {t('lessons.lessonLabel')}
      </div>
      <h2 style={{ fontSize: 28, marginBottom: 10, fontWeight: 700, lineHeight: 1.2 }}>{lesson.title}</h2>
      {lesson.summary && (
        <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>{lesson.summary}</p>
      )}
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
        <span style={{ color: 'var(--text3)' }}>
          🧑‍🏫 {lesson.teacher?.displayName || lesson.teacher?.username}
        </span>
        {lesson.student && (
          <span style={{ color: 'var(--text3)' }}>
            👤 {lesson.student.displayName || lesson.student.username}
          </span>
        )}
      </div>
    </div>
  );
}
