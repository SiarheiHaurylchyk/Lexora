import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from './ProgressBar';
import type { StudyModeProps } from './types';

import {
  shouldShowSpeakButton,
  speakEnglishIfPossible,
  useSpeech,
} from '@/shared/hooks/useSpeech';
import { studyCardFrontLang } from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

const choiceBtn = tw`cursor-pointer rounded-[14px] border border-border px-5 py-4 text-left text-[15px] transition-colors duration-200`;

/**
 * Режим обучения «Учить» (multiple choice).
 *
 * На экране показывается термин (с озвучкой), под ним 4 варианта перевода.
 * Один из них — правильный. После клика правильный подсвечивается зелёным,
 * неверный — красным, через секунду переходим к следующей карточке.
 */
export function LearnMode({
  cards,
  deck,
  sessionId,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  // Индекс текущей карточки в массиве cards
  const [currentIdx, setCurrentIdx] = useState(0);
  // 4 варианта ответа: 3 неверных + 1 правильный, перемешаны
  const [choices, setChoices] = useState<string[]>([]);
  // Что выбрал пользователь; null — ещё не выбирал
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
  // Накопленные результаты по всем уже отвеченным карточкам
  const [results, setResults] = useState<ReturnType<typeof okResult>[]>([]);
  // Подсветить правильный ответ (после клика на любой вариант)
  const [showCorrect, setShowCorrect] = useState(false);
  const card = cards[currentIdx];

  /** Сгенерировать новые 4 варианта (3 случайных «неверных» + 1 правильный). */
  const regenerateChoices = useCallback(() => {
    const wrong = cards
      .filter((_, i) => i !== currentIdx)
      .map((c) => c.definition);
    const wrongShuffled = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    setChoices(
      [...wrongShuffled, card.definition].sort(() => Math.random() - 0.5),
    );
    setPickedChoice(null);
    setShowCorrect(false);
  }, [currentIdx, cards, card]);

  // При смене карточки: пересоздать варианты и озвучить термин
  useEffect(() => {
    regenerateChoices();
    speakEnglishIfPossible(speak, card.term);
  }, [currentIdx, regenerateChoices, card.term, speak]);

  /** Обработать клик по варианту ответа. */
  const handlePickChoice = (choice: string) => {
    if (pickedChoice) return; // уже выбрали — игнорируем повторные клики
    const correct = choice === card.definition;
    sendStudyAnswer(sessionId, card.id, correct);
    setPickedChoice(choice);
    setShowCorrect(true);
    // Чуть подождём, чтобы пользователь увидел подсветку, и идём дальше
    setTimeout(() => {
      const entry = correct
        ? okResult(card.id)
        : mistakeResult(card.id, card.term, card.definition, choice);
      const next = [...results, entry];
      setResults(next);
      if (currentIdx + 1 >= cards.length) onComplete(next);
      else setCurrentIdx((i) => i + 1);
    }, 1000);
  };

  /** Цвет варианта: подсветить выбранный и/или правильный. */
  const choiceStyle = (choice: string): CSSProperties => {
    if (pickedChoice === choice) {
      const correct = choice === card.definition;
      return {
        background: correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${correct ? 'var(--success)' : 'var(--danger)'}`,
        color: correct ? 'var(--success)' : 'var(--danger)',
      };
    }
    if (showCorrect && choice === card.definition) {
      return {
        background: 'rgba(16,185,129,0.15)',
        border: '1px solid var(--success)',
        color: 'var(--success)',
      };
    }
    return {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      color: 'var(--text)',
      cursor: pickedChoice ? 'default' : 'pointer',
    };
  };

  return (
    <div className='mx-auto w-full max-w-[640px]'>
      <ProgressBar idx={currentIdx} total={cards.length} />

      {/* Карточка с термином и кнопками озвучки */}
      <div className='border-border bg-surface mb-7 rounded-[20px] border p-7 text-center'>
        <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
          {t('study.learn.prompt')}
        </div>
        {card.termImageUrl && (
          <img
            src={card.termImageUrl}
            alt={card.term}
            className='mx-auto mb-4 max-h-[120px] rounded-[12px] object-cover'
          />
        )}
        <div className='font-display text-3xl font-bold'>{card.term}</div>
        {card.transcription && (
          <div className='text-text3 mt-2 text-sm'>{card.transcription}</div>
        )}
        {shouldShowSpeakButton(card.term, studyCardFrontLang(deck, card)) && (
          <div className='mt-4 flex justify-center gap-2'>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={() => speak(card.term, studyCardFrontLang(deck, card))}
            >
              {t('study.learn.listen')}
            </button>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={() =>
                speak(card.term, studyCardFrontLang(deck, card), { slow: true })
              }
            >
              {t('study.learn.listenSlow')}
            </button>
          </div>
        )}
      </div>

      {/* Варианты ответа */}
      <div className='flex flex-col gap-3'>
        {choices.map((choice) => (
          <button
            key={choice}
            type='button'
            onClick={() => handlePickChoice(choice)}
            className={choiceBtn}
            style={choiceStyle(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
