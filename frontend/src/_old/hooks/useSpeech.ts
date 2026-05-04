/**
 * Hooks for text-to-speech (TTS) using the browser's SpeechSynthesis API.
 *
 *   useVoices()  -> the list of voices the browser has available.
 *   useSpeech()  -> { speak, stop, ... }. Use `speak("hello", "en")` from any
 *                   component to play a word out loud.
 *
 * The user can override which voice is used per language and how fast normal
 * and "slow" playback should be — all of that lives in `settingsSlice`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';

/** Mic / browser STT: pick locale from OS + page hints (not true spoken-language detection). */
export const BROWSER_STT_LANG_AUTO = 'auto';

/** Map our short language codes (en, ru, ...) to BCP-47 tags the API expects. */
const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  pl: 'pl-PL',
  tr: 'tr-TR',
  uk: 'uk-UA',
};

/** Convert a short code into a full locale (e.g. "en" -> "en-US"). */
export function resolveLang(lang: string) {
  return LANG_MAP[lang] || lang || 'en-US';
}

function normalizeLangTag(raw: string): string {
  return raw.trim().replace('_', '-');
}

/**
 * BCP-47 tag for Web Speech API when the user chooses {@link BROWSER_STT_LANG_AUTO}.
 * Order: OS preferred locales → browser primary → html lang → app UI locale → en-US.
 * For mixed Russian/English speech without choosing a language, use server Whisper instead.
 */
export function resolveBrowserSttLang(speechLang: string, uiLocale?: string): string {
  if (speechLang !== BROWSER_STT_LANG_AUTO) return resolveLang(speechLang);
  if (typeof window === 'undefined') return 'en-US';

  const ordered: string[] = [];
  const push = (v: string | undefined | null) => {
    if (v && typeof v === 'string' && v.trim()) ordered.push(v.trim());
  };

  if (navigator.languages?.length) {
    for (const l of navigator.languages) push(l);
  }
  push(navigator.language);

  if (typeof document !== 'undefined') {
    push(document.documentElement?.lang);
  }

  if (uiLocale === 'ru') push('ru');
  else if (uiLocale === 'en') push('en');

  push('en-US');

  const seen = new Set<string>();
  for (const raw of ordered) {
    const tag = normalizeLangTag(raw);
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const base = tag.split('-')[0]?.toLowerCase();
    if (base && LANG_MAP[base]) return LANG_MAP[base];

    if (/^[a-z]{2}(-[a-z0-9]{2,8})+$/i.test(tag)) return tag;
  }

  return 'en-US';
}

/**
 * When several voices exist for one locale (Chrome: Google vs local; Edge:
 * Microsoft), pick one that tends to sound less robotic for Russian/Ukrainian.
 */
function pickBestVoiceForLang(voices: SpeechSynthesisVoice[], langShort: string): SpeechSynthesisVoice | undefined {
  const target = resolveLang(langShort).replace('_', '-').toLowerCase();
  const prefix = target.split('-')[0];
  const candidates = voices.filter((v) => {
    const l = v.lang.replace('_', '-').toLowerCase();
    return l === target || l.startsWith(`${prefix}-`);
  });
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const score = (v: SpeechSynthesisVoice): number => {
    const blob = `${v.name} ${v.voiceURI}`.toLowerCase();
    let s = 0;
    if (!v.localService) s += 2;
    if (/google|microsoft|apple|premium|enhanced|neural|natural/.test(blob)) s += 4;
    if ((prefix === 'ru' || prefix === 'uk') && /irina|dmitri|dmitry|pavel|ekaterina|katya|milena|filipp|boris/.test(blob)) {
      s += 2;
    }
    return s;
  };
  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

/** Slightly slower delivery helps Slavic voices sound less «метallic» in some engines. */
function naturalRateForLang(lang: string, baseRate: number): number {
  const p = (lang || 'en').split('-')[0].toLowerCase();
  if (p === 'ru' || p === 'uk') return baseRate * 0.93;
  return baseRate;
}

/**
 * Split assistant text into runs of Cyrillic vs Latin letters so each can use the right browser voice.
 * Punctuation and digits attach to the surrounding script run.
 */
export function splitMixedRuEn(text: string): { text: string; lang: 'ru' | 'en' }[] {
  const parts: { text: string; lang: 'ru' | 'en' }[] = [];
  let buf = '';
  let current: 'ru' | 'en' | null = null;

  const flush = () => {
    const t = buf.replace(/\s+/g, ' ').trim();
    if (t && current) parts.push({ text: t, lang: current });
    buf = '';
    current = null;
  };

  for (const ch of text) {
    const cyr = /[\u0400-\u04FF]/.test(ch);
    const lat = /[a-zA-Z]/.test(ch);

    if (cyr) {
      if (current === 'en') flush();
      current = 'ru';
      buf += ch;
    } else if (lat) {
      if (current === 'ru') flush();
      current = 'en';
      buf += ch;
    } else if (current !== null) {
      buf += ch;
    } else if (!/\s/.test(ch)) {
      current = 'en';
      buf += ch;
    }
  }
  flush();
  return parts;
}

/** Options accepted by `speak`. */
export interface SpeakOptions {
  /** When true, use the slow rate from settings (or split words). */
  slow?: boolean;
  /** Custom rate (overrides slow / settings). 1 = normal speed. */
  rate?: number;
  /** Force a specific voice URI (rarely needed). */
  voiceURI?: string;
}

/** Subscribe to the browser's voice list. The browser may load voices async. */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(
    () => (typeof window !== 'undefined' && window.speechSynthesis?.getVoices()) || []
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  return voices;
}

/** Top-level speech hook: gives `speak`, `stop`, and friends. */
export function useSpeech() {
  const voices = useVoices();
  const speechSettings = useAppSelector((s) => s.settings.speech);

  /** Choose the best voice for a language, honoring the user's saved preference. */
  const pickVoice = useCallback(
    (lang: string): SpeechSynthesisVoice | undefined => {
      const target = resolveLang(lang);
      const savedURI = speechSettings.voices[lang];
      if (savedURI) {
        const saved = voices.find((v) => v.voiceURI === savedURI);
        if (saved) return saved;
      }
      return (
        pickBestVoiceForLang(voices, lang) ||
        voices.find((v) => v.lang === target) ||
        voices.find((v) => v.lang.startsWith(target.split('-')[0]))
      );
    },
    [voices, speechSettings.voices]
  );

  /** Play a piece of text out loud in a chosen language. */
  const speak = useCallback(
    (text: string, lang = 'en', opts: SpeakOptions = {}) => {
      if (!text || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      let rate = opts.rate ?? (opts.slow ? speechSettings.slowRate : speechSettings.normalRate);
      if (opts.rate == null && !opts.slow) rate = naturalRateForLang(lang, rate);
      const voice = pickVoice(lang);
      const targetLang = voice?.lang || resolveLang(lang);

      const segments = opts.slow ? splitForSlow(text) : [text];

      segments.forEach((segment, idx) => {
        const utter = new SpeechSynthesisUtterance(segment);
        utter.lang = targetLang;
        utter.rate = rate;
        utter.pitch = 1;
        utter.volume = 1;
        if (voice) utter.voice = voice;
        if (opts.slow && idx < segments.length - 1) {
          utter.onend = () => {};
        }
        window.speechSynthesis.speak(utter);
      });
    },
    [pickVoice, speechSettings.slowRate, speechSettings.normalRate]
  );

  /** Queue browser TTS chunks alternating ru/en voices (for mixed replies when server Groq cannot). */
  const speakMixedRuEn = useCallback(
    (raw: string) => {
      if (!raw?.trim() || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const pieces = splitMixedRuEn(raw);
      if (pieces.length === 0) {
        const voice = pickVoice('en');
        const utter = new SpeechSynthesisUtterance(raw.trim());
        utter.lang = voice?.lang || resolveLang('en');
        utter.rate = naturalRateForLang('en', speechSettings.normalRate);
        utter.pitch = 1;
        utter.volume = 1;
        if (voice) utter.voice = voice;
        window.speechSynthesis.speak(utter);
        return;
      }
      for (const { text: chunk, lang } of pieces) {
        const voice = pickVoice(lang);
        const utter = new SpeechSynthesisUtterance(chunk);
        utter.lang = voice?.lang || resolveLang(lang);
        utter.rate = naturalRateForLang(lang, speechSettings.normalRate);
        utter.pitch = 1;
        utter.volume = 1;
        if (voice) utter.voice = voice;
        window.speechSynthesis.speak(utter);
      }
    },
    [pickVoice, speechSettings.normalRate],
  );

  /** Stop any currently speaking voice (useful when the user changes screen). */
  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop, speakMixedRuEn, voices, pickVoice };
}

/** When playing slow, split a sentence into individual words so each gets its own utterance. */
function splitForSlow(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];
  return words;
}
