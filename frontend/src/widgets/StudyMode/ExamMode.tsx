import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StudyModeProps } from './types';

import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import {
  answersMatch,
  buildExamQuestions,
  EXAM_MIN_QUESTIONS,
} from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

const choiceBtn = tw`min-h-[52px] rounded-[14px] border border-border bg-surface px-3 py-3 text-center text-[14px] font-medium leading-snug transition-all duration-150 hover:border-brand active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * Режим обучения «Экзамен».
 *
 * Случайно чередует «выбор из 4 вариантов» и «введите слово».
 * Подсветка правильного/неправильного ответа в процессе намеренно
 * отключена — это экзамен. Итог пользователь увидит на экране результатов.
 *
 * Если в колоде слишком мало карточек (< EXAM_MIN_QUESTIONS) — показываем
 * заглушку, а в строке результата ничего не будет.
 */
export function ExamMode({
  rawCards,
  deck,
  sessionId,
  dir,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  // Список вопросов экзамена (рандом, не более 15) — строится один раз
  const [questions] = useState(() => buildExamQuestions(rawCards, deck, dir));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<ReturnType<typeof okResult>[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  // Идёт переход к следующему вопросу — блокируем ввод и кнопки
  const [isAdvancing, setIsAdvancing] = useState(false);

  const question = questions[currentIdx];
  const total = questions.length;
  const isLastQuestion = currentIdx + 1 >= total;

  // При смене вопроса: очистить поле и озвучить
  useEffect(() => {
    if (!question) return;
    setTypedAnswer('');
    setIsAdvancing(false);
    speakEnglishIfPossible(speak, question.question);
  }, [currentIdx, question, speak]);

  /** Записать ответ и через короткую паузу перейти дальше или закончить. */
  const goToNextQuestion = (correct: boolean, given?: string) => {
    if (!question || isAdvancing) return;
    setIsAdvancing(true);
    sendStudyAnswer(sessionId, question.cardId, correct);
    const entry = correct
      ? okResult(question.cardId)
      : mistakeResult(
          question.cardId,
          question.question,
          question.answer,
          given,
        );
    const next = [...results, entry];
    setResults(next);
    setTimeout(() => {
      if (isLastQuestion) onComplete(next);
      else setCurrentIdx((i) => i + 1);
    }, 280);
  };

  // Слишком мало карточек для экзамена
  if (questions.length < EXAM_MIN_QUESTIONS) {
    return (
      <div className='text-text2 mx-auto max-w-md py-16 text-center'>
        {t('study.exam.tooFew', { min: EXAM_MIN_QUESTIONS })}
      </div>
    );
  }

  const progressPercent = ((currentIdx + (isAdvancing ? 1 : 0)) / total) * 100;

  return (
    <div className='mx-auto w-full max-w-[640px]'>
      {/* Прогресс */}
      <div className='mb-5 flex items-center gap-3'>
        <span className='text-text2 min-w-[72px] text-sm font-semibold'>
          {t('study.exam.progress', { current: currentIdx + 1, total })}
        </span>
        <div className='progress-bar flex-1'>
          <div
            className='progress-fill'
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <p className='text-text3 mb-5 text-center text-sm'>
        {t('study.exam.hint')}
      </p>

      {/* Карточка вопроса */}
      <div className='border-border bg-surface mb-6 rounded-[20px] border p-7 text-center'>
        <div className='text-text3 mb-3 text-xs tracking-[0.08em] uppercase'>
          {question.type === 'choice'
            ? t('study.exam.choicePrompt')
            : t('study.exam.typePrompt')}
        </div>
        <div className='text-text3 mb-2 text-xs'>
          {t('study.spell.promptDir', {
            from: question.questionLang,
            to: question.answerLang,
          })}
        </div>
        {question.questionImageUrl && (
          <img
            src={question.questionImageUrl}
            alt={question.question}
            className='mx-auto mb-4 max-h-[120px] rounded-[12px] object-cover'
          />
        )}
        <div className='font-display text-3xl font-bold'>
          {question.question}
        </div>
      </div>

      {question.type === 'choice' ? (
        // Множественный выбор: 4 варианта
        <div className='grid grid-cols-2 gap-2.5'>
          {question.choices.map((opt) => (
            <button
              key={opt}
              type='button'
              className={choiceBtn}
              disabled={isAdvancing}
              onClick={() =>
                goToNextQuestion(answersMatch(opt, question.answer), opt)
              }
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        // Ввод текста
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!isAdvancing && typedAnswer.trim())
              goToNextQuestion(
                answersMatch(typedAnswer, question.answer),
                typedAnswer,
              );
          }}
        >
          <input
            key={currentIdx}
            className='input-field text-center text-xl'
            value={typedAnswer}
            onChange={(e) => !isAdvancing && setTypedAnswer(e.target.value)}
            placeholder={t('study.exam.placeholder', {
              lang: question.answerLang,
            })}
            disabled={isAdvancing}
            autoFocus
          />
          <button
            type='submit'
            className='btn btn-primary mt-4 w-full justify-center'
            disabled={isAdvancing || !typedAnswer.trim()}
          >
            {isLastQuestion ? t('study.exam.finish') : t('study.exam.next')}
          </button>
        </form>
      )}
    </div>
  );
}
