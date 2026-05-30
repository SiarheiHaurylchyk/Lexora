import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStudySession } from './useStudySession';

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

/** Все режимы обучения, которые знает страница. */
const KNOWN_MODES = [
  'FLASHCARD',
  'LEARN',
  'MATCH',
  'SPELL',
  'DRAG',
  'SCRAMBLE',
  'GRAVITY',
  'EXAM',
  'REVIEW',
] as const;

type StudyModeName = (typeof KNOWN_MODES)[number];

/**
 * Подбирает виджет режима обучения по имени из URL.
 * Если режим неизвестен — показываем «Карточки» как разумный дефолт.
 */
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
    case 'REVIEW':
      return <FlashcardMode {...rest} />;
    default:
      return <FlashcardMode {...rest} />;
  }
}

/**
 * Страница обучения по колоде.
 *
 * Шапка: кнопка «выйти», название колоды, бейдж режима и направления.
 * Тело: либо активный режим (FlashcardMode и т.п.), либо экран итогов
 * `StudyResultScreen` после завершения сессии.
 *
 * Вся бизнес-логика (загрузка колоды, сессия, перемешивание, retry)
 * вынесена в хук `useStudySession`.
 */
export function StudyPage() {
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
    deckUrlId,
    handleComplete,
    handleRetry,
  } = useStudySession();

  // Локализованное название режима обучения для бейджа в шапке
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
      {/* Шапка страницы обучения: выход, название, бейджи режима/направления */}
      <div className='border-border mb-6 flex flex-wrap items-center gap-3 border-b pb-4'>
        <button
          type='button'
          className='btn btn-ghost btn-sm'
          onClick={() => navigate(`/decks/${deckUrlId}`)}
        >
          {t('study.exit')}
        </button>
        <div className='font-semibold'>{deck?.title}</div>
        <div className='badge badge-brand'>{modeLabel}</div>
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
            onBack={() => navigate(`/decks/${deckUrlId}`)}
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
