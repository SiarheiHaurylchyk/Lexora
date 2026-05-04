import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { lessonsApi } from '../services/api';
import type { LessonItem } from '../services/types';
import { useAppSelector } from '../store/hooks';
import { Button, Skeleton } from '../components/ui';
import LessonBlockView from '../components/lessons/LessonBlockView';
import { wideContentShellStyle } from '../styles/wideContentShell';
import { lessonSectionsSorted } from '../lib/lessonSections';

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
export default function LessonViewPage() {
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
    return () => { cancelled = true; };
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
      <div style={wideContentShellStyle}>
        <Skeleton height={120} rounded={20} />
        <div style={{ height: 16 }} />
        <Skeleton height={300} rounded={20} />
      </div>
    );
  }

  if (!lesson) return null;

  const isTeacher = me?.id === lesson.teacher?.id;
  const activeSection = sections.find((s) => s.id === activeSectionId) ?? null;

  return (
    <div style={wideContentShellStyle}>
      <Button kind="ghost" onClick={() => navigate('/lessons')} style={{ marginBottom: 20 }}>
        {t('common.back')}
      </Button>

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.10))',
          padding: 28,
          borderRadius: 20,
          marginBottom: 24,
          border: '1px solid var(--border2)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>
          📘 {t('lessons.lessonLabel')}
        </div>
        <h1 style={{ fontSize: 32, marginBottom: 10 }}>{lesson.title}</h1>
        {lesson.summary && (
          <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.6 }}>{lesson.summary}</p>
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
          {isTeacher && (
            <Button
              kind="secondary"
              size="sm"
              onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
            >
              ✏️ {t('lessons.openEditor')}
            </Button>
          )}
        </div>
      </div>

      {sections.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text3)', padding: '40px 0' }}>
          {t('lesson.empty')}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <nav
            style={{
              flex: '0 0 220px',
              minWidth: 200,
              paddingRight: 12,
              borderRight: '1px solid var(--border)',
            }}
            aria-label={t('classroom.shell.sectionsTitle')}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text3)',
                marginBottom: 12,
              }}
            >
              {t('classroom.shell.sectionsTitle')}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sections.map((s, idx) => {
                const active = s.id === activeSectionId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSectionId(s.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: active ? '1px solid color-mix(in srgb, var(--accent) 45%, transparent)' : '1px solid transparent',
                        background: active ? 'color-mix(in srgb, var(--accent) 12%, var(--surface))' : 'transparent',
                        color: active ? 'var(--accent)' : 'var(--text2)',
                        font: 'inherit',
                        fontWeight: active ? 700 : 600,
                        cursor: 'pointer',
                      }}
                    >
                      {idx + 1}. {s.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            {activeSection && (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>{activeSection.title}</h2>
                {(activeSection.blocks ?? []).length === 0 ? (
                  <p style={{ color: 'var(--text3)' }}>{t('lesson.sectionEmpty')}</p>
                ) : (
                  (activeSection.blocks ?? []).map((block) => <LessonBlockView key={block.id} block={block} />)
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
