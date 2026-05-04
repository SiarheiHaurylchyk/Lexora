/**
 * Client-side translation via MyMemory public API (GET).
 * Suitable for short classroom phrases; do not send secrets or personal data.
 *
 * @see https://mymemory.translated.net/doc/spec.php
 */

export const MYMEMORY_MAX_CHARS = 450;

export type MyMemoryLang = 'en' | 'ru' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'uk' | 'pl' | 'tr' | 'zh' | 'ja' | 'ko' | 'ar';

export async function translateWithMyMemory(text: string, source: 'auto' | MyMemoryLang, target: MyMemoryLang): Promise<string> {
  const q = text.trim();
  if (!q) {
    throw new Error('empty');
  }
  if (q.length > MYMEMORY_MAX_CHARS) {
    throw new Error('too_long');
  }
  const from = source === 'auto' ? 'auto' : source;
  const pair = `${from}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(pair)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('network');
  }
  const data = (await res.json()) as {
    responseStatus?: number | string;
    responseDetails?: string;
    responseData?: { translatedText?: string };
    quotaFinished?: boolean;
  };
  const status = Number(data.responseStatus);
  if (data.quotaFinished || status !== 200) {
    throw new Error(data.responseDetails || 'api');
  }
  const out = data.responseData?.translatedText?.trim();
  if (!out) {
    throw new Error('empty_response');
  }
  return out;
}
