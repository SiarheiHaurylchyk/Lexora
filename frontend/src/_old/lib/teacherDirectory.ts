/**
 * Shared constants for the public teacher directory (filters + API helpers).
 */

export const TEACHER_DIRECTORY_LANG_CODES = [
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

export type TeacherDirectorySort = 'new' | 'rate' | 'rate_desc';

export interface TeacherDirectoryAppliedFilters {
  lang: string;
  speaks: string;
  minRate: string;
  maxRate: string;
  hasVideo: boolean;
  /** Only tutors who marked “trial lesson” in profile. */
  trialLessonOnly: boolean;
  specialties: string[];
  sort: TeacherDirectorySort;
}

export const DEFAULT_TEACHER_DIRECTORY_FILTERS: TeacherDirectoryAppliedFilters = {
  lang: '',
  speaks: '',
  minRate: '',
  maxRate: '',
  hasVideo: false,
  trialLessonOnly: false,
  specialties: [],
  sort: 'new',
};

/** Specialty ids → lowercase snippets searched in headline/bio (multilingual where useful). */
const SPECIALTY_SEARCH_TOKENS: Record<string, string[]> = {
  conversation: ['conversation', 'speaking', 'говор', 'разговор'],
  business: ['business', 'бизнес', 'corporate'],
  exam: ['exam', 'ielts', 'toefl', 'экзамен', 'ege', 'огэ', 'cae'],
  grammar: ['grammar', 'грамматик'],
  kids: ['kids', 'children', 'дети', 'school'],
  pronunciation: ['pronunciation', 'акцент', 'phonetic'],
  interview: ['interview', 'собеседован'],
};

export const TEACHER_SPECIALTY_IDS = [
  'conversation',
  'business',
  'exam',
  'grammar',
  'kids',
  'pronunciation',
  'interview',
] as const;

export type TeacherSpecialtyId = (typeof TEACHER_SPECIALTY_IDS)[number];

export function specialtiesToApiParam(ids: string[]): string | undefined {
  const tokens = ids.flatMap((id) => SPECIALTY_SEARCH_TOKENS[id] ?? []);
  if (tokens.length === 0) return undefined;
  return Array.from(new Set(tokens)).join(',');
}

export function countActiveTeacherFilters(f: TeacherDirectoryAppliedFilters): number {
  let n = 0;
  if (f.lang) n += 1;
  if (f.speaks) n += 1;
  if (f.minRate.trim()) n += 1;
  if (f.maxRate.trim()) n += 1;
  if (f.hasVideo) n += 1;
  if (f.trialLessonOnly) n += 1;
  if (f.specialties.length) n += 1;
  if (f.sort !== 'new') n += 1;
  return n;
}
