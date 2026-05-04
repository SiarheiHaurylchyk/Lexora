import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LessonBlockType } from '../../services/types';
import { Button } from '../ui';

/**
 * AddBlockMenu — a small toolbar with one button per block type.
 * Pressing a button asks the parent page to add a new (empty) block of that type.
 */
interface Props {
  onAdd: (type: LessonBlockType) => void;
  disabled?: boolean;
}

const TYPES: { type: LessonBlockType; icon: string; labelKey: string }[] = [
  { type: 'TEXT', icon: '📝', labelKey: 'lesson.addText' },
  { type: 'ARTICLE', icon: '📰', labelKey: 'lesson.addArticle' },
  { type: 'YOUTUBE', icon: '🎬', labelKey: 'lesson.addYoutube' },
  { type: 'LINK', icon: '🔗', labelKey: 'lesson.addLink' },
  { type: 'IMAGE', icon: '🖼', labelKey: 'lesson.addImage' },
  { type: 'NOTE', icon: '📌', labelKey: 'lesson.addNote' },
  { type: 'MULTIPLE_CHOICE', icon: '✅', labelKey: 'lesson.addMcq' },
  { type: 'TRUE_FALSE', icon: '❓', labelKey: 'lesson.addTrueFalse' },
  { type: 'MATCH_PAIRS', icon: '🔀', labelKey: 'lesson.addMatchPairs' },
  { type: 'FILL_BLANK', icon: '✏️', labelKey: 'lesson.addFillBlank' },
  { type: 'WORD_ORDER', icon: '🔤', labelKey: 'lesson.addWordOrder' },
  { type: 'OPEN_PROMPT', icon: '💭', labelKey: 'lesson.addOpenPrompt' },
];

export default function AddBlockMenu({ onAdd, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        padding: 14,
        background: 'var(--bg2)',
        border: '1px dashed var(--border2)',
        borderRadius: 14,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text3)', alignSelf: 'center', marginRight: 6 }}>
        {t('lesson.addBlockLabel')}:
      </span>
      {TYPES.map(({ type, icon, labelKey }) => (
        <Button
          key={type}
          kind="secondary"
          size="sm"
          onClick={() => onAdd(type)}
          disabled={disabled}
        >
          {icon} {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
