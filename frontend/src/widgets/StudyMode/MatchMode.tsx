import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StudyModeProps } from './types';

import type { CardItem } from '@/shared/api/types';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

/** Сколько пар «термин ↔ перевод» показываем за один раунд. */
const ROUND_BATCH_SIZE = 8;

/** Какую сторону карточки кликнул пользователь. */
type Side = 'term' | 'def';

interface MatchRoundProps {
  cards: CardItem[];
  sessionId: number | null;
  roundIdx: number;
  totalRounds: number;
  onComplete: (results: ReturnType<typeof okResult>[]) => void;
}

/**
 * Один раунд режима «Сопоставление».
 *
 * На экране две колонки: слева — термины в исходном порядке, справа —
 * перемешанные переводы. Пользователь кликом соединяет пары.
 * Когда все пары собраны — раунд считается пройденным.
 */
function MatchRound({
  cards,
  sessionId,
  roundIdx,
  totalRounds,
  onComplete,
}: MatchRoundProps) {
  const { t } = useTranslation();

  // Найденные верные пары (ключ — `pair${termIdx}`)
  const [matchedKeys, setMatchedKeys] = useState<Set<string>>(new Set());
  // Текущий выбранный элемент (одна из колонок), если есть
  const [selected, setSelected] = useState<{
    side: Side;
    idx: number;
  } | null>(null);
  // Подсветка двух элементов красным после неверной попытки
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  // Все индексы карточек, которые хоть раз промахнулись (для статистики)
  const [missedCardIdxs, setMissedCardIdxs] = useState<Set<number>>(new Set());

  // Левый столбец: термины в исходном порядке
  const terms = cards.map((c, i) => ({ text: c.term, idx: i }));

  // Правый столбец: переводы перемешаны (создаём один раз при монтировании)
  const [shuffledDefs] = useState(() =>
    [...cards]
      .sort(() => Math.random() - 0.5)
      .map((c) => ({ text: c.definition, originalIdx: cards.indexOf(c) })),
  );

  /** Завершить раунд и собрать результат для каждой карточки. */
  const finishRound = (allMissed: Set<number>) => {
    const finalResults = cards.map((c, i) => {
      const correct = !allMissed.has(i);
      sendStudyAnswer(sessionId, c.id, correct);
      return correct
        ? okResult(c.id)
        : mistakeResult(c.id, c.term, c.definition);
    });
    onComplete(finalResults);
  };

  /** Обработать клик по элементу одной из колонок. */
  const handleSelect = (side: Side, idx: number, originalIdx?: number) => {
    // Этот элемент уже сопоставлен — игнорируем
    const cardIdxOfClick = side === 'term' ? idx : originalIdx!;
    if (matchedKeys.has(`pair${cardIdxOfClick}`)) return;

    // Первый клик в паре — просто запоминаем выбор
    if (!selected) {
      setSelected({ side, idx });
      return;
    }
    // Кликнули в той же колонке — обновляем выбор
    if (selected.side === side) {
      setSelected({ side, idx });
      return;
    }

    const termIdx = side === 'term' ? idx : selected.idx;
    const defOriginalIdx =
      side === 'def' ? originalIdx! : shuffledDefs[selected.idx].originalIdx;
    const isMatch = termIdx === defOriginalIdx;

    if (isMatch) {
      // Верно — отмечаем пару зелёной и проверяем, не закончился ли раунд
      const next = new Set(matchedKeys);
      next.add(`pair${termIdx}`);
      setMatchedKeys(next);
      setSelected(null);
      if (next.size === cards.length) {
        setTimeout(() => finishRound(missedCardIdxs), 500);
      }
    } else {
      // Ошибка — подсветить оба элемента красным на короткое время
      setMissedCardIdxs((prev) => new Set([...prev, termIdx, defOriginalIdx]));
      const wrongA =
        selected.side === 'term' ? `t${selected.idx}` : `d${selected.idx}`;
      const wrongB = side === 'term' ? `t${idx}` : `d${idx}`;
      setWrongIds(new Set([wrongA, wrongB]));
      setTimeout(() => {
        setWrongIds(new Set());
        setSelected(null);
      }, 800);
    }
  };

  /** Стили карточки в колонке: выбрана / правильная / неправильная / обычная. */
  const getCardStyle = (
    isSelected: boolean,
    isMatched: boolean,
    isWrong: boolean,
  ): CSSProperties => ({
    background: isMatched
      ? 'rgba(16,185,129,0.15)'
      : isWrong
        ? 'rgba(239,68,68,0.1)'
        : isSelected
          ? 'rgba(124,58,237,0.2)'
          : 'var(--surface)',
    border: `1px solid ${isMatched ? 'var(--success)' : isWrong ? 'var(--danger)' : isSelected ? 'var(--brand)' : 'var(--border)'}`,
    color: isMatched
      ? 'var(--success)'
      : isWrong
        ? 'var(--danger)'
        : 'var(--text)',
    cursor: isMatched ? 'default' : 'pointer',
    opacity: isMatched ? 0.6 : 1,
    textDecoration: isMatched ? 'line-through' : 'none',
  });

  // Маленькие предикаты — чтобы JSX оставался лёгким для чтения
  const isTermSelected = (i: number) =>
    selected?.side === 'term' && selected.idx === i;
  const isDefSelected = (i: number) =>
    selected?.side === 'def' && selected.idx === i;
  const isTermMatched = (i: number) => matchedKeys.has(`pair${i}`);
  const isDefMatched = (i: number) =>
    matchedKeys.has(`pair${shuffledDefs[i].originalIdx}`);
  const isTermWrong = (i: number) => wrongIds.has(`t${i}`);
  const isDefWrong = (i: number) => wrongIds.has(`d${i}`);

  return (
    <div className='mx-auto w-full max-w-[800px]'>
      {/* Заголовок раунда + счётчики */}
      <div className='mb-6 text-center'>
        <h2 className='font-display mb-2 text-2xl'>{t('study.match.title')}</h2>
        <p className='text-text2 mb-3 text-sm'>{t('study.match.subtitle')}</p>
        <div className='flex items-center justify-center gap-4 text-sm font-semibold'>
          <span className='text-brand-light'>
            {t('study.match.progress', {
              matched: matchedKeys.size,
              total: cards.length,
            })}
          </span>
          {totalRounds > 1 && (
            <span className='text-text3'>
              {t('study.match.round', {
                current: roundIdx + 1,
                total: totalRounds,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Две колонки: термины слева, переводы справа */}
      <div className='grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
        <div className='flex flex-col gap-2.5'>
          {terms.map((term, i) => (
            <div
              key={i}
              className='rounded-[14px] px-4 py-3.5 text-center font-medium transition-all duration-200'
              style={getCardStyle(
                isTermSelected(i),
                isTermMatched(i),
                isTermWrong(i),
              )}
              onClick={() => !isTermMatched(i) && handleSelect('term', i)}
            >
              {term.text}
            </div>
          ))}
        </div>
        <div className='flex flex-col gap-2.5'>
          {shuffledDefs.map((def, i) => (
            <div
              key={i}
              className='rounded-[14px] px-4 py-3.5 text-center font-medium transition-all duration-200'
              style={getCardStyle(
                isDefSelected(i),
                isDefMatched(i),
                isDefWrong(i),
              )}
              onClick={() =>
                !isDefMatched(i) && handleSelect('def', i, def.originalIdx)
              }
            >
              {def.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Режим обучения «Сопоставление».
 *
 * Если карточек больше ROUND_BATCH_SIZE — играем по раундам, по 8 пар.
 * Когда все раунды пройдены — собираем общий список результатов и
 * вызываем `onComplete`.
 */
export function MatchMode({ cards, sessionId, onComplete }: StudyModeProps) {
  const totalRounds = Math.ceil(cards.length / ROUND_BATCH_SIZE);
  const [roundIdx, setRoundIdx] = useState(0);
  const [allResults, setAllResults] = useState<ReturnType<typeof okResult>[]>(
    [],
  );

  // Карточки текущего раунда
  const batchCards = useMemo(
    () =>
      cards.slice(
        roundIdx * ROUND_BATCH_SIZE,
        (roundIdx + 1) * ROUND_BATCH_SIZE,
      ),
    [cards, roundIdx],
  );

  return (
    <MatchRound
      key={roundIdx}
      cards={batchCards}
      sessionId={sessionId}
      roundIdx={roundIdx}
      totalRounds={totalRounds}
      onComplete={(roundResults) => {
        const newAll = [...allResults, ...roundResults];
        if (roundIdx + 1 >= totalRounds) onComplete(newAll);
        else {
          setAllResults(newAll);
          setRoundIdx((r) => r + 1);
        }
      }}
    />
  );
}
