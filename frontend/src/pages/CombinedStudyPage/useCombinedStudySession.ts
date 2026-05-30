import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { deckApi, studyApi } from '@/shared/api/api-legacy';
import type { CardItem, DeckItem } from '@/shared/api/types';
import {
  buildVirtualDeck,
  decksShareLanguages,
  mergeDeckCards,
  parseDeckIdsParam,
} from '@/shared/lib/combinedStudy';
import {
  applyStudyDirection,
  type StudyCard,
  type StudyDir,
} from '@/shared/lib/studyPrompts';
import { buildCardLookup, type ModeResult } from '@/shared/lib/studyResults';

export type CombinedStudyPhase = 'study' | 'result';

function readStudyDir(searchParams: URLSearchParams): StudyDir {
  const param = searchParams.get('dir');
  return (param as StudyDir | null) ?? 'forward';
}

/**
 * Загружает несколько колод, смешивает карточки и стартует одну сессию
 * (привязана к первой колоде — прогресс по карточкам сохраняется корректно).
 */
export function useCombinedStudySession() {
  const { t } = useTranslation();
  const { mode } = useParams<{ mode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const deckIds = useMemo(
    () => parseDeckIdsParam(searchParams.get('decks')),
    [searchParams],
  );
  const dir = useMemo(() => readStudyDir(searchParams), [searchParams]);

  const [deck, setDeck] = useState<DeckItem | null>(null);
  const [rawCards, setRawCards] = useState<CardItem[]>([]);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [phase, setPhase] = useState<CombinedStudyPhase>('study');
  const [results, setResults] = useState<ModeResult[]>([]);
  const [retryKey, setRetryKey] = useState(0);

  const cardLookup = useMemo(
    () => buildCardLookup(cards, rawCards),
    [cards, rawCards],
  );

  useEffect(() => {
    if (deckIds.length < 2) {
      toast.error(t('combinedStudy.needTwo'));
      navigate('/decks');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const responses = await Promise.all(
          deckIds.map((id) => deckApi.getDeck(id)),
        );
        if (cancelled) return;

        const loaded = responses.map((r) => r.data);
        if (!decksShareLanguages(loaded)) {
          toast.error(t('combinedStudy.langMismatch'));
          navigate('/decks');
          return;
        }

        const merged = mergeDeckCards(loaded);
        if (merged.length === 0) {
          toast.error(t('combinedStudy.noCards'));
          navigate('/decks');
          return;
        }

        const virtualDeck = buildVirtualDeck(loaded);
        const shuffled = [...merged].sort(() => Math.random() - 0.5);

        setDeck(virtualDeck);
        setRawCards(shuffled);
        setCards(applyStudyDirection(shuffled, dir));

        const { data: session } = await studyApi.startSession(
          deckIds[0],
          mode!,
        );
        if (!cancelled) {
          setSessionId(session.id);
        }
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
  }, [deckIds, mode, dir, navigate, t, retryKey]);

  const handleComplete = async (modeResults: ModeResult[]) => {
    setResults(modeResults);
    setPhase('result');
    if (sessionId) {
      try {
        await studyApi.completeSession(sessionId);
      } catch {
        // Не блокируем экран итогов
      }
    }
  };

  const handleRetry = () => {
    setPhase('study');
    setDeck(null);
    setSessionId(null);
    setRetryKey((k) => k + 1);
  };

  const loading = deck === null || sessionId === null;

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
    deckIds,
    handleComplete,
    handleRetry,
  };
}
