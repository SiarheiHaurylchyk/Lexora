/**
 * ISO 639-1 codes accepted at registration / profile (must match backend AuthController).
 */
export const LEARNING_LANGUAGE_CODES = [
  'en',
  'ru',
  'de',
  'es',
  'fr',
  'it',
  'pt',
  'zh',
  'ja',
  'ko',
  'ar',
  'tr',
  'pl',
  'uk',
] as const;

export type LearningLanguageCode = (typeof LEARNING_LANGUAGE_CODES)[number];
