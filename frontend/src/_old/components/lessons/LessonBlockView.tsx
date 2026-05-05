import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LessonBlockItem } from '../../services/types';
import YouTubePlayer from './YouTubePlayer';
import { Button } from '../ui';
import {
  FILL_BLANK_MARKER,
  countFillBlanks,
  normalizeFillBlank,
  normalizeMatchPairs,
  normalizeMcq,
  normalizeOpenPrompt,
  normalizeTrueFalse,
  normalizeWordOrder,
  parseJson,
  shuffleIndices,
} from '../../lib/lessonBlockPayload';

interface Props {
  block: LessonBlockItem;
}

export default function LessonBlockView({ block }: Props) {
  const { t } = useTranslation();

  switch (block.type) {
    case 'TEXT':
      return (
        <BlockShell title={block.title}>
          <ParagraphText text={block.content || ''} />
        </BlockShell>
      );

    case 'ARTICLE':
      return (
        <BlockShell title={block.title || t('lesson.articleDefaultTitle')}>
          <blockquote
            style={{
              borderLeft: '3px solid var(--brand)',
              paddingLeft: 16,
              fontStyle: 'italic',
              color: 'var(--text)',
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            <ParagraphText text={block.content || ''} />
          </blockquote>
          {block.extra && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <a
                href={block.extra}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: 'var(--accent)' }}
              >
                {t('lesson.sourceLink')} ↗
              </a>
            </div>
          )}
        </BlockShell>
      );

    case 'YOUTUBE':
      return (
        <BlockShell>
          <YouTubePlayer url={block.content || ''} title={block.title} />
        </BlockShell>
      );

    case 'LINK':
      return (
        <BlockShell>
          <a
            href={block.content || '#'}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: 'block',
              padding: 14,
              background: 'var(--surface)',
              border: '1px solid var(--border2)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>🔗 {block.title || block.content}</div>
            {block.title && (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text3)',
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {block.content}
              </div>
            )}
          </a>
        </BlockShell>
      );

    case 'IMAGE':
      return (
        <BlockShell title={block.title}>
          <img
            src={block.content || ''}
            alt={block.title || ''}
            style={{
              maxWidth: '100%',
              borderRadius: 12,
              display: 'block',
              margin: '0 auto',
            }}
            loading="lazy"
          />
          {block.extra && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--text3)',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {block.extra}
            </div>
          )}
        </BlockShell>
      );

    case 'NOTE':
      return (
        <BlockShell>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.30)',
              color: 'var(--warning)',
            }}
          >
            <strong>📌 {block.title || t('lesson.noteDefaultTitle')}</strong>
            <div style={{ marginTop: 6, color: 'var(--text)' }}>
              <ParagraphText text={block.content || ''} />
            </div>
          </div>
        </BlockShell>
      );

    case 'MULTIPLE_CHOICE':
      return (
        <BlockShell title={block.title}>
          <McqStudent blockId={block.id} payload={normalizeMcq(parseJson(block.content, {}))} />
        </BlockShell>
      );

    case 'TRUE_FALSE':
      return (
        <BlockShell title={block.title}>
          <TrueFalseStudent payload={normalizeTrueFalse(parseJson(block.content, {}))} />
        </BlockShell>
      );

    case 'MATCH_PAIRS':
      return (
        <BlockShell title={block.title}>
          <MatchPairsStudent blockId={block.id} payload={normalizeMatchPairs(parseJson(block.content, {}))} />
        </BlockShell>
      );

    case 'FILL_BLANK':
      return (
        <BlockShell title={block.title}>
          <FillBlankStudent payload={normalizeFillBlank(parseJson(block.content, {}))} />
        </BlockShell>
      );

    case 'WORD_ORDER':
      return (
        <BlockShell title={block.title}>
          <WordOrderStudent blockId={block.id} payload={normalizeWordOrder(parseJson(block.content, {}))} />
        </BlockShell>
      );

    case 'OPEN_PROMPT':
      return (
        <BlockShell title={block.title}>
          <OpenPromptStudent payload={normalizeOpenPrompt(parseJson(block.content, {}))} />
        </BlockShell>
      );

    default:
      return null;
  }
}

function BlockShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {title && (
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      )}
      {children}
    </div>
  );
}

function ParagraphText({ text }: { text: string }) {
  const parts = text.split(/\n\s*\n/);
  return (
    <>
      {parts.map((part, i) => (
        <p key={i} style={{ marginBottom: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {part}
        </p>
      ))}
    </>
  );
}

function McqStudent({ blockId, payload }: { blockId: number; payload: ReturnType<typeof normalizeMcq> }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const canPick = payload.options.length >= 2 && payload.correctIndex >= 0 && payload.correctIndex < payload.options.length;

  const pick = (idx: number) => {
    if (checked) return;
    setPicked(idx);
  };

  const doCheck = () => {
    if (picked === null) return;
    setChecked(true);
  };

  const reset = () => {
    setPicked(null);
    setChecked(false);
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
      }}
    >
      <ParagraphText text={payload.question || '—'} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {payload.options.map((opt, i) => {
          const label = opt.trim() || `(${i + 1})`;
          let bg = 'var(--surface)';
          if (checked) {
            if (i === payload.correctIndex) bg = 'rgba(34,197,94,0.15)';
            else if (picked === i) bg = 'rgba(239,68,68,0.12)';
          } else if (picked === i) bg = 'rgba(108,99,255,0.12)';
          return (
            <button
              key={`${blockId}-mcq-${i}`}
              type="button"
              disabled={checked || !canPick}
              onClick={() => pick(i)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--border2)',
                background: bg,
                color: 'var(--text)',
                cursor: checked ? 'default' : 'pointer',
                fontSize: 15,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {!checked ? (
          <Button size="sm" onClick={doCheck} disabled={picked === null}>
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: picked === payload.correctIndex ? 'var(--success)' : 'var(--danger)' }}>
              {picked === payload.correctIndex ? t('lesson.resultCorrect') : t('lesson.resultIncorrect')}
            </span>
            {payload.explanation?.trim() && (
              <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text2)', width: '100%' }}>
                {payload.explanation}
              </p>
            )}
            <Button kind="secondary" size="sm" onClick={reset}>
              {t('lesson.tryAgain')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function TrueFalseStudent({ payload }: { payload: ReturnType<typeof normalizeTrueFalse> }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
      }}
    >
      <ParagraphText text={payload.statement || '—'} />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <Button
          size="sm"
          kind={picked === true ? 'primary' : 'secondary'}
          disabled={checked}
          onClick={() => !checked && setPicked(true)}
        >
          {t('lesson.trueLabel')}
        </Button>
        <Button
          size="sm"
          kind={picked === false ? 'primary' : 'secondary'}
          disabled={checked}
          onClick={() => !checked && setPicked(false)}
        >
          {t('lesson.falseLabel')}
        </Button>
      </div>
      <div style={{ marginTop: 12 }}>
        {!checked ? (
          <Button size="sm" onClick={() => picked !== null && setChecked(true)} disabled={picked === null}>
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: picked === payload.correct ? 'var(--success)' : 'var(--danger)' }}>
              {picked === payload.correct ? t('lesson.resultCorrect') : t('lesson.resultIncorrect')}
            </span>
            {payload.explanation?.trim() && (
              <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text2)' }}>{payload.explanation}</p>
            )}
            <div style={{ marginTop: 8 }}>
              <Button kind="secondary" size="sm" onClick={() => { setPicked(null); setChecked(false); }}>
                {t('lesson.tryAgain')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchPairsStudent({
  blockId,
  payload,
}: {
  blockId: number;
  payload: ReturnType<typeof normalizeMatchPairs>;
}) {
  const { t } = useTranslation();
  const { pairs } = payload;
  const n = pairs.length;

  const pairSig = JSON.stringify(pairs);
  const optionOrder = useMemo(() => shuffleIndices(n), [blockId, n, pairSig]);

  const [pickedCol, setPickedCol] = useState<number[]>(() => Array(n).fill(-1));
  const [checked, setChecked] = useState(false);

  const setChoice = (row: number, rightIdx: number) => {
    if (checked) return;
    const next = [...pickedCol];
    next[row] = rightIdx;
    setPickedCol(next);
  };

  const allChosen = pickedCol.every((v) => v >= 0);
  const correct = checked && pickedCol.every((v, i) => v === i);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
      }}
    >
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text3)' }}>{t('lesson.matchStudentHint')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pairs.map((pair, row) => (
          <div
            key={`${blockId}-match-${row}`}
            style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <div
              style={{
                minWidth: 100,
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border2)',
              }}
            >
              {pair.left || '—'}
            </div>
            <span style={{ color: 'var(--text3)' }}>→</span>
            <select
              disabled={checked}
              value={pickedCol[row] < 0 ? '' : String(pickedCol[row])}
              onChange={(e) => {
                const v = e.target.value === '' ? -1 : Number(e.target.value);
                setChoice(row, v);
              }}
              style={{
                flex: 1,
                minWidth: 160,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              <option value="">{t('lesson.matchPlaceholder')}</option>
              {optionOrder.map((ri) => (
                <option key={ri} value={ri}>
                  {pairs[ri].right || `(${ri + 1})`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!checked ? (
          <Button size="sm" onClick={() => setChecked(true)} disabled={!allChosen}>
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: correct ? 'var(--success)' : 'var(--danger)' }}>
              {correct ? t('lesson.resultCorrect') : t('lesson.resultIncorrect')}
            </span>
            <Button kind="secondary" size="sm" onClick={() => { setPickedCol(Array(n).fill(-1)); setChecked(false); }}>
              {t('lesson.tryAgain')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function normAnswer(s: string, ci: boolean) {
  const t = s.trim();
  return ci ? t.toLowerCase() : t;
}

function FillBlankStudent({ payload }: { payload: ReturnType<typeof normalizeFillBlank> }) {
  const { t } = useTranslation();
  const n = countFillBlanks(payload.text);
  const [values, setValues] = useState<string[]>(() => Array(Math.max(n, 1)).fill(''));
  const [checked, setChecked] = useState(false);

  const parts = payload.text.split(FILL_BLANK_MARKER);
  const answers = payload.answers;

  const checkFill = () => {
    if (n === 0) return;
    setChecked(true);
  };

  let ok = false;
  if (checked && n > 0 && answers.length >= n) {
    ok = true;
    for (let i = 0; i < n; i++) {
      if (normAnswer(values[i] || '', !!payload.caseInsensitive) !== normAnswer(answers[i] || '', !!payload.caseInsensitive)) {
        ok = false;
        break;
      }
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
      }}
    >
      {n === 0 ? (
        <ParagraphText text={payload.text || t('lesson.fillBlankNoGaps')} />
      ) : (
        <div style={{ fontSize: 16, lineHeight: 1.7, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {parts.map((seg, i) => (
            <React.Fragment key={`fb-${i}`}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{seg}</span>
              {i < parts.length - 1 && (
                <input
                  disabled={checked}
                  value={values[i] ?? ''}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = e.target.value;
                    setValues(next);
                  }}
                  style={{
                    minWidth: 80,
                    width: Math.max(80, (values[i]?.length || 3) * 10),
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: checked
                      ? `2px solid ${ok ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.5)'}`
                      : '1px solid var(--border2)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        {!checked ? (
          <Button size="sm" onClick={checkFill} disabled={n === 0}>
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: ok ? 'var(--success)' : 'var(--danger)' }}>
              {ok ? t('lesson.resultCorrect') : t('lesson.resultIncorrect')}
            </span>
            <div style={{ marginTop: 8 }}>
              <Button
                kind="secondary"
                size="sm"
                onClick={() => {
                  setValues(Array(n).fill(''));
                  setChecked(false);
                }}
              >
                {t('lesson.tryAgain')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WordOrderStudent({
  blockId,
  payload,
}: {
  blockId: number;
  payload: ReturnType<typeof normalizeWordOrder>;
}) {
  const { t } = useTranslation();
  const correct = payload.words;

  const initialShuffled = useMemo(() => {
    const copy = [...correct];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (copy.length >= 2 && copy.every((w, i) => w === correct[i])) {
      [copy[0], copy[1]] = [copy[1], copy[0]];
    }
    return copy;
  }, [blockId, correct.join('\u0001')]);

  const [order, setOrder] = useState<string[]>(initialShuffled);
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const tap = (i: number) => {
    if (checked) return;
    if (sel === null) {
      setSel(i);
      return;
    }
    if (sel === i) {
      setSel(null);
      return;
    }
    const next = [...order];
    [next[sel], next[i]] = [next[i], next[sel]];
    setOrder(next);
    setSel(null);
  };

  const isOrdered = order.length === correct.length && order.every((w, i) => w === correct[i]);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
      }}
    >
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text3)' }}>{t('lesson.wordOrderSwapHint')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {order.map((w, i) => (
          <button
            key={`${blockId}-wo-${i}`}
            type="button"
            disabled={checked}
            onClick={() => tap(i)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: `2px solid ${sel === i ? 'var(--brand)' : 'var(--border2)'}`,
              background: 'var(--surface)',
              color: 'var(--text)',
              cursor: checked ? 'default' : 'pointer',
              fontSize: 15,
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!checked ? (
          <Button size="sm" onClick={() => setChecked(true)}>
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: isOrdered ? 'var(--success)' : 'var(--danger)' }}>
              {isOrdered ? t('lesson.resultCorrect') : t('lesson.resultIncorrect')}
            </span>
            <Button
              kind="secondary"
              size="sm"
              onClick={() => {
                setOrder(initialShuffled);
                setSel(null);
                setChecked(false);
              }}
            >
              {t('lesson.tryAgain')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function OpenPromptStudent({ payload }: { payload: ReturnType<typeof normalizeOpenPrompt> }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [showSample, setShowSample] = useState(false);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border2)',
        background: 'var(--bg2)',
      }}
    >
      <ParagraphText text={payload.prompt || '—'} />
      <label style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--text3)' }}>
        {t('lesson.yourAnswer')}
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        style={{
          width: '100%',
          marginTop: 6,
          padding: 10,
          borderRadius: 10,
          border: '1px solid var(--border2)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 15,
          resize: 'vertical',
        }}
      />
      {payload.sampleAnswer?.trim() && (
        <div style={{ marginTop: 12 }}>
          <Button kind="secondary" size="sm" onClick={() => setShowSample((s) => !s)}>
            {showSample ? t('lesson.hideSampleAnswer') : t('lesson.showSampleAnswer')}
          </Button>
          {showSample && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border2)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {payload.sampleAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
