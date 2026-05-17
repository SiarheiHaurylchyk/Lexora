interface Props {
  /** Индекс текущей карточки (с нуля); в UI показывается как idx + 1. */
  idx: number;
  /** Всего карточек в режиме. */
  total: number;
  /** Показать процент справа от полосы (по умолчанию выключено). */
  showPercent?: boolean;
  className?: string;
}

/**
 * Полоса прогресса для режима обучения.
 * Слева — счётчик «N / всего», справа (опционально) — процент.
 * На последней карточке показывает 100%.
 */
export function ProgressBar({ idx, total, showPercent, className }: Props) {
  const percent = total > 0 ? ((idx + 1) / total) * 100 : 0;

  return (
    <div className={cn('mb-5 flex items-center gap-3', className)}>
      <span className='text-text2 min-w-[64px] text-sm font-semibold'>
        {idx + 1} / {total}
      </span>
      <div className='progress-bar flex-1'>
        <div className='progress-fill' style={{ width: `${percent}%` }} />
      </div>
      {showPercent && (
        <span className='text-text2 min-w-[48px] text-right text-sm font-semibold'>
          {Math.round(percent)}%
        </span>
      )}
    </div>
  );
}
