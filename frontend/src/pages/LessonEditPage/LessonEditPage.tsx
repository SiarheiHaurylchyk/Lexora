import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  PageHeader,
  SectionCard,
  Skeleton,
  TextArea,
  TextInput,
} from '@ui';

import { AddBlockMenu } from '@/features/AddBlockMenu';
import { LessonBlockEditor } from '@/features/LessonBlockEditor';
import { LessonHomeworkPanel } from '@/features/LessonHomeworkPanel';

import { lessonsApi, studentsApi } from '@/shared/api/api-legacy';
import type {
  LessonBlockItem,
  LessonBlockType,
  LessonItem,
  LessonSectionItem,
  StudentLink,
} from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useConfirm } from '@/shared/lib/confirm';
import { getDefaultLessonBlockContent } from '@/shared/lib/lessonBlockPayload';
import {
  flattenLessonBlocks,
  lessonSectionsSorted,
} from '@/shared/lib/lessonSections';

const wideShellClasses = tw`box-border w-full pt-10 pb-12`;

export function LessonEditPage() {
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
  const [sectionTitleDraft, setSectionTitleDraft] = useState<
    Record<number, string>
  >({});

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [studentId, setStudentId] = useState<number | ''>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lessonRes, studentsRes] = await Promise.all([
          lessonsApi.getLesson(lessonId),
          studentsApi
            .getMyStudents()
            .catch(() => ({ data: [] as StudentLink[] })),
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
    return () => {
      cancelled = true;
    };
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
      const { data } = await lessonsApi.updateLessonSection(
        lessonId,
        sectionId,
        {
          title,
          sortOrder: sec.sortOrder ?? 0,
        },
      );
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
        lessonsApi.updateLessonSection(lessonId, a.id, {
          title: a.title,
          sortOrder: bo,
        }),
        lessonsApi.updateLessonSection(lessonId, b.id, {
          title: b.title,
          sortOrder: ao,
        }),
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
      const { data } = await lessonsApi.deleteLessonSection(
        lessonId,
        section.id,
      );
      setLesson(data);
      toast.success(t('lesson.sectionDeleted'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.sectionDeleteFailed'));
    }
  };

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
          s.id === sectionId
            ? { ...s, blocks: [...(s.blocks ?? []), data] }
            : s,
        ),
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.addFailed'));
    }
  };

  const saveBlock = async (
    block: LessonBlockItem,
    fields: Omit<LessonBlockItem, 'id'>,
  ) => {
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
          s.id === sid
            ? {
                ...s,
                blocks: (s.blocks ?? []).map((b) =>
                  b.id === block.id ? data : b,
                ),
              }
            : s,
        ),
      });
      toast.success(t('lesson.blockSaved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.saveFailed'));
    } finally {
      setSavingBlockId(null);
    }
  };

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
          s.id === sid
            ? {
                ...s,
                blocks: (s.blocks ?? []).filter((b) => b.id !== block.id),
              }
            : s,
        ),
      });
      toast.success(t('lesson.blockDeleted'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lesson.deleteFailed'));
    }
  };

  const moveBlock = async (
    sectionId: number,
    block: LessonBlockItem,
    direction: -1 | 1,
  ) => {
    if (!lesson) return;
    const sec = lessonSectionsSorted(lesson).find((s) => s.id === sectionId);
    if (!sec?.blocks?.length) return;
    const blocks = [...sec.blocks].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
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
      <div className={wideShellClasses}>
        <Skeleton height={300} rounded={20} />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className={wideShellClasses}>
      <Button
        variant='ghost'
        onClick={() => navigate('/lessons')}
        className='mb-3.5'
      >
        {t('common.back')}
      </Button>

      <PageHeader
        title={t('lessons.editTitle')}
        actions={
          <>
            <Button
              variant='secondary'
              onClick={() => navigate(`/lessons/${lessonId}`)}
            >
              {t('lessons.previewLesson')}
            </Button>
            <Button variant='danger' onClick={deleteLesson}>
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
        <div className='flex flex-col gap-3.5'>
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
          <label className='block'>
            <span className='text-text2 mb-1.5 block text-[13px] font-medium'>
              {t('lessons.studentLabel')}
            </span>
            <select
              className='input-field'
              value={studentId}
              onChange={(e) =>
                setStudentId(
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
            >
              <option value=''>{t('lessons.studentNone')}</option>
              {students.map((link) => (
                <option key={link.linkId} value={link.user.id}>
                  {link.user.displayName || link.user.username} (
                  {link.user.email})
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
        <div className='mb-4 flex flex-wrap items-end gap-2.5'>
          <div className='flex-[1_1_220px]'>
            <TextInput
              label={t('lesson.newSectionTitle')}
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder={t('lesson.newSectionPlaceholder')}
            />
          </div>
          <Button type='button' onClick={() => void createLessonSection()}>
            {t('lesson.addSection')}
          </Button>
        </div>

        {lessonSectionsSorted(lesson).map((section, secIndex, secArr) => (
          <div
            key={section.id}
            className='border-border bg-surface mb-4 rounded-[14px] border p-[18px]'
          >
            <div className='mb-3.5 flex flex-wrap items-end gap-2.5'>
              <div className='flex-[1_1_200px]'>
                <TextInput
                  label={t('lesson.sectionTitleLabel', { n: secIndex + 1 })}
                  value={sectionTitleDraft[section.id] ?? section.title}
                  onChange={(e) =>
                    setSectionTitleDraft((prev) => ({
                      ...prev,
                      [section.id]: e.target.value,
                    }))
                  }
                />
              </div>
              <Button
                variant='secondary'
                size='sm'
                type='button'
                onClick={() => void saveSectionTitle(section.id)}
              >
                {t('lesson.saveSectionTitle')}
              </Button>
              <Button
                variant='ghost'
                size='sm'
                type='button'
                disabled={secIndex === 0}
                onClick={() => void moveSection(section, -1)}
              >
                ↑
              </Button>
              <Button
                variant='ghost'
                size='sm'
                type='button'
                disabled={secIndex >= secArr.length - 1}
                onClick={() => void moveSection(section, 1)}
              >
                ↓
              </Button>
              <Button
                variant='danger'
                size='sm'
                type='button'
                disabled={secArr.length <= 1}
                onClick={() => void removeSection(section)}
              >
                {t('lesson.deleteSection')}
              </Button>
            </div>
            <p className='text-text3 m-0 mb-3 text-[13px]'>
              {t('lesson.sectionBlocksHint')}
            </p>
            {(section.blocks ?? []).map((block, index, arr) => (
              <LessonBlockEditor
                key={block.id}
                block={block}
                sectionNumber={index + 1}
                saving={savingBlockId === block.id}
                onSave={(fields: Any) =>
                  saveBlock(block, fields as Omit<LessonBlockItem, 'id'>)
                }
                onDelete={() => deleteBlock(block)}
                onMoveUp={
                  index > 0 ? () => moveBlock(section.id, block, -1) : undefined
                }
                onMoveDown={
                  index < arr.length - 1
                    ? () => moveBlock(section.id, block, 1)
                    : undefined
                }
              />
            ))}
            <AddBlockMenu
              onAdd={(type: LessonBlockType) => void addBlock(section.id, type)}
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title={t('lesson.blocksTitle', {
          count: flattenLessonBlocks(lesson).length,
        })}
        description={t('lesson.blocksHelp')}
      >
        <div className='mb-3.5'>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            disabled={creatingDeck || flattenLessonBlocks(lesson).length === 0}
            onClick={() => void createDeckFromLesson()}
          >
            {creatingDeck ? t('common.loading') : t('lessons.deckFromBlocks')}
          </button>
          <p className='text-text3 m-0 mt-2 text-xs'>
            {t('lessons.deckFromBlocksHelp')}
          </p>
        </div>
      </SectionCard>

      <LessonHomeworkPanel
        lesson={lesson}
        lessonId={lessonId}
        draftStudentId={studentId}
      />
    </div>
  );
}
