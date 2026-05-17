import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StudyMistakesModal } from './StudyMistakesModal';

import {
  buildCardLookup,
  type ModeResult,
  resolveMistakes,
} from '@/shared/lib/studyResults';

interface Props {
  results: ModeResult[];
  cardLookup: ReturnType<typeof buildCardLookup>;
  /** Кнопка «Попробовать ещё раз». */
  onRetry: () => void;
  /** Кнопка «Вернуться к колоде». */
  onBack: () => void;
}

/**
 * Подобрать заголовок/эмодзи/градиент для итогового экрана по проценту.
 * 100% — «Идеально», ≥70% — «Отлично», ≥50% — «Хорошо», иначе — «Не сдавайся».
 */
function pickResultPresentation(percent: number) {
  if (percent === 100) {
    return {
      titleKey: 'perfect' as const,
      emoji: '🏆',
      gradient: 'linear-gradient(135deg, #10B981, #06B6D4)',
    };
  }
  if (percent >= 70) {
    return {
      titleKey: 'great' as const,
      emoji: '🎉',
      gradient: 'linear-gradient(135deg, #10B981, #06B6D4)',
    };
  }
  if (percent >= 50) {
    return {
      titleKey: 'good' as const,
      emoji: '💪',
      gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    };
  }
  return {
    titleKey: 'keep' as const,
    emoji: '📖',
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
  };
}

/**
 * Экран итогов сессии обучения.
 *
 * Сверху — большой эмодзи и заголовок (зависит от процента верных
 * ответов). Затем — большая цифра процента, плашки «верно/на повтор» и
 * три кнопки: посмотреть ошибки (если они есть), вернуться к колоде,
 * пройти ещё раз.
 */
export function StudyResultScreen({
  results,
  cardLookup,
  onRetry,
  onBack,
}: Props) {
  const { t } = useTranslation();
  // Открыта ли модалка с разбором ошибок
  const [isMistakesModalOpen, setIsMistakesModalOpen] = useState(false);

  // Подробные ошибки с question/expected/given (для модалки)
  const mistakes = useMemo(
    () => resolveMistakes(results, cardLookup),
    [results, cardLookup],
  );

  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;
  const percent =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const { titleKey, emoji, gradient } = pickResultPresentation(percent);

  return (
    <div className='animate-scale mx-auto w-full max-w-[520px] text-center'>
      <div className='mb-4 text-[88px]'>{emoji}</div>
      <h2 className='font-display mb-3 text-3xl'>
        {t(`study.result.${titleKey}`)}
      </h2>

      <div
        className='font-display mb-3 bg-clip-text text-[80px] leading-[1] font-extrabold text-transparent'
        style={{ background: gradient, WebkitBackgroundClip: 'text' }}
      >
        {percent}%
      </div>
      <p className='text-text2 mb-6'>
        {t('study.result.scoreLine', {
          correct: correctCount,
          total: totalCount,
        })}
      </p>

      {/* Две плашки: «верно» и «на повтор» */}
      <div className='mb-6 grid grid-cols-2 gap-3'>
        <div className='rounded-[16px] border border-[rgba(16,185,129,0.4)] bg-[rgba(16,185,129,0.10)] p-4'>
          <div className='font-display text-success text-3xl font-bold'>
            {correctCount}
          </div>
          <div className='text-text2 text-sm'>{t('common.correct')}</div>
        </div>
        <div className='rounded-[16px] border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.10)] p-4'>
          <div className='font-display text-danger text-3xl font-bold'>
            {totalCount - correctCount}
          </div>
          <div className='text-text2 text-sm'>{t('common.toReview')}</div>
        </div>
      </div>

      {/* Кнопки: посмотреть ошибки / назад / повторить */}
      <div className='flex flex-col gap-3'>
        {mistakes.length > 0 && (
          <button
            type='button'
            className='btn btn-ghost border-border w-full justify-center border'
            onClick={() => setIsMistakesModalOpen(true)}
          >
            {t('study.result.viewMistakes', { count: mistakes.length })}
          </button>
        )}
        <button
          type='button'
          className='btn btn-secondary w-full justify-center'
          onClick={onBack}
        >
          {t('study.result.backToDeck')}
        </button>
        <button
          type='button'
          className='btn btn-primary w-full justify-center'
          onClick={onRetry}
        >
          {t('study.result.again')}
        </button>
      </div>

      {isMistakesModalOpen && (
        <StudyMistakesModal
          mistakes={mistakes}
          onClose={() => setIsMistakesModalOpen(false)}
        />
      )}
    </div>
  );
}
