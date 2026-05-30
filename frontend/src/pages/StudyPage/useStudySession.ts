import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { studyApi } from '@/shared/api/api-legacy';
import type { CardItem, DeckItem, DeckSrsPayload } from '@/shared/api/types';
import { useApiQuery } from '@/shared/lib/query';
import { dueCardIds } from '@/shared/lib/srs';
import {
  applyStudyDirection,
  type StudyCard,
  type StudyDir,
} from '@/shared/lib/studyPrompts';
import { buildCardLookup, type ModeResult } from '@/shared/lib/studyResults';

/** Текущий экран сессии: либо идёт обучение, либо показываем итоги. */
export type StudyPhase = 'study' | 'result';

/** Прочитать направление обучения (forward/reverse/mixed) из ?dir= в URL. */
function readStudyDirFromUrl(): StudyDir {
  const param = new URLSearchParams(window.location.search).get('dir');
  return (param as StudyDir | null) ?? 'forward';
}

/**
 * Хук-«мозги» страницы StudyPage.
 *
 * Что делает:
 *  - тянет колоду по deckId и стартует серверную сессию обучения;
 *  - перемешивает карточки и применяет к ним направление (forward/reverse/mixed);
 *  - принимает результаты от режима обучения (handleComplete) и закрывает
 *    сессию на сервере;
 *  - умеет «начать заново» (handleRetry) — пересоздаёт сессию.
 *
 * Страница StudyPage остаётся чисто презентационной.
 */
export function useStudySession() {
  const { t } = useTranslation();
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deckId = Number(id);
  const isReview = mode === 'REVIEW';

  // Направление берём из URL один раз при монтировании, дальше не меняем
  const [dir] = useState<StudyDir>(readStudyDirFromUrl);

  // Карточки в исходном порядке (после shuffle)
  const [rawCards, setRawCards] = useState<CardItem[]>([]);
  // Карточки с учётом dir (term/definition могут быть переставлены)
  const [cards, setCards] = useState<StudyCard[]>([]);
  // id серверной сессии обучения; null — пока не создана
  const [sessionId, setSessionId] = useState<number | null>(null);
  // study — идёт обучение; result — экран итогов
  const [phase, setPhase] = useState<StudyPhase>('study');
  // Результаты ответов за текущий проход
  const [results, setResults] = useState<ModeResult[]>([]);
  // Меняется при «Повторить» — перезапускает запрос колоды и создание сессии
  const [retryKey, setRetryKey] = useState(0);

  const deckQuery = useApiQuery<DeckItem>({
    queryKey: ['deck', deckId, 'study', retryKey],
    url: `/decks/${deckId}`,
    enabled: Number.isFinite(deckId),
  });
  const srsQuery = useApiQuery<DeckSrsPayload>({
    queryKey: ['srs', deckId, retryKey],
    url: `/decks/${deckId}/srs`,
    enabled: Number.isFinite(deckId) && isReview,
  });
  const deck = deckQuery.data ?? null;

  // Словарь cardId → {term, definition} — нужен для экрана ошибок
  const cardLookup = useMemo(
    () => buildCardLookup(cards, rawCards),
    [cards, rawCards],
  );

  // Когда пришла колода: shuffle, применяем направление, создаём сессию на API
  useEffect(() => {
    const data = deckQuery.data;
    if (!data) return;
    if (isReview && !srsQuery.data) return;

    let pool = data.cards ?? [];
    if (isReview) {
      const ids = dueCardIds(srsQuery.data!.cards);
      pool = pool.filter((c) => ids.has(c.id));
      if (pool.length === 0) {
        toast.error(t('srs.noDue'));
        navigate(`/decks/${id}`);
        return;
      }
    } else if (!pool.length) {
      toast.error(t('study.noCards'));
      navigate(`/decks/${id}`);
      return;
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setRawCards(shuffled);
    setCards(applyStudyDirection(shuffled, dir));

    let cancelled = false;
    void (async () => {
      try {
        const { data: session } = await studyApi.startSession(deckId, mode!);
        if (!cancelled) setSessionId(session.id);
      } catch {
        if (!cancelled) {
          toast.error(t('study.sessionFailed'));
          navigate(`/decks/${id}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    deckQuery.data,
    srsQuery.data,
    deckId,
    mode,
    navigate,
    id,
    t,
    dir,
    isReview,
  ]);

  // Колоду не удалось загрузить — уходим на страницу колоды
  useEffect(() => {
    if (deckQuery.isError) {
      toast.error(t('study.sessionFailed'));
      navigate(`/decks/${id}`);
    }
  }, [deckQuery.isError, navigate, id, t]);

  /** Режим прошёл до конца: сохранить результаты, закрыть сессию, показать итоги. */
  const handleComplete = async (modeResults: ModeResult[]) => {
    setResults(modeResults);
    setPhase('result');
    if (sessionId) {
      try {
        await studyApi.completeSession(sessionId);
      } catch {
        // Не критично, если сервер не подтвердил закрытие — продолжаем
      }
    }
    void queryClient.invalidateQueries({ queryKey: ['srs'] });
  };

  /** Кнопка «Повторить»: сброс сессии и повторная загрузка колоды. */
  const handleRetry = () => {
    setPhase('study');
    setSessionId(null);
    setRetryKey((k) => k + 1);
  };

  const loading =
    deckQuery.isLoading ||
    (isReview && srsQuery.isLoading) ||
    sessionId === null;

  return {
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
    deckUrlId: id,
    handleComplete,
    handleRetry,
  };
}
