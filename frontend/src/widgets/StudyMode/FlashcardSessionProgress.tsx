import { useTranslation } from 'react-i18next';

interface FlashcardSessionProgressProps {
  /** Общее число карточек в начале сессии (не меняется). */
  totalOriginalCards: number;
  /** Карточки, отмеченные как «Знаю» на данный момент. */
  masteredCount: number;
  /** Карточки в очереди повторов (хотя бы раз отмечены «Сложно»). */
  repeatQueueCount: number;
  /** Доп. классы Tailwind от родителя (например, flex-размеры). */
  className?: string;
}

/**
 * Шапка прогресса flashcard-сессии.
 *
 * Показывает освоенные карточки (зелёный) и ожидающие повтора (жёлтый).
 * Полоска заполняется по mastered / total, чтобы прогресс был виден
 * даже когда карточки возвращаются в очередь.
 */
export function FlashcardSessionProgress({
  totalOriginalCards,
  masteredCount,
  repeatQueueCount,
  className,
}: FlashcardSessionProgressProps) {
  const { t } = useTranslation();

  const masteredPercent =
    totalOriginalCards > 0 ? (masteredCount / totalOriginalCards) * 100 : 0;

  return (
    <div className={cn(className)}>
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-success text-sm font-semibold'>
          ✓ {t('study.flashcard.masteredCount', { count: masteredCount })}
        </span>

        {repeatQueueCount > 0 && (
          <span className='text-warning text-sm font-semibold'>
            🔁 {t('study.flashcard.repeatCount', { count: repeatQueueCount })}
          </span>
        )}

        <span className='text-text3 text-xs font-medium'>
          {masteredCount} / {totalOriginalCards}
        </span>
      </div>

      <div className='progress-bar'>
        <div
          className='progress-fill'
          style={{ width: `${masteredPercent}%` }}
        />
      </div>
    </div>
  );
}
