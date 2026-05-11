import { useMemo } from 'react';

import { LessonBlockView } from '@/entities/LessonBlock';

import type { LessonBlockItem } from '@/shared/api/types';

interface Props {
  blocks: LessonBlockItem[];
}

export function ClassroomLessonPanel({ blocks }: Props) {
  const sorted = useMemo(
    () => [...blocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [blocks],
  );

  return (
    <>
      {sorted.map((block) => (
        <div
          key={block.id}
          id={`classroom-lesson-block-${block.id}`}
          className='scroll-mt-4'
        >
          <LessonBlockView block={block} />
        </div>
      ))}
    </>
  );
}
