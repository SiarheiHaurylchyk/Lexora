import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { StudyModeProps } from './types';

import { speakEnglishIfPossible, useSpeech } from '@/shared/hooks/useSpeech';
import {
  answersMatch,
  buildStudyPrompts,
  shuffleArray,
  type StudyPrompt,
} from '@/shared/lib/studyPrompts';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

// --- Игровые константы (можно подкручивать сложность) ---
const LIVES_AT_START = 4;
/** Высота «арены», по которой падает слово (px). */
const ARENA_HEIGHT = Math.round(380 * 1.15);
/** Зона у пола, при достижении которой считается «промах». */
const ARENA_DANGER_ZONE = Math.round(56 * 1.15);
/** Стартовая скорость падения, px/мс. */
const BASE_FALL_SPEED = 0.08;
/** На сколько ускоряется каждое верное попадание. */
const FALL_SPEED_BUMP = 0.008;
/** Потолок скорости падения. */
const MAX_FALL_SPEED = 0.2;

const choiceBtn = tw`min-h-[52px] rounded-[14px] border border-border bg-surface px-3 py-3 text-center text-[14px] font-medium leading-snug transition-all duration-150 hover:border-brand active:scale-[0.98]`;

/** Подобрать 4 варианта ответа: 1 правильный + 3 случайных. */
function buildGravityChoices(
  prompt: StudyPrompt,
  all: StudyPrompt[],
): string[] {
  const pool = all
    .filter((p) => !answersMatch(p.answer, prompt.answer))
    .map((p) => p.answer);
  const unique = [...new Set(pool)];
  const wrong = shuffleArray(unique).slice(0, 3);
  while (wrong.length < 3 && unique.length > 0)
    wrong.push(unique[wrong.length % unique.length]);
  if (wrong.length < 3)
    wrong.push(...['—', '…', '?'].slice(0, 3 - wrong.length));
  return shuffleArray([prompt.answer, ...wrong.slice(0, 3)]);
}

/**
 * Режим обучения «Гравитация».
 *
 * Слово падает сверху на «арене». У пользователя есть 4 кнопки внизу с
 * вариантами перевода — нужно успеть нажать правильный, пока слово не
 * достигло опасной зоны. Каждое попадание ускоряет следующее слово,
 * а промах съедает «жизнь» (всего LIVES_AT_START жизней).
 *
 * Игра заканчивается, когда вопросы кончились или жизни обнулились.
 */
export function GravityMode({
  rawCards,
  deck,
  sessionId,
  dir,
  onComplete,
}: StudyModeProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  const [prompts] = useState<StudyPrompt[]>(() =>
    buildStudyPrompts(rawCards, deck, dir),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<ReturnType<typeof okResult>[]>([]);
  const [lives, setLives] = useState(LIVES_AT_START);
  const [fallSpeed, setFallSpeed] = useState(BASE_FALL_SPEED);
  // Текущая высота слова в пикселях от верха арены
  const [fallY, setFallY] = useState(0);
  // Краткая визуальная обратная связь: 'ok' зелёным / 'miss' красным
  const [flash, setFlash] = useState<'ok' | 'miss' | null>(null);
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  // Случайная дорожка по горизонтали — чтобы слова не падали все по центру
  const [lanePercent, setLanePercent] = useState(50);

  const prompt = prompts[currentIdx];

  // Refs дублируют state для использования в RAF-loop без замыканий на старое значение
  const isResolvingRef = useRef(false);
  const fallYRef = useRef(0);
  const speedRef = useRef(BASE_FALL_SPEED);
  const idxRef = useRef(0);

  // 4 варианта ответа для текущего слова
  const choices = useMemo(
    () => (prompt ? buildGravityChoices(prompt, prompts) : []),
    [prompt, prompts],
  );

  // Синхронизация state → ref для RAF
  useEffect(() => {
    idxRef.current = currentIdx;
  }, [currentIdx]);
  useEffect(() => {
    speedRef.current = fallSpeed;
  }, [fallSpeed]);
  useEffect(() => {
    fallYRef.current = fallY;
  }, [fallY]);

  /** Перейти к следующему слову (или завершить, если оно было последним). */
  const advanceToNext = useCallback(
    (correct: boolean) => {
      if (!prompt || isResolvingRef.current) return;
      isResolvingRef.current = true;
      sendStudyAnswer(sessionId, prompt.cardId, correct);
      const nextResults = [
        ...results,
        correct
          ? okResult(prompt.cardId)
          : mistakeResult(prompt.cardId, prompt.question, prompt.answer),
      ];
      setResults(nextResults);
      if (idxRef.current + 1 >= prompts.length) {
        setIsGameOver(true);
        setTimeout(() => onComplete(nextResults), 600);
        return;
      }
      // Пауза перед следующим словом — чуть короче, если ответ верный
      setTimeout(
        () => {
          setCurrentIdx((i) => i + 1);
          setFallY(0);
          fallYRef.current = 0;
          setFlash(null);
          setPickedChoice(null);
          setLanePercent(42 + Math.random() * 36);
          isResolvingRef.current = false;
          if (correct)
            setFallSpeed((s) => Math.min(MAX_FALL_SPEED, s + FALL_SPEED_BUMP));
        },
        correct ? 400 : 650,
      );
    },
    [prompt, results, sessionId, prompts.length, onComplete],
  );

  /** Слово достигло опасной зоны — теряем жизнь, идём дальше. */
  const handleMiss = useCallback(() => {
    if (isResolvingRef.current || !prompt || isGameOver) return;
    isResolvingRef.current = true;
    setFlash('miss');
    sendStudyAnswer(sessionId, prompt.cardId, false);
    const nextResults = [
      ...results,
      mistakeResult(prompt.cardId, prompt.question, prompt.answer),
    ];
    setResults(nextResults);
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) {
        setIsGameOver(true);
        setTimeout(() => onComplete(nextResults), 800);
        return 0;
      }
      setTimeout(() => {
        setCurrentIdx((i) => i + 1);
        setFallY(0);
        fallYRef.current = 0;
        setFlash(null);
        setPickedChoice(null);
        setLanePercent(42 + Math.random() * 36);
        isResolvingRef.current = false;
      }, 650);
      return next;
    });
  }, [isGameOver, onComplete, prompt, results, sessionId]);

  // Сброс состояния перед началом нового слова + озвучка
  useEffect(() => {
    if (!prompt || isGameOver) return;
    setFallY(0);
    fallYRef.current = 0;
    setFlash(null);
    setPickedChoice(null);
    isResolvingRef.current = false;
    setLanePercent(42 + Math.random() * 36);
    speakEnglishIfPossible(speak, prompt.question);
  }, [currentIdx, prompt, isGameOver, speak]);

  // Главный цикл: каждое обновление кадра двигаем слово вниз
  useEffect(() => {
    if (!prompt || isGameOver) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      if (!isResolvingRef.current) {
        const nextY = fallYRef.current + speedRef.current * dt;
        const limit = ARENA_HEIGHT - ARENA_DANGER_ZONE;
        if (nextY >= limit) {
          fallYRef.current = limit;
          setFallY(limit);
          handleMiss();
        } else {
          fallYRef.current = nextY;
          setFallY(nextY);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentIdx, prompt, isGameOver, handleMiss]);

  /** Клик по варианту перевода. */
  const handlePickChoice = (choice: string) => {
    if (!prompt || isResolvingRef.current || isGameOver) return;
    setPickedChoice(choice);
    if (answersMatch(choice, prompt.answer)) {
      setFlash('ok');
      speakEnglishIfPossible(speak, prompt.answer);
      advanceToNext(true);
    } else {
      // Неверный выбор: показать красный flash, дать ещё попробовать
      setFlash('miss');
      setTimeout(() => {
        if (!isResolvingRef.current) {
          setFlash(null);
          setPickedChoice(null);
        }
      }, 500);
    }
  };

  /** Стили варианта: подсветить выбранный (зелёный/красный), остальные — обычные. */
  const choiceStyle = (choice: string): CSSProperties => {
    if (!pickedChoice || pickedChoice !== choice)
      return { cursor: flash !== null ? 'default' : 'pointer' };
    const correct = answersMatch(choice, prompt?.answer ?? '');
    return {
      background: correct ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)',
      borderColor: correct ? 'var(--success)' : 'var(--danger)',
      color: correct ? 'var(--success)' : 'var(--danger)',
      cursor: 'default',
    };
  };

  if (prompts.length === 0) {
    return (
      <div className='text-text2 mx-auto max-w-md py-16 text-center'>
        {t('study.gravity.noCards')}
      </div>
    );
  }

  // Цвет фона арены: подсветить успех / промах / нейтральный
  const arenaStyle: CSSProperties = {
    height: ARENA_HEIGHT,
    background:
      flash === 'ok'
        ? 'linear-gradient(180deg, rgba(16,185,129,0.08) 0%, var(--bg) 40%)'
        : flash === 'miss'
          ? 'linear-gradient(180deg, rgba(239,68,68,0.1) 0%, var(--bg) 40%)'
          : 'linear-gradient(180deg, rgba(124,58,237,0.06) 0%, var(--bg) 50%)',
  };

  return (
    <div className='mx-auto w-full max-w-[720px]'>
      {/* Шапка: счётчик слов и жизней */}
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-4'>
          <span className='text-text2 text-sm font-semibold'>
            {Math.min(currentIdx + 1, prompts.length)} / {prompts.length}
          </span>
          <span className='text-sm'>
            {t('study.gravity.lives')}{' '}
            <span className='text-danger font-bold'>{'❤'.repeat(lives)}</span>
          </span>
        </div>
        <span className='text-text3 text-xs'>
          {t('study.gravity.speed', { level: Math.round(fallSpeed * 100) })}
        </span>
      </div>

      <p className='text-text3 mb-3 text-center text-sm'>
        {t('study.gravity.hintTap')}
      </p>

      {/* Арена с падающим словом */}
      <div
        className='border-border relative mb-4 overflow-hidden rounded-[20px] border'
        style={arenaStyle}
      >
        <div
          className='border-danger/40 absolute right-0 bottom-0 left-0 z-0 border-t-2 border-dashed bg-[rgba(239,68,68,0.08)]'
          style={{ height: ARENA_DANGER_ZONE }}
        />
        <div
          className={cn(
            'absolute z-10 max-w-[90%] rounded-2xl border px-4 py-3 text-center shadow-lg transition-colors',
            flash === 'ok' && 'border-success bg-success/20',
            flash === 'miss' && 'border-danger bg-danger/15',
            !flash && 'border-brand bg-surface',
          )}
          style={{
            top: fallY,
            left: `${lanePercent}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className='font-display text-xl font-bold'>
            {prompt?.question}
          </span>
        </div>
      </div>

      {/* Кнопки-варианты ответа */}
      <div className='grid grid-cols-2 gap-2.5'>
        {choices.map((choice) => (
          <button
            key={choice}
            type='button'
            className={choiceBtn}
            style={choiceStyle(choice)}
            disabled={isGameOver || flash !== null}
            onClick={() => handlePickChoice(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
