import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LessonBlockItem, LessonBlockType } from '../../services/types';
import { Button, IconButton, TextArea, TextInput } from '../ui';
import YouTubePlayer from './YouTubePlayer';
import LessonBlockView from './LessonBlockView';
import {
  FILL_BLANK_MARKER,
  normalizeFillBlank,
  normalizeMatchPairs,
  normalizeMcq,
  normalizeOpenPrompt,
  normalizeTrueFalse,
  normalizeWordOrder,
  parseJson,
  type FillBlankPayload,
  type MatchPairsPayload,
  type McqPayload,
  type OpenPromptPayload,
  type TrueFalsePayload,
  type WordOrderPayload,
} from '../../lib/lessonBlockPayload';

interface Props {
  block: LessonBlockItem;
  /** 1-based index in lesson order (shown in the editor chrome). */
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

export default function LessonBlockEditor({
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
    setDraft(block);
  }, [block]);

  const update = <K extends keyof LessonBlockItem>(field: K, value: LessonBlockItem[K]) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

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
    sectionNumber != null ? `${t('lesson.sectionHeading', { n: sectionNumber })} · ${typeHeading}` : typeHeading;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>{blockHeading}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onMoveUp && <IconButton label={t('lesson.moveUp')} onClick={onMoveUp}>↑</IconButton>}
          {onMoveDown && <IconButton label={t('lesson.moveDown')} onClick={onMoveDown}>↓</IconButton>}
          <Button kind="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
            {preview ? t('lesson.editBack') : t('lesson.preview')}
          </Button>
          <Button kind="danger" size="sm" onClick={onDelete} disabled={saving}>
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {preview ? (
        <LessonBlockView block={draft} />
      ) : (
        <BlockFields draft={draft} update={update} />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Button onClick={handleSave} disabled={saving} size="sm">
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
  update: <K extends keyof LessonBlockItem>(field: K, value: LessonBlockItem[K]) => void;
}) {
  const { t } = useTranslation();

  switch (draft.type) {
    case 'TEXT':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            type="url"
            value={draft.extra || ''}
            onChange={(e) => update('extra', e.target.value)}
            placeholder="https://..."
          />
        </div>
      );

    case 'YOUTUBE':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextInput
            label={t('lesson.youtubeUrl')}
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            hint={t('lesson.youtubeHint')}
          />
          {draft.content && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                {t('lesson.preview')}:
              </div>
              <YouTubePlayer url={draft.content} />
            </div>
          )}
        </div>
      );

    case 'LINK':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.linkLabel')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
            placeholder={t('lesson.linkLabelPh')}
          />
          <TextInput
            label={t('lesson.linkUrl')}
            type="url"
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder="https://..."
          />
        </div>
      );

    case 'IMAGE':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextInput
            label={t('lesson.imageUrl')}
            type="url"
            value={draft.content || ''}
            onChange={(e) => update('content', e.target.value)}
            placeholder="https://..."
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
              style={{ maxWidth: '100%', borderRadius: 10, marginTop: 6 }}
            />
          )}
        </div>
      );

    case 'MULTIPLE_CHOICE': {
      const payload = normalizeMcq(parseJson(draft.content, {}));
      const setPayload = (next: McqPayload) => update('content', JSON.stringify(next));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextArea
            label={t('lesson.mcqQuestion')}
            rows={3}
            value={payload.question}
            onChange={(e) => setPayload({ ...payload, question: e.target.value })}
          />
          {payload.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`mcq-correct-${draft.id}`}
                  checked={payload.correctIndex === i}
                  onChange={() => setPayload({ ...payload, correctIndex: i })}
                />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{t('lesson.mcqMarkCorrect')}</span>
              </label>
              <div style={{ flex: 1, minWidth: 200 }}>
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
                kind="ghost"
                size="sm"
                type="button"
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
            kind="secondary"
            size="sm"
            type="button"
            onClick={() => setPayload({ ...payload, options: [...payload.options, ''] })}
          >
            {t('lesson.mcqAddOption')}
          </Button>
          <TextArea
            label={t('lesson.mcqExplanation')}
            rows={2}
            value={payload.explanation || ''}
            onChange={(e) => setPayload({ ...payload, explanation: e.target.value })}
          />
        </div>
      );
    }

    case 'TRUE_FALSE': {
      const payload = normalizeTrueFalse(parseJson(draft.content, {}));
      const setPayload = (next: TrueFalsePayload) => update('content', JSON.stringify(next));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <TextArea
            label={t('lesson.tfStatement')}
            rows={3}
            value={payload.statement}
            onChange={(e) => setPayload({ ...payload, statement: e.target.value })}
          />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>{t('lesson.addTrueFalse')}:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                checked={payload.correct === true}
                onChange={() => setPayload({ ...payload, correct: true })}
              />
              {t('lesson.trueLabel')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
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
            onChange={(e) => setPayload({ ...payload, explanation: e.target.value })}
          />
        </div>
      );
    }

    case 'MATCH_PAIRS': {
      const payload = normalizeMatchPairs(parseJson(draft.content, {}));
      const setPayload = (next: MatchPairsPayload) => update('content', JSON.stringify(next));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>{t('lesson.matchPairsHint')}</p>
          {payload.pairs.map((pair, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
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
              <div style={{ flex: 1, minWidth: 120 }}>
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
                kind="ghost"
                size="sm"
                type="button"
                disabled={payload.pairs.length <= 2}
                onClick={() =>
                  setPayload({ ...payload, pairs: payload.pairs.filter((_, j) => j !== i) })
                }
              >
                {t('lesson.matchRemovePair')}
              </Button>
            </div>
          ))}
          <Button
            kind="secondary"
            size="sm"
            type="button"
            onClick={() =>
              setPayload({ ...payload, pairs: [...payload.pairs, { left: '', right: '' }] })
            }
          >
            {t('lesson.matchAddPair')}
          </Button>
        </div>
      );
    }

    case 'FILL_BLANK': {
      const payload = normalizeFillBlank(parseJson(draft.content, {}));
      const setPayload = (next: FillBlankPayload) => update('content', JSON.stringify(next));
      const answersStr = payload.answers.join('\n');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>{t('lesson.fillBlankHelp')}</p>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={!!payload.caseInsensitive}
              onChange={(e) => setPayload({ ...payload, caseInsensitive: e.target.checked })}
            />
            {t('lesson.fillBlankCaseInsensitive')}
          </label>
        </div>
      );
    }

    case 'WORD_ORDER': {
      const payload = normalizeWordOrder(parseJson(draft.content, {}));
      const setPayload = (next: WordOrderPayload) => update('content', JSON.stringify(next));
      const lines = payload.words.join('\n');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>{t('lesson.wordOrderHelp')}</p>
          <TextArea
            label={t('lesson.wordOrderWords')}
            rows={6}
            value={lines}
            onChange={(e) => {
              const words = e.target.value
                .split(/\r?\n/)
                .map((w) => w.trim())
                .filter(Boolean);
              setPayload({ ...payload, words: words.length >= 2 ? words : payload.words });
            }}
          />
        </div>
      );
    }

    case 'OPEN_PROMPT': {
      const payload = normalizeOpenPrompt(parseJson(draft.content, {}));
      const setPayload = (next: OpenPromptPayload) => update('content', JSON.stringify(next));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            label={t('lesson.titleOptional')}
            value={draft.title || ''}
            onChange={(e) => update('title', e.target.value)}
          />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>{t('lesson.openPromptHelp')}</p>
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
            onChange={(e) => setPayload({ ...payload, sampleAnswer: e.target.value })}
          />
        </div>
      );
    }

    default:
      return null;
  }
}
