import { useTranslation } from 'react-i18next';
import { Button } from '@ui';

import type { LessonBlockType } from '@/shared/api/types';

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

export function AddBlockMenu({ onAdd, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-[14px] border border-dashed border-[var(--border2)] bg-[var(--bg2)] p-3.5',
      )}
    >
      <span className='mr-1.5 self-center text-[13px] text-[var(--text3)]'>
        {t('lesson.addBlockLabel')}:
      </span>
      {TYPES.map(({ type, icon, labelKey }) => (
        <Button
          key={type}
          variant='secondary'
          size='sm'
          onClick={() => onAdd(type)}
          disabled={disabled}
        >
          {icon} {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
