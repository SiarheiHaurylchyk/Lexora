import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { lessonsApi, studentsApi } from '../services/api';
import type {
  LessonBlockItem,
  LessonBlockType,
  LessonItem,
  LessonSectionItem,
  StudentLink,
} from '../services/types';
import {
  Button,
  PageHeader,
  SectionCard,
  Skeleton,
  TextArea,
  TextInput,
  useConfirm,
} from '../components/ui';
import AddBlockMenu from '../components/lessons/AddBlockMenu';
import LessonHomeworkPanel from '../components/lessons/LessonHomeworkPanel';
import LessonBlockEditor from '../components/lessons/LessonBlockEditor';
import { getApiErrorMessage } from '../lib/apiError';
import { wideContentShellStyle } from '../styles/wideContentShell';
import { getDefaultLessonBlockContent } from '../lib/lessonBlockPayload';
import { flattenLessonBlocks, lessonSectionsSorted } from '../lib/lessonSections';

/**
 * LessonEditPage — full editor page for a lesson.
 *
 * The teacher can:
 *   - change the lesson title / summary / target student
 *   - add new blocks (text, article, YouTube, link, image, note)
 *   - edit and delete existing blocks
 *   - reorder blocks
 *   - send selected blocks as homework (Assignments), linked to this lesson
 *   - delete the whole lesson
 *
 * Only the teacher who created the lesson can open this page; the backend
 * also checks this on every save.
 */
export default function LessonEditPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lessonId = Number(id);

  const [lesson, setLesson] = useState<LessonItem | null>(null);
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingBlockId, setSavingBlockId] = useState<number | null>(null);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [sectionTitleDraft, setSectionTitleDraft] = useState<Record<number, string>>({});

  // Local form state for the metadata box.
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [studentId, setStudentId] = useState<number | ''>('');

  // Initial load: lesson + my students.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lessonRes, studentsRes] = await Promise.all([
          lessonsApi.getLesson(lessonId),
          studentsApi.getMyStudents().catch(() => ({ data: [] as StudentLink[] })),
        ]);
        if (cancelled) return;
        setLesson(lessonRes.data);
        setTitle(lessonRes.data.title);
        setSummary(lessonRes.data.summary || '');
        setStudentId(lessonRes.data.student?.id ?? '');
        setStudents(studentsRes.data);
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
  }, [lessonId, navigate, t]);

  useEffect(() => {
    if (!lesson?.sections?.length) {
      setSectionTitleDraft({});
      return;
    }
    const d: Record<number, string> = {};
    lessonSectionsSorted(lesson).forEach((s) => {
      d[s.id] = s.title;
    });
    setSectionTitleDraft(d);
  }, [lesson]);

  /** Save title / summary / target student. */
  const saveMeta = async () => {
    if (!title.trim()) {
      toast.error(t('lessons.titleRequired'));
      return;
    }
    setSavingMeta(true);
    try {
      const { data } = await lessonsApi.updateLesson(lessonId, {
        title: title.trim(),
        summary: summary.trim() || undefined,
        studentId: studentId === '' ? null : studentId,
      });
      setLesson(data);
      toast.success(t('lessons.savedToast'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lessons.saveFailed'));
    } finally {
      setSavingMeta(false);
    }
  };

  const createDeckFromLesson = async () => {
    setCreatingDeck(true);
    try {
      const { data } = await lessonsApi.deckFromBlocks(lessonId);
      toast.success(t('lessons.deckFromBlocksToast'));
      navigate(`/decks/${data.id}/edit`);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lessons.deckFromBlocksFailed'));
    } finally {
      setCreatingDeck(false);
    }
  };

  const createLessonSection = async () => {
    if (!lesson) return;
    const title = newSectionTitle.trim() || t('lesson.defaultSectionTitle');
    try {
      const { data } = await lessonsApi.addLessonSection(lessonId, { title });
      setLesson(data);
      setNewSectionTitle('');
      toast.success(t('lesson.sectionAdded'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.sectionAddFailed'));
    }
  };

  const saveSectionTitle = async (sectionId: number) => {
    if (!lesson) return;
    const title = (sectionTitleDraft[sectionId] ?? '').trim();
    if (!title) {
      toast.error(t('lessons.titleRequired'));
      return;
    }
    const sec = lessonSectionsSorted(lesson).find((s) => s.id === sectionId);
    if (!sec) return;
    try {
      const { data } = await lessonsApi.updateLessonSection(lessonId, sectionId, {
        title,
        sortOrder: sec.sortOrder ?? 0,
      });
      setLesson(data);
      toast.success(t('lessons.savedToast'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lessons.saveFailed'));
    }
  };

  const moveSection = async (section: LessonSectionItem, direction: -1 | 1) => {
    if (!lesson) return;
    const secs = lessonSectionsSorted(lesson);
    const i = secs.findIndex((s) => s.id === section.id);
    const j = i + direction;
    if (j < 0 || j >= secs.length) return;
    const a = secs[i];
    const b = secs[j];
    const ao = a.sortOrder ?? i;
    const bo = b.sortOrder ?? j;
    try {
      await Promise.all([
        lessonsApi.updateLessonSection(lessonId, a.id, { title: a.title, sortOrder: bo }),
        lessonsApi.updateLessonSection(lessonId, b.id, { title: b.title, sortOrder: ao }),
      ]);
      const { data } = await lessonsApi.getLesson(lessonId);
      setLesson(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lessons.saveFailed'));
    }
  };

  const removeSection = async (section: LessonSectionItem) => {
    if (!lesson) return;
    const secs = lessonSectionsSorted(lesson);
    if (secs.length <= 1) return;
    const ok = await confirm({
      message: t('lesson.deleteSectionConfirm'),
      variant: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;
    try {
      const { data } = await lessonsApi.deleteLessonSection(lessonId, section.id);
      setLesson(data);
      toast.success(t('lesson.sectionDeleted'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.sectionDeleteFailed'));
    }
  };

  /** Add a new (empty) block of the given type inside a section. */
  const addBlock = async (sectionId: number, type: LessonBlockType) => {
    if (!lesson) return;
    const sec = lessonSectionsSorted(lesson).find((s) => s.id === sectionId);
    const sortOrder = sec?.blocks?.length ?? 0;
    try {
      const { data } = await lessonsApi.addBlock(lessonId, {
        type,
        content: getDefaultLessonBlockContent(type),
        sortOrder,
        sectionId,
      });
      setLesson({
        ...lesson,
        sections: (lesson.sections ?? []).map((s) =>
          s.id === sectionId ? { ...s, blocks: [...(s.blocks ?? []), data] } : s,
        ),
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.addFailed'));
    }
  };

  /** Save a block (after the teacher pressed "Save block"). */
  const saveBlock = async (block: LessonBlockItem, fields: Omit<LessonBlockItem, 'id'>) => {
    if (!lesson) return;
    const sid = block.sectionId;
    if (sid == null) return;
    setSavingBlockId(block.id);
    try {
      const { data } = await lessonsApi.updateBlock(lessonId, block.id, {
        type: fields.type as LessonBlockType,
        title: fields.title,
        content: fields.content,
        extra: fields.extra,
        sortOrder: fields.sortOrder,
        sectionId: sid,
      });
      setLesson({
        ...lesson,
        sections: (lesson.sections ?? []).map((s) =>
          s.id === sid ? { ...s, blocks: (s.blocks ?? []).map((b) => (b.id === block.id ? data : b)) } : s,
        ),
      });
      toast.success(t('lesson.blockSaved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.saveFailed'));
    } finally {
      setSavingBlockId(null);
    }
  };

  /** Remove a block from its section. */
  const deleteBlock = async (block: LessonBlockItem) => {
    if (!lesson) return;
    const sid = block.sectionId;
    if (sid == null) return;
    const ok = await confirm({
      message: t('lesson.deleteConfirm'),
      variant: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;
    try {
      await lessonsApi.deleteBlock(lessonId, block.id);
      setLesson({
        ...lesson,
        sections: (lesson.sections ?? []).map((s) =>
          s.id === sid ? { ...s, blocks: (s.blocks ?? []).filter((b) => b.id !== block.id) } : s,
        ),
      });
      toast.success(t('lesson.blockDeleted'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.deleteFailed'));
    }
  };

  /** Move one block up or down within the same section. */
  const moveBlock = async (sectionId: number, block: LessonBlockItem, direction: -1 | 1) => {
    if (!lesson) return;
    const sec = lessonSectionsSorted(lesson).find((s) => s.id === sectionId);
    if (!sec?.blocks?.length) return;
    const blocks = [...sec.blocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const index = blocks.findIndex((b) => b.id === block.id);
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    setLesson({
      ...lesson,
      sections: (lesson.sections ?? []).map((s) =>
        s.id === sectionId ? { ...s, blocks: [...blocks] } : s,
      ),
    });

    try {
      await Promise.all([
        lessonsApi.updateBlock(lessonId, blocks[index].id, {
          type: blocks[index].type,
          title: blocks[index].title,
          content: blocks[index].content,
          extra: blocks[index].extra,
          sortOrder: index,
          sectionId,
        }),
        lessonsApi.updateBlock(lessonId, blocks[target].id, {
          type: blocks[target].type,
          title: blocks[target].title,
          content: blocks[target].content,
          extra: blocks[target].extra,
          sortOrder: target,
          sectionId,
        }),
      ]);
    } catch {
      toast.error(t('lesson.saveFailed'));
    }
  };

  /** Delete the whole lesson and go back to the list. */
  const deleteLesson = async () => {
    const ok = await confirm({
      message: t('lessons.deleteConfirm'),
      variant: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;
    try {
      await lessonsApi.deleteLesson(lessonId);
      toast.success(t('lessons.deleted'));
      navigate('/lessons');
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lessons.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <div style={wideContentShellStyle}>
        <Skeleton height={300} rounded={20} />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div style={wideContentShellStyle}>
      <Button kind="ghost" onClick={() => navigate('/lessons')} style={{ marginBottom: 14 }}>
        {t('common.back')}
      </Button>

      <PageHeader
        title={t('lessons.editTitle')}
        actions={
          <>
            <Button kind="secondary" onClick={() => navigate(`/lessons/${lessonId}`)}>
              {t('lessons.previewLesson')}
            </Button>
            <Button kind="danger" onClick={deleteLesson}>
              🗑 {t('common.delete')}
            </Button>
          </>
        }
      />

      <SectionCard
        title={t('lessons.meta')}
        actions={
          <Button onClick={saveMeta} disabled={savingMeta}>
            {savingMeta ? t('common.loading') : t('lessons.saveMeta')}
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label={t('lessons.titleLabel')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextArea
            label={t('lessons.summaryLabel')}
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
              {t('lessons.studentLabel')}
            </span>
            <select
              className="input-field"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">{t('lessons.studentNone')}</option>
              {students.map((link) => (
                <option key={link.linkId} value={link.user.id}>
                  {link.user.displayName || link.user.username} ({link.user.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title={t('lesson.sectionsTitle')}
        description={t('lesson.sectionsHelp')}
      >
        <div style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <TextInput
              label={t('lesson.newSectionTitle')}
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder={t('lesson.newSectionPlaceholder')}
            />
          </div>
          <Button type="button" onClick={() => void createLessonSection()}>
            {t('lesson.addSection')}
          </Button>
        </div>

        {lessonSectionsSorted(lesson).map((section, secIndex, secArr) => (
          <div
            key={section.id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 18,
              marginBottom: 16,
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
              <div style={{ flex: '1 1 200px' }}>
                <TextInput
                  label={t('lesson.sectionTitleLabel', { n: secIndex + 1 })}
                  value={sectionTitleDraft[section.id] ?? section.title}
                  onChange={(e) =>
                    setSectionTitleDraft((prev) => ({ ...prev, [section.id]: e.target.value }))
                  }
                />
              </div>
              <Button kind="secondary" size="sm" type="button" onClick={() => void saveSectionTitle(section.id)}>
                {t('lesson.saveSectionTitle')}
              </Button>
              <Button
                kind="ghost"
                size="sm"
                type="button"
                disabled={secIndex === 0}
                onClick={() => void moveSection(section, -1)}
              >
                ↑
              </Button>
              <Button
                kind="ghost"
                size="sm"
                type="button"
                disabled={secIndex >= secArr.length - 1}
                onClick={() => void moveSection(section, 1)}
              >
                ↓
              </Button>
              <Button
                kind="danger"
                size="sm"
                type="button"
                disabled={secArr.length <= 1}
                onClick={() => void removeSection(section)}
              >
                {t('lesson.deleteSection')}
              </Button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 12px' }}>{t('lesson.sectionBlocksHint')}</p>
            {(section.blocks ?? []).map((block, index, arr) => (
              <LessonBlockEditor
                key={block.id}
                block={block}
                sectionNumber={index + 1}
                saving={savingBlockId === block.id}
                onSave={(fields) => saveBlock(block, fields as Omit<LessonBlockItem, 'id'>)}
                onDelete={() => deleteBlock(block)}
                onMoveUp={index > 0 ? () => moveBlock(section.id, block, -1) : undefined}
                onMoveDown={index < arr.length - 1 ? () => moveBlock(section.id, block, 1) : undefined}
              />
            ))}
            <AddBlockMenu onAdd={(type) => void addBlock(section.id, type)} />
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title={t('lesson.blocksTitle', { count: flattenLessonBlocks(lesson).length })}
        description={t('lesson.blocksHelp')}
      >
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={creatingDeck || flattenLessonBlocks(lesson).length === 0}
            onClick={() => void createDeckFromLesson()}
          >
            {creatingDeck ? t('common.loading') : t('lessons.deckFromBlocks')}
          </button>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text3)' }}>{t('lessons.deckFromBlocksHelp')}</p>
        </div>
      </SectionCard>

      <LessonHomeworkPanel lesson={lesson} lessonId={lessonId} draftStudentId={studentId} />
    </div>
  );
}
