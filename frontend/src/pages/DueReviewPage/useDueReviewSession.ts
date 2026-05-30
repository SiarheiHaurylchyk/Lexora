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

/** Сессия глобального повторения всех due-карточек. */
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

    const shuffled = [...dueReviewToCardItems(payload.cards)].sort(
      () => Math.random() - 0.5,
    );
    const first = payload.cards[0];
    const virtualDeck: DeckItem = {
      id: first.deckId,
      title: t('srs.globalReviewTitle'),
      sourceLanguage: first.sourceLanguage,
      targetLanguage: first.targetLanguage,
      visibility: 'PRIVATE',
      cardCount: shuffled.length,
      cards: shuffled,
    };

    setDeck(virtualDeck);
    setRawCards(shuffled);
    setCards(applyStudyDirection(shuffled, 'forward'));

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
        // ignore
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
