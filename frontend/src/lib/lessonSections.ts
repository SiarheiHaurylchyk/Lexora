import type { LessonBlockItem, LessonItem, LessonSectionItem } from '../services/types';

export function lessonSectionsSorted(lesson: LessonItem | null | undefined): LessonSectionItem[] {
  const raw = lesson?.sections;
  if (!raw?.length) return [];
  return [...raw].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function flattenLessonBlocks(lesson: LessonItem | null | undefined): LessonBlockItem[] {
  return lessonSectionsSorted(lesson).flatMap((s) => s.blocks ?? []);
}

export function findSectionIdContainingBlock(lesson: LessonItem | null | undefined, blockId: number): number | null {
  for (const s of lessonSectionsSorted(lesson)) {
    if ((s.blocks ?? []).some((b) => b.id === blockId)) return s.id;
  }
  return null;
}
