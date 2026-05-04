import type { LessonBlockType } from '../services/types';

/** Use three underscores as a blank in FILL_BLANK blocks (shown to teachers in the UI). */
export const FILL_BLANK_MARKER = '___';

export interface McqPayload {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface TrueFalsePayload {
  statement: string;
  correct: boolean;
  explanation?: string;
}

export interface MatchPairsPayload {
  pairs: { left: string; right: string }[];
}

export interface FillBlankPayload {
  text: string;
  answers: string[];
  caseInsensitive?: boolean;
}

export interface WordOrderPayload {
  /** Correct sentence order, one token per entry (spaces split when authoring). */
  words: string[];
}

export interface OpenPromptPayload {
  prompt: string;
  sampleAnswer?: string;
}

export function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (raw == null || !String(raw).trim()) return fallback;
  try {
    const v = JSON.parse(String(raw)) as T;
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function defaultMcq(): McqPayload {
  return {
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

export function normalizeMcq(raw: unknown): McqPayload {
  const d = defaultMcq();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  const question = typeof o.question === 'string' ? o.question : '';
  let options = Array.isArray(o.options) ? o.options.map((x) => String(x ?? '')) : d.options;
  if (options.length < 2) options = [...options, '', ''].slice(0, 2);
  let correctIndex = typeof o.correctIndex === 'number' ? Math.floor(o.correctIndex) : 0;
  if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
  const explanation = typeof o.explanation === 'string' ? o.explanation : '';
  return { question, options, correctIndex, explanation };
}

export function defaultTrueFalse(): TrueFalsePayload {
  return { statement: '', correct: true, explanation: '' };
}

export function normalizeTrueFalse(raw: unknown): TrueFalsePayload {
  const d = defaultTrueFalse();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  return {
    statement: typeof o.statement === 'string' ? o.statement : '',
    correct: typeof o.correct === 'boolean' ? o.correct : true,
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
  };
}

export function defaultMatchPairs(): MatchPairsPayload {
  return {
    pairs: [
      { left: 'cat', right: 'кошка' },
      { left: 'dog', right: 'собака' },
    ],
  };
}

export function normalizeMatchPairs(raw: unknown): MatchPairsPayload {
  const d = defaultMatchPairs();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.pairs)) return d;
  const pairs = o.pairs
    .map((p) => {
      if (!p || typeof p !== 'object') return null;
      const q = p as Record<string, unknown>;
      const left = typeof q.left === 'string' ? q.left : '';
      const right = typeof q.right === 'string' ? q.right : '';
      return { left, right };
    })
    .filter(Boolean) as { left: string; right: string }[];
  return pairs.length >= 2 ? { pairs } : d;
}

export function defaultFillBlank(): FillBlankPayload {
  return {
    text: `Water boils at ${FILL_BLANK_MARKER} °C (at sea level).`,
    answers: ['100'],
    caseInsensitive: true,
  };
}

export function normalizeFillBlank(raw: unknown): FillBlankPayload {
  const d = defaultFillBlank();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  const text = typeof o.text === 'string' ? o.text : d.text;
  let answers = Array.isArray(o.answers)
    ? o.answers.map((x) => String(x ?? '').trim()).filter(Boolean)
    : d.answers;
  const caseInsensitive = typeof o.caseInsensitive === 'boolean' ? o.caseInsensitive : true;
  const nBlanks = countFillBlanks(text);
  if (answers.length === 0 && nBlanks > 0) answers = Array(nBlanks).fill('');
  if (nBlanks > 0 && answers.length !== nBlanks) {
    const next = [...answers];
    while (next.length < nBlanks) next.push('');
    answers = next.slice(0, nBlanks);
  }
  return { text, answers, caseInsensitive };
}

export function countFillBlanks(text: string): number {
  if (!text) return 0;
  const parts = text.split(FILL_BLANK_MARKER);
  return Math.max(0, parts.length - 1);
}

export function defaultWordOrder(): WordOrderPayload {
  return { words: ['I', 'love', 'learning', 'languages'] };
}

export function normalizeWordOrder(raw: unknown): WordOrderPayload {
  const d = defaultWordOrder();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.words)) return d;
  const words = o.words.map((x) => String(x ?? '').trim()).filter(Boolean);
  return words.length >= 2 ? { words } : d;
}

export function defaultOpenPrompt(): OpenPromptPayload {
  return { prompt: '', sampleAnswer: '' };
}

export function normalizeOpenPrompt(raw: unknown): OpenPromptPayload {
  const d = defaultOpenPrompt();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  return {
    prompt: typeof o.prompt === 'string' ? o.prompt : '',
    sampleAnswer: typeof o.sampleAnswer === 'string' ? o.sampleAnswer : '',
  };
}

/** Initial `content` JSON when creating a new block (teacher sees a sensible template). */
export function getDefaultLessonBlockContent(type: LessonBlockType): string | undefined {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return JSON.stringify(defaultMcq());
    case 'TRUE_FALSE':
      return JSON.stringify(defaultTrueFalse());
    case 'MATCH_PAIRS':
      return JSON.stringify(defaultMatchPairs());
    case 'FILL_BLANK':
      return JSON.stringify(defaultFillBlank());
    case 'WORD_ORDER':
      return JSON.stringify(defaultWordOrder());
    case 'OPEN_PROMPT':
      return JSON.stringify(defaultOpenPrompt());
    default:
      return undefined;
  }
}

export function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
