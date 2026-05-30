import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useDueReviewSession } from './useDueReviewSession';

import { FlashcardMode, StudyResultScreen } from '@/widgets/StudyMode';

/** Глобальное повторение всех карточек, срок которых наступил. */
export function DueReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    deck,
    cards,
    rawCards,
    sessionId,
    loading,
    phase,
    results,
    cardLookup,
    handleComplete,
    handleRetry,
  } = useDueReviewSession();

  if (loading) {
    return (
      <div className='flex flex-col items-center gap-3 py-24 text-center'>
        <div className='animate-pulse-soft text-[64px]'>🧠</div>
        <p className='text-text2'>{t('srs.loadingReview')}</p>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col'>
      <div className='border-border mb-6 flex flex-wrap items-center gap-3 border-b pb-4'>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={() => navigate('/decks')}
        >
          {t('study.exit')}
        </button>
        <div className='font-semibold'>{deck?.title}</div>
        <div className='badge badge-brand'>{t('study.modesHeader.REVIEW')}</div>
        <div className='text-text3 ml-auto text-sm'>
          {t('study.cardsCount', { count: cards.length })}
        </div>
      </div>

      <div className='flex-1 px-4 py-4'>
        {phase === 'result' ? (
          <StudyResultScreen
            results={results}
            cardLookup={cardLookup}
            onRetry={handleRetry}
            onBack={() => navigate('/decks')}
          />
        ) : (
          deck && (
            <FlashcardMode
              cards={cards}
              rawCards={rawCards}
              deck={deck}
              sessionId={sessionId}
              onComplete={handleComplete}
              dir='forward'
            />
          )
        )}
      </div>
    </div>
  );
}
