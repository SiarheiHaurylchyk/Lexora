import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { studyApi } from '@/shared/api/api-legacy';
import type { CardItem, DeckItem, DueReviewPayload } from '@/shared/api/types';
import { useApiQuery } from '@/shared/lib/query';
import { dueReviewToCardItems } from '@/shared/lib/srs';
import { applyStudyDirection, type StudyCard } from '@/shared/lib/studyPrompts';
import { buildCardLookup, type ModeResult } from '@/shared/lib/studyResults';

export type DueReviewPhase = 'study' | 'result';

/**
 * Прочитать опциональные фильтры из query-string (передаёт SmartReviewModal):
 *   ?limit=10        → взять только первые 10 due-карточек
 *   ?decks=1,3,7     → только карточки из указанных колод
 *   ?dir=reverse     → направление reverse / mixed
 */
function readReviewFiltersFromUrl(): {
  limit: number | null;
  deckIds: Set<number> | null;
  dir: 'forward' | 'reverse' | 'mixed';
} {
  const params = new URLSearchParams(window.location.search);

  const rawLimit = params.get('limit');
  const limit = rawLimit ? Math.max(1, parseInt(rawLimit, 10)) : null;

  const rawDecks = params.get('decks');
  const deckIds =
    rawDecks && rawDecks.trim()
      ? new Set(rawDecks.split(',').map(Number))
      : null;

  const rawDir = params.get('dir');
  const dir = rawDir === 'reverse' || rawDir === 'mixed' ? rawDir : 'forward';

  return { limit, deckIds, dir };
}

/** Хук сессии для глобальной страницы due-review. */
export function useDueReviewSession() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const reviewQuery = useApiQuery<DueReviewPayload>({
    queryKey: ['srs', 'due-review'],
    url: '/study/due-review',
  });

  const [deck, setDeck] = useState<DeckItem | null>(null);
  const [rawCards, setRawCards] = useState<CardItem[]>([]);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [phase, setPhase] = useState<DueReviewPhase>('study');
  const [results, setResults] = useState<ModeResult[]>([]);
  const [retryKey, setRetryKey] = useState(0);

  const cardLookup = useMemo(
    () => buildCardLookup(cards, rawCards),
    [cards, rawCards],
  );

  useEffect(() => {
    const payload = reviewQuery.data;
    if (!payload) return;

    if (payload.totalDue === 0 || payload.cards.length === 0) {
      toast.error(t('srs.noDueGlobal'));
      navigate('/decks');
      return;
    }

    // Выбор пользователя из URL (задаёт SmartReviewModal).
    const { limit, deckIds, dir } = readReviewFiltersFromUrl();

    // Шаг 1: фильтр по выбранным колодам (если выбрано подмножество).
    const filteredByDeck =
      deckIds !== null
        ? payload.cards.filter((c) => deckIds.has(c.deckId))
        : payload.cards;

    if (filteredByDeck.length === 0) {
      toast.error(t('srs.noDueGlobal'));
      navigate('/decks');
      return;
    }

    // Шаг 2: shuffle перед slice, чтобы лимит давал случайную выборку,
    //         а не всегда первые N карточек из порядка БД.
    const shuffled = [...filteredByDeck].sort(() => Math.random() - 0.5);

    // Шаг 3: лимит количества карточек из модалки.
    const sliced = limit !== null ? shuffled.slice(0, limit) : shuffled;

    const cardItems = dueReviewToCardItems(sliced);

    const first = sliced[0];
    const virtualDeck: DeckItem = {
      id: first.deckId,
      title: t('srs.globalReviewTitle'),
      sourceLanguage: first.sourceLanguage,
      targetLanguage: first.targetLanguage,
      visibility: 'PRIVATE',
      cardCount: cardItems.length,
      cards: cardItems,
    };

    setDeck(virtualDeck);
    setRawCards(cardItems);
    setCards(applyStudyDirection(cardItems, dir));

    let cancelled = false;
    void (async () => {
      try {
        const { data: session } = await studyApi.startSession(
          first.deckId,
          'REVIEW',
        );
        if (!cancelled) setSessionId(session.id);
      } catch {
        if (!cancelled) {
          toast.error(t('study.sessionFailed'));
          navigate('/decks');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewQuery.data, navigate, t, retryKey]);

  useEffect(() => {
    if (reviewQuery.isError) {
      toast.error(t('study.sessionFailed'));
      navigate('/decks');
    }
  }, [reviewQuery.isError, navigate, t]);

  const handleComplete = async (modeResults: ModeResult[]) => {
    setResults(modeResults);
    setPhase('result');
    if (sessionId) {
      try {
        await studyApi.completeSession(sessionId);
      } catch {
        // Не критично — всё равно показываем экран итогов.
      }
    }
    void queryClient.invalidateQueries({ queryKey: ['srs'] });
  };

  const handleRetry = () => {
    setPhase('study');
    setDeck(null);
    setSessionId(null);
    setRetryKey((k) => k + 1);
    void queryClient.invalidateQueries({ queryKey: ['srs', 'due-review'] });
  };

  const loading = reviewQuery.isLoading || deck === null || sessionId === null;

  return {
    deck,
    cards,
    rawCards,
    sessionId,
    loading,
    phase,
    results,
    cardLookup,
    handleComplete,
    handleRetry,
  };
}
