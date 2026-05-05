/**
 * Lightweight language / script detection for TTS routing.
 *
 * Why it exists:
 *   The AI tutor may reply in a language that is *not* the learner's profile
 *   target — e.g. an English learner types «переведи на русский», the model
 *   answers in Russian. If we blindly hand the reply to a TTS engine tagged
 *   "English", the voice reads Russian text with an English accent and sounds
 *   broken. The fix is to detect what language the reply actually uses and
 *   route the audio synthesizer accordingly — including honest handling of
 *   bilingual (code-switched) replies.
 *
 * Output:
 *   - `primary`    strongest detected language code (ISO-639-1 where possible).
 *   - `secondary`  second language when the reply is bilingual (≥ threshold).
 *   - `mixed`      true iff two scripts each carry a meaningful share of text.
 *   - `scripts`    raw counters; useful for diagnostics.
 *
 * The detector is deliberately script-based (counting code points per Unicode
 * block) — fast, zero-dependency and good enough for the languages Lexora
 * currently supports. It is NOT a full-blown NLP language identifier.
 */

export type DetectedLang =
  | 'en'
  | 'ru'
  | 'uk'
  | 'de'
  | 'es'
  | 'fr'
  | 'it'
  | 'pt'
  | 'pl'
  | 'tr'
  | 'ar'
  | 'zh'
  | 'ja'
  | 'ko';

export interface TextLanguageInfo {
  /** Strongest detected language. Falls back to `fallback` for empty / punctuation-only text. */
  primary: DetectedLang;
  /** Second language when the reply is visibly bilingual; otherwise null. */
  secondary: DetectedLang | null;
  /** True when two scripts each carry ≥ the share threshold (default 15 %). */
  mixed: boolean;
  /** Raw per-script character counts (letters only, no digits / punctuation). */
  scripts: ScriptCounts;
}

interface ScriptCounts {
  latin: number;
  cyrillic: number;
  arabic: number;
  han: number;
  hiragana: number;
  katakana: number;
  hangul: number;
  /** Total letter characters across all scripts. */
  total: number;
}

export interface DetectOptions {
  /** Default language for empty / punctuation-only strings. Default: `"en"`. */
  fallback?: DetectedLang;
  /** Minimum share (0..1) for a secondary script to count as "mixed". Default: 0.15. */
  mixedThreshold?: number;
  /** Optional hint (e.g. the learner profile language) used only as a tie-breaker. */
  hint?: string;
}

/** Main entry point: classify a chunk of text. */
export function detectTextLanguage(text: string, opts: DetectOptions = {}): TextLanguageInfo {
  const fallback = opts.fallback ?? 'en';
  const threshold = opts.mixedThreshold ?? 0.15;
  const scripts = countScripts(text);

  if (scripts.total === 0) {
    return { primary: fallback, secondary: null, mixed: false, scripts };
  }

  const ukrainianMarker = hasUkrainianSpecific(text);

  /** Typed separately so `.filter` keeps `count` as `number` (chained filter widens tuples to `string | number`). */
  const scriptScores: [DetectedLang, number][] = [
    [ukrainianMarker ? 'uk' : 'ru', scripts.cyrillic],
    [pickLatinLang(opts.hint, fallback), scripts.latin],
    ['ar', scripts.arabic],
    ['zh', scripts.han],
    ['ja', scripts.hiragana + scripts.katakana],
    ['ko', scripts.hangul],
  ];
  const entries = scriptScores.filter(([, count]) => count > 0);

  entries.sort((a, b) => b[1] - a[1]);

  const primary = entries[0][0];
  let secondary: DetectedLang | null = null;
  let mixed = false;
  if (entries.length > 1) {
    const secondaryCount = entries[1][1];
    if (secondaryCount / scripts.total >= threshold) {
      secondary = entries[1][0];
      mixed = true;
    }
  }

  return { primary, secondary, mixed, scripts };
}

/** Convenience: returns true when the text contains non-trivial amounts of two scripts. */
export function isBilingual(text: string, opts: DetectOptions = {}): boolean {
  return detectTextLanguage(text, opts).mixed;
}

/** Convenience: just the primary language. */
export function primaryLanguageOf(text: string, opts: DetectOptions = {}): DetectedLang {
  return detectTextLanguage(text, opts).primary;
}

/**
 * True when the text has enough Cyrillic and Latin letters to treat as Russian + English code-switch for TTS,
 * even if {@link detectTextLanguage} sets `mixed: false` because one script dominates by share (e.g. long Russian
 * paragraph + short English question). Without splitting, a Russian neural voice reads the English tail as noise.
 */
export function hasSignificantRuEnLetterMix(text: string, minEach = 8): boolean {
  const scripts = countScripts(text);
  return scripts.cyrillic >= minEach && scripts.latin >= minEach;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function countScripts(text: string): ScriptCounts {
  const out: ScriptCounts = {
    latin: 0,
    cyrillic: 0,
    arabic: 0,
    han: 0,
    hiragana: 0,
    katakana: 0,
    hangul: 0,
    total: 0,
  };
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (isLatinLetter(cp)) out.latin++;
    else if (isCyrillicLetter(cp)) out.cyrillic++;
    else if (isArabicLetter(cp)) out.arabic++;
    else if (isHan(cp)) out.han++;
    else if (isHiragana(cp)) out.hiragana++;
    else if (isKatakana(cp)) out.katakana++;
    else if (isHangul(cp)) out.hangul++;
    else continue;
    out.total++;
  }
  return out;
}

function isLatinLetter(cp: number): boolean {
  return (
    (cp >= 0x0041 && cp <= 0x005a) || // A-Z
    (cp >= 0x0061 && cp <= 0x007a) || // a-z
    (cp >= 0x00c0 && cp <= 0x024f) || // Latin-1 Supplement + Latin Extended-A/B (diacritics)
    (cp >= 0x1e00 && cp <= 0x1eff) // Latin Extended Additional
  );
}

function isCyrillicLetter(cp: number): boolean {
  return (
    (cp >= 0x0400 && cp <= 0x04ff) || // Cyrillic
    (cp >= 0x0500 && cp <= 0x052f) // Cyrillic Supplement
  );
}

function isArabicLetter(cp: number): boolean {
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  );
}

function isHan(cp: number): boolean {
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}
function isHiragana(cp: number): boolean {
  return cp >= 0x3040 && cp <= 0x309f;
}
function isKatakana(cp: number): boolean {
  return (cp >= 0x30a0 && cp <= 0x30ff) || (cp >= 0x31f0 && cp <= 0x31ff);
}
function isHangul(cp: number): boolean {
  return (
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0x3130 && cp <= 0x318f) ||
    (cp >= 0xa960 && cp <= 0xa97f)
  );
}

/** Markers that strongly suggest Ukrainian rather than Russian Cyrillic. */
function hasUkrainianSpecific(text: string): boolean {
  return /[іїєґІЇЄҐ]/.test(text);
}

/**
 * We cannot reliably tell English from German/French/… by script alone, so we
 * respect the caller-supplied hint when it points at a Latin-script language;
 * otherwise default to `fallback` (usually English). Latin-script languages
 * share the same browser voice engines regardless, but the hint helps the
 * server-side TTS pick more natural prosody.
 */
function pickLatinLang(hint: string | undefined, fallback: DetectedLang): DetectedLang {
  const h = (hint || '').trim().toLowerCase();
  const latinLangs: DetectedLang[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'pl', 'tr'];
  if (latinLangs.includes(h as DetectedLang)) return h as DetectedLang;
  const latinFallback: DetectedLang = latinLangs.includes(fallback) ? fallback : 'en';
  return latinFallback;
}
