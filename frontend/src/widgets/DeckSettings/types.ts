/**
 * Метаданные колоды в форме настроек.
 * Используется виджетом DeckSettingsForm и хуком useDeckEditor.
 */
export interface DeckMeta {
  title: string;
  description: string;
  /** Код языка термина (на котором учат). */
  sourceLanguage: string;
  /** Код языка перевода. */
  targetLanguage: string;
  /** Цвет обложки колоды (hex). */
  coverColor: string;
  /** Эмодзи-иконка колоды. */
  emoji: string;
  /** PRIVATE | PUBLIC — кому видна колода. */
  visibility: string;
}

/** Палитра цветов обложки колоды. */
export const DECK_COLORS = [
  '#7C3AED',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
] as const;

/** Эмодзи-иконки на выбор для колоды. */
export const DECK_EMOJIS = [
  '📚',
  '🌍',
  '💬',
  '🔤',
  '🎓',
  '✍️',
  '🧠',
  '🗣️',
  '📖',
  '🌐',
  '🎯',
  '⚡',
  '🔑',
  '🏆',
  '✨',
] as const;

/** Коды языков, доступных в селектах формы настроек. */
export const LANG_CODES = [
  'en',
  'ru',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'zh',
  'ja',
  'ko',
  'tr',
  'pl',
  'uk',
  'ar',
] as const;
