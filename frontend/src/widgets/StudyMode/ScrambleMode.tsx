import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from './ProgressBar';
import type { StudyModeProps } from './types';

import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import {
  answersMatch,
  buildScrambleLetters,
  buildStudyPrompts,
  isScrambleFriendly,
  type StudyPrompt,
} from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

const tileBase = tw`flex h-11 min-w-[2.75rem] cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-3 text-lg font-semibold transition-all duration-150 hover:border-brand hover:bg-brand-dim active:scale-95`;
const builtSlot = tw`flex h-12 min-w-[2.75rem] items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg3 text-xl font-bold`;

/**
 * Режим обучения «Сборка слова».
 *
 * Из перемешанных букв в банке нужно собрать правильный ответ. Слишком
 * длинные/короткие/без букв ответы исключаются (см. isScrambleFriendly).
 */
export function ScrambleMode({
  rawCards,
  deck,
  sessionId,
  dir,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  // Только подходящие карточки. Строим один раз и больше не трогаем.
  const [prompts] = useState<StudyPrompt[]>(() =>
    buildStudyPrompts(rawCards, deck, dir).filter((p) =>
      isScrambleFriendly(p.answer),
    ),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<ReturnType<typeof okResult>[]>([]);
  // ID букв в порядке постановки на «полку ответа»
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  // Перемешанный набор букв-плиток
  const [letterBank, setLetterBank] = useState(() =>
    prompts[0] ? buildScrambleLetters(prompts[0].answer) : [],
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const prompt = prompts[currentIdx];

  /** Текст, собранный пользователем на «полке ответа». */
  const builtAnswer = useMemo(() => {
    const idToChar = new Map(letterBank.map((l) => [l.id, l.char]));
    return builtIds.map((id) => idToChar.get(id) ?? '').join('');
  }, [builtIds, letterBank]);

  // При смене карточки: пересоздаём банк букв, очищаем «полку» и озвучиваем
  useEffect(() => {
    if (!prompt) return;
    setBuiltIds([]);
    setLetterBank(buildScrambleLetters(prompt.answer));
    setIsSubmitted(false);
    speakEnglishIfPossible(speak, prompt.question);
  }, [currentIdx, prompt, speak]);

  // Граничные случаи: нет ни одной подходящей карточки или закончились
  if (prompts.length === 0) {
    return (
      <div className='text-text2 mx-auto max-w-md py-16 text-center'>
        {t('study.scramble.noEligible')}
      </div>
    );
  }
  if (!prompt) {
    onComplete(results);
    return null;
  }

  /** Поставить букву на «полку ответа». */
  const pickLetter = (id: string) => {
    if (isSubmitted || builtIds.includes(id)) return;
    setBuiltIds((prev) => [...prev, id]);
  };

  /** Снять букву с «полки» по позиции (клик по слоту). */
  const removeLetterAt = (slotIdx: number) => {
    if (isSubmitted) return;
    setBuiltIds((prev) => prev.filter((_, i) => i !== slotIdx));
  };

  /** Сбросить и пересоздать перемешанный банк букв. */
  const resetBuild = () => {
    if (isSubmitted) return;
    setBuiltIds([]);
    setLetterBank(buildScrambleLetters(prompt.answer));
  };

  /** Проверить ответ: подсветить, через паузу перейти к следующей карточке. */
  const checkAnswer = () => {
    if (isSubmitted || builtIds.length === 0) return;
    const correct = answersMatch(builtAnswer, prompt.answer);
    setWasCorrect(correct);
    setIsSubmitted(true);
    sendStudyAnswer(sessionId, prompt.cardId, correct);
    if (correct) speakEnglishIfPossible(speak, prompt.answer);
    setTimeout(() => {
      const entry = correct
        ? okResult(prompt.cardId)
        : mistakeResult(
            prompt.cardId,
            prompt.question,
            prompt.answer,
            builtAnswer,
          );
      const next = [...results, entry];
      setResults(next);
      if (currentIdx + 1 >= prompts.length) onComplete(next);
      else setCurrentIdx((i) => i + 1);
    }, 1100);
  };

  // Целевое количество букв в ответе (без пробелов)
  const answerLength = prompt.answer.replace(/\s+/g, '').length;

  /** Стили слота на «полке»: пустой / заполнен / результат. */
  const slotStyle = (filled: boolean): CSSProperties =>
    isSubmitted
      ? {
          borderColor: wasCorrect ? 'var(--success)' : 'var(--danger)',
          background: wasCorrect
            ? 'rgba(16,185,129,0.12)'
            : 'rgba(239,68,68,0.12)',
        }
      : filled
        ? { borderStyle: 'solid', borderColor: 'var(--brand)' }
        : {};

  return (
    <div className='mx-auto w-full max-w-[640px]'>
      <ProgressBar idx={currentIdx} total={prompts.length} />

      {/* Слово-вопрос */}
      <div className='border-border bg-surface mb-6 rounded-[20px] border p-7 text-center'>
        <div className='text-text3 mb-2 text-xs tracking-[0.08em] uppercase'>
          {t('study.scramble.prompt', {
            from: prompt.questionLang,
            to: prompt.answerLang,
          })}
        </div>
        <div className='font-display text-3xl font-bold'>{prompt.question}</div>
      </div>

      <p className='text-text3 mb-3 text-center text-sm'>
        {t('study.scramble.hint')}
      </p>

      {/* Полка с собранным ответом (слоты по числу букв) */}
      <div className='mb-5 flex min-h-[3.5rem] flex-wrap justify-center gap-2'>
        {Array.from({ length: answerLength }).map((_, slotIdx) => {
          const letterId = builtIds[slotIdx];
          const letter = letterId
            ? letterBank.find((l) => l.id === letterId)?.char
            : null;
          return (
            <button
              key={slotIdx}
              type='button'
              className={builtSlot}
              style={slotStyle(Boolean(letter))}
              onClick={() => removeLetterAt(slotIdx)}
              disabled={!letter || isSubmitted}
            >
              {letter ?? ''}
            </button>
          );
        })}
      </div>

      {/* Банк перемешанных букв */}
      <div className='mb-6 flex flex-wrap justify-center gap-2'>
        {letterBank.map((tile) => {
          const isUsed = builtIds.includes(tile.id);
          return (
            <button
              key={tile.id}
              type='button'
              className={cn(
                tileBase,
                isUsed && 'pointer-events-none opacity-25',
              )}
              onClick={() => pickLetter(tile.id)}
              disabled={isUsed || isSubmitted}
            >
              {tile.char}
            </button>
          );
        })}
      </div>

      {isSubmitted && !wasCorrect && (
        <p className='text-text2 mb-4 text-center text-sm'>
          {t('study.scramble.correct')}{' '}
          <span className='text-success font-semibold'>{prompt.answer}</span>
        </p>
      )}

      <div className='flex justify-center gap-3'>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={resetBuild}
          disabled={isSubmitted}
        >
          {t('study.scramble.reset')}
        </button>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={checkAnswer}
          disabled={isSubmitted || builtIds.length < answerLength}
        >
          {t('study.scramble.check')}
        </button>
      </div>
    </div>
  );
}
