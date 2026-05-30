import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useCombinedStudySession } from './useCombinedStudySession';

import {
  DragMode,
  ExamMode,
  FlashcardMode,
  GravityMode,
  LearnMode,
  MatchMode,
  ScrambleMode,
  SpellMode,
  type StudyModeProps,
  StudyResultScreen,
} from '@/widgets/StudyMode';

const KNOWN_MODES = [
  'FLASHCARD',
  'LEARN',
  'MATCH',
  'SPELL',
  'DRAG',
  'SCRAMBLE',
  'GRAVITY',
  'EXAM',
] as const;

type StudyModeName = (typeof KNOWN_MODES)[number];

function ActiveStudyMode(props: StudyModeProps & { mode: string | undefined }) {
  const { mode, ...rest } = props;
  switch (mode) {
    case 'LEARN':
      return <LearnMode {...rest} />;
    case 'MATCH':
      return <MatchMode {...rest} />;
    case 'SPELL':
      return <SpellMode {...rest} />;
    case 'DRAG':
      return <DragMode {...rest} />;
    case 'SCRAMBLE':
      return <ScrambleMode {...rest} />;
    case 'GRAVITY':
      return <GravityMode {...rest} />;
    case 'EXAM':
      return <ExamMode {...rest} />;
    default:
      return <FlashcardMode {...rest} />;
  }
}

/** Обучение по нескольким колодам за одну сессию (карточки смешаны). */
export function CombinedStudyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    deck,
    cards,
    rawCards,
    sessionId,
    loading,
    dir,
    phase,
    results,
    cardLookup,
    mode,
    handleComplete,
    handleRetry,
  } = useCombinedStudySession();

  const modeLabel =
    mode && (KNOWN_MODES as readonly string[]).includes(mode)
      ? t(`study.modesHeader.${mode as StudyModeName}`)
      : mode;

  if (loading) {
    return (
      <div className='flex flex-col items-center gap-3 py-24 text-center'>
        <div className='animate-pulse-soft text-[64px]'>⚡</div>
        <p className='text-text2'>{t('study.loading')}</p>
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
        <div className='badge badge-brand'>{modeLabel}</div>
        <div className='badge badge-success'>{t('combinedStudy.badge')}</div>
        {dir !== 'forward' && (
          <div className='badge badge-warning'>
            {dir === 'reverse' ? '← обратный' : 'смешанный'}
          </div>
        )}
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
            <ActiveStudyMode
              mode={mode}
              cards={cards}
              rawCards={rawCards}
              deck={deck}
              sessionId={sessionId}
              onComplete={handleComplete}
              dir={dir}
            />
          )
        )}
      </div>
    </div>
  );
}
