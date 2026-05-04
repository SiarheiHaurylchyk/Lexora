import React, { useMemo } from 'react';
import type { LessonBlockItem } from '../../services/types';
import LessonBlockView from '../lessons/LessonBlockView';
import styles from '../../pages/ClassroomPage.module.css';

interface Props {
  blocks: LessonBlockItem[];
}

export default function ClassroomLessonPanel({ blocks }: Props) {
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
          className={styles.lessonBlockAnchor}
        >
          <LessonBlockView block={block} />
        </div>
      ))}
    </>
  );
}
