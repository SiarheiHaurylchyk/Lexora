import { type CSSProperties, type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from './ProgressBar';
import type { StudyModeProps } from './types';

import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import { buildStudyPrompts } from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

/** Привести строку к каноничному виду — сравнение без учёта регистра/пунктуации. */
function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, ' ')
    .trim();
}

/**
 * Режим обучения «Пиши».
 *
 * Сверху показано слово на одном языке, снизу поле ввода — нужно
 * напечатать перевод. После Enter подсветим зелёным/красным и через
 * паузу перейдём к следующему слову.
 */
export function SpellMode({
  rawCards,
  deck,
  sessionId,
  onComplete,
  dir,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  // Список вопросов с учётом направления — строится один раз
  const [prompts] = useState(() => buildStudyPrompts(rawCards, deck, dir));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<ReturnType<typeof okResult>[]>([]);

  const prompt = prompts[currentIdx];

  // При смене карточки: очистить поле и озвучить вопрос (если он на английском)
  useEffect(() => {
    setTypedAnswer('');
    setIsSubmitted(false);
    speakEnglishIfPossible(speak, prompt.question);
  }, [currentIdx, prompt.question, speak]);

  const isCorrect =
    normalizeAnswer(typedAnswer) === normalizeAnswer(prompt.answer);

  /** Submit формы: проверить ответ и через паузу перейти к следующему. */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!typedAnswer.trim()) return;
    sendStudyAnswer(sessionId, prompt.cardId, isCorrect);
    setIsSubmitted(true);
    setTimeout(() => {
      const entry = isCorrect
        ? okResult(prompt.cardId)
        : mistakeResult(
            prompt.cardId,
            prompt.question,
            prompt.answer,
            typedAnswer,
          );
      const next = [...results, entry];
      setResults(next);
      if (currentIdx + 1 >= prompts.length) onComplete(next);
      else setCurrentIdx((i) => i + 1);
    }, 1200);
  };

  const inputStyle: CSSProperties = isSubmitted
    ? {
        background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        borderColor: isCorrect ? 'var(--success)' : 'var(--danger)',
      }
    : {};

  return (
    <div className='mx-auto w-full max-w-[600px]'>
      <ProgressBar idx={currentIdx} total={prompts.length} />

      {/* Карточка с вопросом и кнопками озвучки */}
      <div className='border-border bg-surface mb-7 rounded-[20px] border p-7 text-center'>
        <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
          {t('study.spell.promptDir', {
            from: prompt.questionLang,
            to: prompt.answerLang,
          })}
        </div>
        {prompt.questionImageUrl && (
          <img
            src={prompt.questionImageUrl}
            alt={prompt.question}
            className='mx-auto mb-4 max-h-[120px] rounded-[12px] object-cover'
          />
        )}
        <div className='font-display text-3xl font-bold'>{prompt.question}</div>
        <div className='mt-4 flex justify-center gap-2'>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() => speak(prompt.question, prompt.questionLang)}
          >
            {t('study.spell.hear')}
          </button>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            onClick={() =>
              speak(prompt.question, prompt.questionLang, { slow: true })
            }
          >
            {t('study.spell.hearSlow')}
          </button>
        </div>
      </div>

      {/* Поле ввода с проверкой */}
      <form onSubmit={handleSubmit}>
        <input
          key={currentIdx}
          className='input-field text-center text-xl'
          value={typedAnswer}
          onChange={(e) => !isSubmitted && setTypedAnswer(e.target.value)}
          placeholder={t('study.spell.placeholder', {
            lang: prompt.answerLang,
          })}
          style={inputStyle}
          disabled={isSubmitted}
          autoFocus
        />
        {isSubmitted && !isCorrect && (
          <div className='mt-3 text-center'>
            <span className='text-text3 text-sm'>
              {t('study.spell.correctAnswer')}{' '}
            </span>
            <span className='text-success text-base font-semibold'>
              {prompt.answer}
            </span>
          </div>
        )}
        {!isSubmitted && (
          <button
            type='submit'
            className='btn btn-primary mt-4 w-full justify-center'
          >
            {t('study.spell.check')}
          </button>
        )}
      </form>
    </div>
  );
}
