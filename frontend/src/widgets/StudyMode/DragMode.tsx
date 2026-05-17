import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StudyModeProps } from './types';

import type { CardItem } from '@/shared/api/types';
import {
  isEnglishSpeakable,
  speakEnglishIfPossible,
  useSpeech,
} from '@/shared/hooks/useSpeech';
import { mistakeResult, okResult } from '@/shared/lib/studyResults';
import { sendStudyAnswer } from '@/shared/lib/studySession';

/** Сколько пар «термин ↔ перевод» показываем за один раунд. */
const ROUND_BATCH_SIZE = 6;

/** Один кликабельный/перетаскиваемый «бейджик» на доске. */
interface DragItem {
  id: string;
  /** Индекс карточки, из которой получен этот бейджик. */
  cardIdx: number;
  /** Сам текст (term или definition). */
  text: string;
  /** К какой стороне карточки принадлежит. */
  side: 'term' | 'def';
}

/** Если хоть одна сторона карточки на английском — вернёт её для озвучки. */
function pickEnglishTextFromCard(card: CardItem): string | null {
  if (isEnglishSpeakable(card.term)) return card.term;
  if (isEnglishSpeakable(card.definition)) return card.definition;
  return null;
}

interface DragRoundProps extends StudyModeProps {
  roundIdx: number;
  totalRounds: number;
}

/**
 * Один раунд режима «Перетаскивание».
 *
 * На доске — все термины и переводы из текущей пачки карточек,
 * перемешанные. Пользователь соединяет пары двумя способами:
 *  - кликом по двум бейджикам;
 *  - перетаскиванием одного на другой.
 */
function DragRound({
  cards,
  deck,
  dir,
  sessionId,
  roundIdx,
  totalRounds,
  onComplete,
}: DragRoundProps) {
  const { t } = useTranslation();
  const { speak } = useSpeech();

  // Языки для подсказки в шапке (учитываем направление обучения)
  const termLang =
    dir === 'reverse' ? deck.targetLanguage : deck.sourceLanguage;
  const defLang = dir === 'reverse' ? deck.sourceLanguage : deck.targetLanguage;

  // Все бейджики раунда: термины + переводы, перемешаны (создаём один раз)
  const [items] = useState<DragItem[]>(() => {
    const all: DragItem[] = [
      ...cards.map((c, i) => ({
        id: `t${roundIdx}_${i}`,
        cardIdx: i,
        text: c.term,
        side: 'term' as const,
      })),
      ...cards.map((c, i) => ({
        id: `d${roundIdx}_${i}`,
        cardIdx: i,
        text: c.definition,
        side: 'def' as const,
      })),
    ];
    return all.sort(() => Math.random() - 0.5);
  });

  // Индексы карточек, у которых пара уже найдена
  const [matchedCardIdxs, setMatchedCardIdxs] = useState<Set<number>>(
    new Set(),
  );
  // Текущий выбранный элемент (для клика-выбора)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // Подсветка двух элементов красным при ошибке
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  // Индексы карточек, которые промахнулись хоть раз (для итогов)
  const [missedCardIdxs, setMissedCardIdxs] = useState<Set<number>>(new Set());
  // Drag-and-drop состояние
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [ghostText, setGhostText] = useState('');
  const [hoveredDropId, setHoveredDropId] = useState<string | null>(null);

  /** Завершить раунд: посчитать результаты и сообщить родителю. */
  const finishRound = () => {
    const results = cards.map((c, i) => {
      const correct = !missedCardIdxs.has(i);
      return correct
        ? okResult(c.id)
        : mistakeResult(c.id, c.term, c.definition);
    });
    onComplete(results);
  };

  /** Попробовать соединить два бейджика — если совпали, проиграть звук. */
  const tryMatch = (idA: string, idB: string) => {
    const a = items.find((x) => x.id === idA);
    const b = items.find((x) => x.id === idB);
    // Невозможно соединить: одинаковые стороны / уже соединены
    if (
      !a ||
      !b ||
      a.side === b.side ||
      matchedCardIdxs.has(a.cardIdx) ||
      matchedCardIdxs.has(b.cardIdx)
    )
      return;

    if (a.cardIdx === b.cardIdx) {
      // Верно — добавляем в matched, озвучиваем английскую сторону
      const next = new Set(matchedCardIdxs);
      next.add(a.cardIdx);
      setMatchedCardIdxs(next);
      setSelectedItemId(null);
      setHoveredDropId(null);
      const english = pickEnglishTextFromCard(cards[a.cardIdx]);
      if (english) speakEnglishIfPossible(speak, english);

      const correct = !missedCardIdxs.has(a.cardIdx);
      sendStudyAnswer(sessionId, cards[a.cardIdx].id, correct);

      if (next.size === cards.length) {
        setTimeout(finishRound, 600);
      }
    } else {
      // Ошибка — подсветка красным, фиксируем промах в обеих карточках
      setWrongPair([idA, idB]);
      setMissedCardIdxs((prev) => new Set([...prev, a.cardIdx, b.cardIdx]));
      setSelectedItemId(null);
      setTimeout(() => setWrongPair(null), 700);
    }
  };

  /** Клик-выбор: отмечаем бейджик, второй клик пробует соединить. */
  const handleClick = (id: string) => {
    if (draggingItemId) return; // пока пользователь тащит — клики не считаем
    const item = items.find((x) => x.id === id);
    if (!item || matchedCardIdxs.has(item.cardIdx)) return;

    if (!selectedItemId) {
      setSelectedItemId(id);
      return;
    }
    if (selectedItemId === id) {
      // Повторный клик по тому же — снять выделение
      setSelectedItemId(null);
      return;
    }
    const prev = items.find((x) => x.id === selectedItemId);
    // Кликнули на ту же сторону, что и раньше — просто сменить выбор
    if (prev && item.side === prev.side) {
      setSelectedItemId(id);
      return;
    }
    tryMatch(selectedItemId, id);
  };

  /** Начало перетаскивания: захватываем поинтер и показываем «призрак». */
  const handlePointerDown = (
    id: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    const item = items.find((x) => x.id === id);
    if (!item || matchedCardIdxs.has(item.cardIdx)) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDraggingItemId(id);
    setGhostText(item.text);
    setGhostPos({ x: e.clientX, y: e.clientY });
    setSelectedItemId(null);
  };

  /** Движение указателя: обновляем позицию «призрака» и подсвечиваем drop-target. */
  const handlePointerMove = (
    id: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (draggingItemId !== id) return;
    setGhostPos({ x: e.clientX, y: e.clientY });
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    let foundDropId: string | null = null;
    for (const el of els) {
      const targetId = (el as HTMLElement).dataset?.dragItemId;
      if (targetId && targetId !== id) {
        foundDropId = targetId;
        break;
      }
    }
    setHoveredDropId(foundDropId);
  };

  /** Отпустили поинтер: пробуем соединить с целью под указателем. */
  const handlePointerUp = (
    id: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (draggingItemId !== id) return;
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    let dropTargetId: string | null = null;
    for (const el of els) {
      const targetId = (el as HTMLElement).dataset?.dragItemId;
      if (targetId && targetId !== id) {
        dropTargetId = targetId;
        break;
      }
    }
    setDraggingItemId(null);
    setHoveredDropId(null);
    if (dropTargetId) tryMatch(id, dropTargetId);
    else setSelectedItemId(id);
  };

  /** Стили бейджика: разные для matched/wrong/dragging/selected/обычного. */
  const getPillStyle = (item: DragItem): CSSProperties => {
    const isMatched = matchedCardIdxs.has(item.cardIdx);
    const isSelected = selectedItemId === item.id;
    const isWrong = wrongPair?.includes(item.id) ?? false;
    const isDragging = draggingItemId === item.id;
    const isHovered = hoveredDropId === item.id;
    // Цвет зависит от стороны: термины — фиолетовые, переводы — голубые
    const brandRgb = item.side === 'term' ? '124,58,237' : '6,182,212';

    if (isMatched)
      return {
        background: 'rgba(16,185,129,0.12)',
        border: '1px solid var(--success)',
        color: 'var(--success)',
        opacity: 0.45,
        cursor: 'default',
        textDecoration: 'line-through',
      };
    if (isWrong)
      return {
        background: 'rgba(239,68,68,0.18)',
        border: '2px solid var(--danger)',
        color: 'var(--danger)',
        cursor: 'pointer',
      };
    if (isDragging)
      return {
        opacity: 0.25,
        cursor: 'grabbing',
        border: '1px dashed var(--border)',
        background: 'transparent',
      };
    if (isSelected || isHovered)
      return {
        background: `rgba(${brandRgb},0.22)`,
        border: `2px solid rgba(${brandRgb},0.9)`,
        color: 'var(--text)',
        cursor: 'pointer',
        transform: 'scale(1.04)',
        boxShadow: `0 0 12px rgba(${brandRgb},0.35)`,
      };
    return {
      background: `rgba(${brandRgb},0.08)`,
      border: `1px solid rgba(${brandRgb},0.3)`,
      color: 'var(--text)',
      cursor: 'grab',
    };
  };

  return (
    <div className='mx-auto w-full max-w-[820px]'>
      {/* Заголовок и легенда (что какой цвет означает) */}
      <div className='mb-5 text-center'>
        <h2 className='font-display mb-1 text-2xl'>{t('study.drag.title')}</h2>
        <p className='text-text3 mb-2 text-sm'>{t('study.drag.subtitle')}</p>
        <div className='mb-1 flex items-center justify-center gap-4 text-[13px]'>
          <span className='flex items-center gap-1.5'>
            <span
              className='inline-block h-2.5 w-2.5 rounded-full'
              style={{ background: 'rgba(124,58,237,0.7)' }}
            />
            <span className='text-text2'>
              {dir === 'mixed' ? t('deck.direction.mixed') : termLang}
            </span>
          </span>
          <span className='flex items-center gap-1.5'>
            <span
              className='inline-block h-2.5 w-2.5 rounded-full'
              style={{ background: 'rgba(6,182,212,0.7)' }}
            />
            <span className='text-text2'>
              {dir === 'mixed' ? '↔' : defLang}
            </span>
          </span>
        </div>
        <div className='flex items-center justify-center gap-3 text-sm font-semibold'>
          <span className='text-brand-light'>
            {t('study.drag.progress', {
              matched: matchedCardIdxs.size,
              total: cards.length,
            })}
          </span>
          {totalRounds > 1 && (
            <span className='text-text3'>
              {t('study.drag.round', {
                current: roundIdx + 1,
                total: totalRounds,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Сетка бейджиков */}
      <div className='grid grid-cols-4 gap-2.5 max-[600px]:grid-cols-3 max-[400px]:grid-cols-2'>
        {items.map((item) => (
          <div
            key={item.id}
            data-drag-item-id={item.id}
            className={cn(
              'rounded-[14px] px-3 py-3.5 text-center text-[14px] font-medium transition-all duration-150 select-none',
              matchedCardIdxs.has(item.cardIdx) && 'line-through',
            )}
            style={getPillStyle(item)}
            onClick={() => handleClick(item.id)}
            onPointerDown={(e) => handlePointerDown(item.id, e)}
            onPointerMove={(e) => handlePointerMove(item.id, e)}
            onPointerUp={(e) => handlePointerUp(item.id, e)}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* «Призрак» бейджика, который пользователь тянет указателем */}
      {draggingItemId && (
        <div
          className='pointer-events-none fixed z-[9999] max-w-[160px] rounded-[12px] px-3 py-2 text-[13px] font-semibold text-white shadow-2xl'
          style={{
            left: ghostPos.x - 60,
            top: ghostPos.y - 22,
            background: 'var(--brand)',
            border: '2px solid rgba(255,255,255,0.6)',
            transform: 'rotate(-2deg)',
          }}
        >
          {ghostText}
        </div>
      )}
    </div>
  );
}

/**
 * Режим обучения «Перетаскивание».
 *
 * Большие колоды разбиваются на раунды по ROUND_BATCH_SIZE карточек,
 * чтобы не перегружать экран.
 */
export function DragMode({
  cards,
  deck,
  dir,
  sessionId,
  onComplete,
}: StudyModeProps) {
  const totalRounds = Math.ceil(cards.length / ROUND_BATCH_SIZE);
  const [roundIdx, setRoundIdx] = useState(0);
  const [allResults, setAllResults] = useState<ReturnType<typeof okResult>[]>(
    [],
  );

  // Карточки для текущего раунда
  const batchCards = useMemo(
    () =>
      cards.slice(
        roundIdx * ROUND_BATCH_SIZE,
        (roundIdx + 1) * ROUND_BATCH_SIZE,
      ),
    [cards, roundIdx],
  );

  return (
    <DragRound
      key={roundIdx}
      cards={batchCards}
      rawCards={[]}
      deck={deck}
      dir={dir}
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
