import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, TextArea, TextInput, YouTubePlayer } from '@ui';

import { LessonBlockView } from '@/entities/LessonBlock';

import type { LessonBlockItem, LessonBlockType } from '@/shared/api/types';
import {
  FILL_BLANK_MARKER,
  type FillBlankPayload,
  type MatchPairsPayload,
  type McqPayload,
  normalizeFillBlank,
  normalizeMatchPairs,
  normalizeMcq,
  normalizeOpenPrompt,
  normalizeTrueFalse,
  normalizeWordOrder,
  type OpenPromptPayload,
  parseJson,
  type TrueFalsePayload,
  type WordOrderPayload,
} from '@/shared/lib/lessonBlockPayload';

interface Props {
  block: LessonBlockItem;
  sectionNumber?: number;
  onSave: (data: Omit<LessonBlockItem, 'id'>) => void | Promise<void>;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  saving?: boolean;
}

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

export function LessonBlockEditor({
  block,
  sectionNumber,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  saving,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<LessonBlockItem>(block);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(block);
  }, [block]);

  const update = <K extends keyof LessonBlockItem>(
    field: K,
    value: LessonBlockItem[K],
  ) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = () =>
    onSave({
      type: draft.type,
      title: draft.title,
      content: draft.content,
      extra: draft.extra,
      sortOrder: draft.sortOrder,
    });

  const typeHeading = `${BLOCK_ICONS[draft.type]} ${t(BLOCK_LABEL_KEYS[draft.type])}`;
  const blockHeading =
    sectionNumber != null
      ? `${t('lesson.sectionHeading', { n: sectionNumber })} · ${typeHeading}`
      : typeHeading;

  return (
    <div className='mb-3.5 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-[18px]'>
      <div className='mb-3 flex items-center justify-between'>
        <div className='text-sm font-bold'>{blockHeading}</div>
        <div className='flex gap-1'>
          {onMoveUp && (
            <IconButton label={t('lesson.moveUp')} onClick={onMoveUp}>
              ↑
            </IconButton>
          )}
          {onMoveDown && (
            <IconButton label={t('lesson.moveDown')} onClick={onMoveDown}>
              ↓
            </IconButton>
          )}
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? t('lesson.editBack') : t('lesson.preview')}
          </Button>
          <Button
            variant='danger'
            size='sm'
            onClick={onDelete}
            disabled={saving}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {preview ? (
        <LessonBlockView block={draft} />
      ) : (
        <BlockFields draft={draft} update={update} />
      )}

      <div className='mt-2.5 flex justify-end'>
        <Button onClick={handleSave} disabled={saving} size='sm'>
          {saving ? t('common.loading') : t('lesson.saveBlock')}
        </Button>
      </div>
    </div>
  );
}

function BlockFields({
  draft,
  update,
}: {
  draft: LessonBlockItem;
  update: <K extends keyof LessonBlockItem>(
    field: K,
    value: LessonBlockItem[K],
  ) => void;
}) {
  const { t } = useTranslation();

  switch (draft.type) {
    case 'TEXT':
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextArea
            label={t('lesson.textContent')}
            rows={5}
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder={t('lesson.textPlaceholder')}
          />
        </div>
      );

    case 'NOTE':
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.noteTitleLabel')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
            placeholder={t('lesson.notePlaceholder')}
          />
          <TextArea
            label={t('lesson.noteContent')}
            rows={3}
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
          />
        </div>
      );

    case 'ARTICLE':
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.articleTitle')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextArea
            label={t('lesson.articleExcerpt')}
            rows={6}
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder={t('lesson.articlePlaceholder')}
          />
          <TextInput
            label={t('lesson.articleSourceUrl')}
            type='url'
            value={draft.extra || ''}
            onChange={(e) => update('extra', e.target.value)}
            placeholder='https://...'
          />
        </div>
      );

    case 'YOUTUBE':
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextInput
            label={t('lesson.youtubeUrl')}
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder='https://www.youtube.com/watch?v=...'
            hint={t('lesson.youtubeHint')}
          />
          {draft.content && (
            <div>
              <div className='mb-1.5 text-[12px] text-[var(--text3)]'>
                {t('lesson.preview')}:
              </div>
              <YouTubePlayer url={draft.content} />
            </div>
          )}
        </div>
      );

    case 'LINK':
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.linkLabel')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
            placeholder={t('lesson.linkLabelPh')}
          />
          <TextInput
            label={t('lesson.linkUrl')}
            type='url'
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder='https://...'
          />
        </div>
      );

    case 'IMAGE':
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextInput
            label={t('lesson.imageUrl')}
            type='url'
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder='https://...'
          />
          <TextInput
            label={t('lesson.imageCaption')}
            value={draft.extra || ''}
            onChange={(e) => update('extra', e.target.value)}
          />
          {draft.content && (
            <img
              src={draft.content}
              alt={draft.title || ''}
              className='mt-1.5 max-w-full rounded-[10px]'
            />
          )}
        </div>
      );

    case 'MULTIPLE_CHOICE': {
      const payload = normalizeMcq(parseJson(draft.content, {}));
      const setPayload = (next: McqPayload) =>
        update('content', JSON.stringify(next));
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextArea
            label={t('lesson.mcqQuestion')}
            rows={3}
            value={payload.question}
            onChange={(e) =>
              setPayload({ ...payload, question: e.target.value })
            }
          />
          {payload.options.map((opt, i) => (
            <div key={i} className='flex flex-wrap items-end gap-2'>
              <label className='flex cursor-pointer items-center gap-1.5'>
                <input
                  type='radio'
                  name={`mcq-correct-${draft.id}`}
                  checked={payload.correctIndex === i}
                  onChange={() => setPayload({ ...payload, correctIndex: i })}
                />
                <span className='text-[12px] text-[var(--text3)]'>
                  {t('lesson.mcqMarkCorrect')}
                </span>
              </label>
              <div className='min-w-[200px] flex-1'>
                <TextInput
                  label={t('lesson.mcqOption', { n: i + 1 })}
                  value={opt}
                  onChange={(e) => {
                    const options = [...payload.options];
                    options[i] = e.target.value;
                    setPayload({ ...payload, options });
                  }}
                />
              </div>
              <Button
                variant='ghost'
                size='sm'
                type='button'
                disabled={payload.options.length <= 2}
                onClick={() => {
                  const options = payload.options.filter((_, j) => j !== i);
                  let correctIndex = payload.correctIndex;
                  if (correctIndex === i) correctIndex = 0;
                  else if (correctIndex > i) correctIndex -= 1;
                  setPayload({ ...payload, options, correctIndex });
                }}
              >
                {t('lesson.mcqRemoveOption')}
              </Button>
            </div>
          ))}
          <Button
            variant='secondary'
            size='sm'
            type='button'
            onClick={() =>
              setPayload({ ...payload, options: [...payload.options, ''] })
            }
          >
            {t('lesson.mcqAddOption')}
          </Button>
          <TextArea
            label={t('lesson.mcqExplanation')}
            rows={2}
            value={payload.explanation || ''}
            onChange={(e) =>
              setPayload({ ...payload, explanation: e.target.value })
            }
          />
        </div>
      );
    }

    case 'TRUE_FALSE': {
      const payload = normalizeTrueFalse(parseJson(draft.content, {}));
      const setPayload = (next: TrueFalsePayload) =>
        update('content', JSON.stringify(next));
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextArea
            label={t('lesson.tfStatement')}
            rows={3}
            value={payload.statement}
            onChange={(e) =>
              setPayload({ ...payload, statement: e.target.value })
            }
          />
          <div className='flex items-center gap-4'>
            <span className='text-[13px] text-[var(--text3)]'>
              {t('lesson.addTrueFalse')}:
            </span>
            <label className='flex cursor-pointer items-center gap-1.5'>
              <input
                type='radio'
                checked={payload.correct === true}
                onChange={() => setPayload({ ...payload, correct: true })}
              />
              {t('lesson.trueLabel')}
            </label>
            <label className='flex cursor-pointer items-center gap-1.5'>
              <input
                type='radio'
                checked={payload.correct === false}
                onChange={() => setPayload({ ...payload, correct: false })}
              />
              {t('lesson.falseLabel')}
            </label>
          </div>
          <TextArea
            label={t('lesson.tfExplanation')}
            rows={2}
            value={payload.explanation || ''}
            onChange={(e) =>
              setPayload({ ...payload, explanation: e.target.value })
            }
          />
        </div>
      );
    }

    case 'MATCH_PAIRS': {
      const payload = normalizeMatchPairs(parseJson(draft.content, {}));
      const setPayload = (next: MatchPairsPayload) =>
        update('content', JSON.stringify(next));
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p className='m-0 text-[13px] text-[var(--text3)]'>
            {t('lesson.matchPairsHint')}
          </p>
          {payload.pairs.map((pair, i) => (
            <div key={i} className='flex flex-wrap items-end gap-2'>
              <div className='min-w-[120px] flex-1'>
                <TextInput
                  label={t('lesson.pairLeft')}
                  value={pair.left}
                  onChange={(e) => {
                    const pairs = [...payload.pairs];
                    pairs[i] = { ...pairs[i], left: e.target.value };
                    setPayload({ ...payload, pairs });
                  }}
                />
              </div>
              <div className='min-w-[120px] flex-1'>
                <TextInput
                  label={t('lesson.pairRight')}
                  value={pair.right}
                  onChange={(e) => {
                    const pairs = [...payload.pairs];
                    pairs[i] = { ...pairs[i], right: e.target.value };
                    setPayload({ ...payload, pairs });
                  }}
                />
              </div>
              <Button
                variant='ghost'
                size='sm'
                type='button'
                disabled={payload.pairs.length <= 2}
                onClick={() =>
                  setPayload({
                    ...payload,
                    pairs: payload.pairs.filter((_, j) => j !== i),
                  })
                }
              >
                {t('lesson.matchRemovePair')}
              </Button>
            </div>
          ))}
          <Button
            variant='secondary'
            size='sm'
            type='button'
            onClick={() =>
              setPayload({
                ...payload,
                pairs: [...payload.pairs, { left: '', right: '' }],
              })
            }
          >
            {t('lesson.matchAddPair')}
          </Button>
        </div>
      );
    }

    case 'FILL_BLANK': {
      const payload = normalizeFillBlank(parseJson(draft.content, {}));
      const setPayload = (next: FillBlankPayload) =>
        update('content', JSON.stringify(next));
      const answersStr = payload.answers.join('\n');
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p className='m-0 text-[13px] text-[var(--text3)]'>
            {t('lesson.fillBlankHelp')}
          </p>
          <TextArea
            label={t('lesson.fillBlankText')}
            rows={4}
            value={payload.text}
            onChange={(e) => setPayload({ ...payload, text: e.target.value })}
            placeholder={`Example: Paris is the capital of ${FILL_BLANK_MARKER}.`}
          />
          <TextArea
            label={t('lesson.fillBlankAnswers')}
            rows={4}
            value={answersStr}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map((x) => x.trim());
              setPayload({ ...payload, answers: lines });
            }}
          />
          <label className='flex cursor-pointer items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={!!payload.caseInsensitive}
              onChange={(e) =>
                setPayload({ ...payload, caseInsensitive: e.target.checked })
              }
            />
            {t('lesson.fillBlankCaseInsensitive')}
          </label>
        </div>
      );
    }

    case 'WORD_ORDER': {
      const payload = normalizeWordOrder(parseJson(draft.content, {}));
      const setPayload = (next: WordOrderPayload) =>
        update('content', JSON.stringify(next));
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p className='m-0 text-[13px] text-[var(--text3)]'>
            {t('lesson.wordOrderHelp')}
          </p>
          <TextArea
            label={t('lesson.wordOrderWords')}
            rows={6}
            value={payload.words.join('\n')}
            onChange={(e) => {
              const words = e.target.value
                .split(/\r?\n/)
                .map((w) => w.trim())
                .filter(Boolean);
              setPayload({
                ...payload,
                words: words.length >= 2 ? words : payload.words,
              });
            }}
          />
        </div>
      );
    }

    case 'OPEN_PROMPT': {
      const payload = normalizeOpenPrompt(parseJson(draft.content, {}));
      const setPayload = (next: OpenPromptPayload) =>
        update('content', JSON.stringify(next));
      return (
        <div className='flex flex-col gap-3'>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p className='m-0 text-[13px] text-[var(--text3)]'>
            {t('lesson.openPromptHelp')}
          </p>
          <TextArea
            label={t('lesson.openPromptLabel')}
            rows={4}
            value={payload.prompt}
            onChange={(e) => setPayload({ ...payload, prompt: e.target.value })}
          />
          <TextArea
            label={t('lesson.openSampleLabel')}
            rows={3}
            value={payload.sampleAnswer || ''}
            onChange={(e) =>
              setPayload({ ...payload, sampleAnswer: e.target.value })
            }
          />
        </div>
      );
    }

    default:
      return null;
  }
}
