import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, YouTubePlayer } from '@ui';

import type { LessonBlockItem } from '@/shared/api/types';
import {
  countFillBlanks,
  FILL_BLANK_MARKER,
  normalizeFillBlank,
  normalizeMatchPairs,
  normalizeMcq,
  normalizeOpenPrompt,
  normalizeTrueFalse,
  normalizeWordOrder,
  parseJson,
  shuffleIndices,
} from '@/shared/lib/lessonBlockPayload';
import { resolveBlockYoutubeUrl } from '@/shared/lib/youtube';

interface Props {
  block: LessonBlockItem;
}

export function LessonBlockView({ block }: Props) {
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
          <blockquote className='font-italic border-l-[3px] border-[var(--brand)] pl-4 text-base leading-relaxed text-[var(--text)] italic'>
            <ParagraphText text={block.content || ''} />
          </blockquote>
          {block.extra && (
            <div className='mt-2.5 text-[13px]'>
              <a
                href={block.extra}
                target='_blank'
                rel='noreferrer noopener'
                className='text-[var(--accent)]'
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
          <YouTubePlayer
            url={resolveBlockYoutubeUrl(block)}
            title={block.title}
          />
        </BlockShell>
      );

    case 'LINK':
      return (
        <BlockShell>
          <a
            href={block.content || '#'}
            target='_blank'
            rel='noreferrer noopener'
            className='block rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-3.5'
          >
            <div className='font-semibold'>
              🔗 {block.title || block.content}
            </div>
            {block.title && (
              <div className='mt-1 overflow-hidden text-[13px] text-ellipsis whitespace-nowrap text-[var(--text3)]'>
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
            className='mx-auto block max-w-full rounded-xl'
            loading='lazy'
          />
          {block.extra && (
            <div className='mt-2 text-center text-[13px] text-[var(--text3)]'>
              {block.extra}
            </div>
          )}
        </BlockShell>
      );

    case 'NOTE':
      return (
        <BlockShell>
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[var(--warning)]'>
            <strong>📌 {block.title || t('lesson.noteDefaultTitle')}</strong>
            <div className='mt-1.5 text-[var(--text)]'>
              <ParagraphText text={block.content || ''} />
            </div>
          </div>
        </BlockShell>
      );

    case 'MULTIPLE_CHOICE':
      return (
        <BlockShell title={block.title}>
          <McqStudent
            blockId={block.id}
            payload={normalizeMcq(parseJson(block.content, {}))}
          />
        </BlockShell>
      );

    case 'TRUE_FALSE':
      return (
        <BlockShell title={block.title}>
          <TrueFalseStudent
            payload={normalizeTrueFalse(parseJson(block.content, {}))}
          />
        </BlockShell>
      );

    case 'MATCH_PAIRS':
      return (
        <BlockShell title={block.title}>
          <MatchPairsStudent
            blockId={block.id}
            payload={normalizeMatchPairs(parseJson(block.content, {}))}
          />
        </BlockShell>
      );

    case 'FILL_BLANK':
      return (
        <BlockShell title={block.title}>
          <FillBlankStudent
            payload={normalizeFillBlank(parseJson(block.content, {}))}
          />
        </BlockShell>
      );

    case 'WORD_ORDER':
      return (
        <BlockShell title={block.title}>
          <WordOrderStudent
            blockId={block.id}
            payload={normalizeWordOrder(parseJson(block.content, {}))}
          />
        </BlockShell>
      );

    case 'OPEN_PROMPT':
      return (
        <BlockShell title={block.title}>
          <OpenPromptStudent
            payload={normalizeOpenPrompt(parseJson(block.content, {}))}
          />
        </BlockShell>
      );

    default:
      return null;
  }
}

function BlockShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='mb-5'>
      {title && <h3 className='mb-2 text-base font-bold'>{title}</h3>}
      {children}
    </div>
  );
}

function ParagraphText({ text }: { text: string }) {
  const parts = text.split(/\n\s*\n/);
  return (
    <>
      {parts.map((part, i) => (
        <p key={i} className='mb-2 leading-relaxed whitespace-pre-wrap'>
          {part}
        </p>
      ))}
    </>
  );
}

function McqStudent({
  blockId,
  payload,
}: {
  blockId: number;
  payload: ReturnType<typeof normalizeMcq>;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const canPick =
    payload.options.length >= 2 &&
    payload.correctIndex >= 0 &&
    payload.correctIndex < payload.options.length;

  const reset = () => {
    setPicked(null);
    setChecked(false);
  };

  return (
    <div className='rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-4'>
      <ParagraphText text={payload.question || '—'} />
      <div className='mt-3 flex flex-col gap-2'>
        {payload.options.map((opt, i) => {
          const label = opt.trim() || `(${i + 1})`;
          const bg = checked
            ? i === payload.correctIndex
              ? 'rgba(34,197,94,0.15)'
              : picked === i
                ? 'rgba(239,68,68,0.12)'
                : 'var(--surface)'
            : picked === i
              ? 'rgba(108,99,255,0.12)'
              : 'var(--surface)';
          return (
            <button
              key={`${blockId}-mcq-${i}`}
              type='button'
              disabled={checked || !canPick}
              onClick={() => !checked && setPicked(i)}
              className='rounded-[10px] border border-[var(--border2)] p-[10px_12px] text-left text-[15px] text-[var(--text)]'
              style={{
                background: bg,
                cursor: checked ? 'default' : 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className='mt-3.5 flex flex-wrap items-center gap-2'>
        {!checked ? (
          <Button
            size='sm'
            onClick={() => picked !== null && setChecked(true)}
            disabled={picked === null}
          >
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span
              className={cn(
                'font-semibold',
                picked === payload.correctIndex
                  ? 'text-[var(--success)]'
                  : 'text-[var(--danger)]',
              )}
            >
              {picked === payload.correctIndex
                ? t('lesson.resultCorrect')
                : t('lesson.resultIncorrect')}
            </span>
            {payload.explanation?.trim() && (
              <p className='mt-2 w-full text-[14px] text-[var(--text2)]'>
                {payload.explanation}
              </p>
            )}
            <Button variant='secondary' size='sm' onClick={reset}>
              {t('lesson.tryAgain')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function TrueFalseStudent({
  payload,
}: {
  payload: ReturnType<typeof normalizeTrueFalse>;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className='rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-4'>
      <ParagraphText text={payload.statement || '—'} />
      <div className='mt-3.5 flex gap-2.5'>
        <Button
          size='sm'
          variant={picked === true ? 'primary' : 'secondary'}
          disabled={checked}
          onClick={() => !checked && setPicked(true)}
        >
          {t('lesson.trueLabel')}
        </Button>
        <Button
          size='sm'
          variant={picked === false ? 'primary' : 'secondary'}
          disabled={checked}
          onClick={() => !checked && setPicked(false)}
        >
          {t('lesson.falseLabel')}
        </Button>
      </div>
      <div className='mt-3'>
        {!checked ? (
          <Button
            size='sm'
            onClick={() => picked !== null && setChecked(true)}
            disabled={picked === null}
          >
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span
              className={cn(
                'font-semibold',
                picked === payload.correct
                  ? 'text-[var(--success)]'
                  : 'text-[var(--danger)]',
              )}
            >
              {picked === payload.correct
                ? t('lesson.resultCorrect')
                : t('lesson.resultIncorrect')}
            </span>
            {payload.explanation?.trim() && (
              <p className='mt-2 text-[14px] text-[var(--text2)]'>
                {payload.explanation}
              </p>
            )}
            <div className='mt-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={() => {
                  setPicked(null);
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
    <div className='rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-4'>
      <p className='mb-3 text-[13px] text-[var(--text3)]'>
        {t('lesson.matchStudentHint')}
      </p>
      <div className='flex flex-col gap-2.5'>
        {pairs.map((pair, row) => (
          <div
            key={`${blockId}-match-${row}`}
            className='flex flex-wrap items-center gap-2.5'
          >
            <div className='min-w-[100px] flex-1 rounded-lg border border-[var(--border2)] bg-[var(--surface)] p-[8px_10px]'>
              {pair.left || '—'}
            </div>
            <span className='text-[var(--text3)]'>→</span>
            <select
              disabled={checked}
              value={pickedCol[row] < 0 ? '' : String(pickedCol[row])}
              onChange={(e) =>
                setChoice(
                  row,
                  e.target.value === '' ? -1 : Number(e.target.value),
                )
              }
              className='min-w-[160px] flex-1 rounded-lg border border-[var(--border2)] bg-[var(--surface)] p-[8px_10px] text-[var(--text)]'
            >
              <option value=''>{t('lesson.matchPlaceholder')}</option>
              {optionOrder.map((ri) => (
                <option key={ri} value={ri}>
                  {pairs[ri].right || `(${ri + 1})`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className='mt-3.5 flex flex-wrap items-center gap-2'>
        {!checked ? (
          <Button
            size='sm'
            onClick={() => setChecked(true)}
            disabled={!allChosen}
          >
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span
              className={cn(
                'font-semibold',
                correct ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}
            >
              {correct
                ? t('lesson.resultCorrect')
                : t('lesson.resultIncorrect')}
            </span>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                setPickedCol(Array(n).fill(-1));
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

function normAnswer(s: string, ci: boolean) {
  const t = s.trim();
  return ci ? t.toLowerCase() : t;
}

function FillBlankStudent({
  payload,
}: {
  payload: ReturnType<typeof normalizeFillBlank>;
}) {
  const { t } = useTranslation();
  const n = countFillBlanks(payload.text);
  const [values, setValues] = useState<string[]>(() =>
    Array(Math.max(n, 1)).fill(''),
  );
  const [checked, setChecked] = useState(false);

  const parts = payload.text.split(FILL_BLANK_MARKER);
  const answers = payload.answers;

  let ok = false;
  if (checked && n > 0 && answers.length >= n) {
    ok = Array.from(
      { length: n },
      (_, i) =>
        normAnswer(values[i] || '', !!payload.caseInsensitive) ===
        normAnswer(answers[i] || '', !!payload.caseInsensitive),
    ).every(Boolean);
  }

  return (
    <div className='rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-4'>
      {n === 0 ? (
        <ParagraphText text={payload.text || t('lesson.fillBlankNoGaps')} />
      ) : (
        <div className='flex flex-wrap items-center gap-1.5 text-base leading-[1.7]'>
          {parts.map((seg, i) => (
            <React.Fragment key={`fb-${i}`}>
              <span className='whitespace-pre-wrap'>{seg}</span>
              {i < parts.length - 1 && (
                <input
                  disabled={checked}
                  value={values[i] ?? ''}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = e.target.value;
                    setValues(next);
                  }}
                  className='rounded-lg bg-[var(--surface)] p-[4px_8px] text-[var(--text)]'
                  style={{
                    minWidth: 80,
                    width: Math.max(80, (values[i]?.length || 3) * 10),
                    border: checked
                      ? `2px solid ${ok ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.5)'}`
                      : '1px solid var(--border2)',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div className='mt-3.5'>
        {!checked ? (
          <Button
            size='sm'
            onClick={() => n > 0 && setChecked(true)}
            disabled={n === 0}
          >
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span
              className={cn(
                'font-semibold',
                ok ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}
            >
              {ok ? t('lesson.resultCorrect') : t('lesson.resultIncorrect')}
            </span>
            <div className='mt-2'>
              <Button
                variant='secondary'
                size='sm'
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
  }, [blockId, correct.join('')]);

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

  const isOrdered =
    order.length === correct.length && order.every((w, i) => w === correct[i]);

  return (
    <div className='rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-4'>
      <p className='mb-2.5 text-[13px] text-[var(--text3)]'>
        {t('lesson.wordOrderSwapHint')}
      </p>
      <div className='flex flex-wrap gap-2'>
        {order.map((w, i) => (
          <button
            key={`${blockId}-wo-${i}`}
            type='button'
            disabled={checked}
            onClick={() => tap(i)}
            className='rounded-[10px] bg-[var(--surface)] p-[8px_12px] text-[15px] text-[var(--text)]'
            style={{
              border: `2px solid ${sel === i ? 'var(--brand)' : 'var(--border2)'}`,
              cursor: checked ? 'default' : 'pointer',
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <div className='mt-3.5 flex flex-wrap items-center gap-2'>
        {!checked ? (
          <Button size='sm' onClick={() => setChecked(true)}>
            {t('lesson.checkAnswers')}
          </Button>
        ) : (
          <>
            <span
              className={cn(
                'font-semibold',
                isOrdered ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}
            >
              {isOrdered
                ? t('lesson.resultCorrect')
                : t('lesson.resultIncorrect')}
            </span>
            <Button
              variant='secondary'
              size='sm'
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

function OpenPromptStudent({
  payload,
}: {
  payload: ReturnType<typeof normalizeOpenPrompt>;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [showSample, setShowSample] = useState(false);

  return (
    <div className='rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-4'>
      <ParagraphText text={payload.prompt || '—'} />
      <label className='mt-3 block text-[13px] text-[var(--text3)]'>
        {t('lesson.yourAnswer')}
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className='input-field mt-1.5 w-full resize-y rounded-[10px] p-2.5 text-[15px]'
      />
      {payload.sampleAnswer?.trim() && (
        <div className='mt-3'>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setShowSample((s) => !s)}
          >
            {showSample
              ? t('lesson.hideSampleAnswer')
              : t('lesson.showSampleAnswer')}
          </Button>
          {showSample && (
            <div className='mt-2.5 rounded-[10px] border border-[var(--border2)] bg-[var(--surface)] p-3 whitespace-pre-wrap'>
              {payload.sampleAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
