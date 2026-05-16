import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import type { DeckMeta } from '@/widgets/DeckSettings';

import { deckApi } from '@/shared/api/api-legacy';
import type { CardItem, DeckItem } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useApiQuery } from '@/shared/lib/query';
import type { CardForm } from '@/shared/types/cardForm';

/** Значения по умолчанию для полей колоды (используется до загрузки данных). */
const DEFAULT_DECK_META: DeckMeta = {
  title: '',
  description: '',
  sourceLanguage: 'en',
  targetLanguage: 'ru',
  coverColor: '#7C3AED',
  emoji: '📚',
  visibility: 'PRIVATE',
};

/** Форма карточки в виде «пустой шаблон» — для кнопки «Добавить карточку». */
const EMPTY_CARD: CardForm = {
  term: '',
  definition: '',
  example: '',
  transcription: '',
  termImageUrl: '',
  definitionImageUrl: '',
};

/** Преобразует карточку с сервера в форму для inline-редактора. */
function cardItemToForm(card: CardItem): CardForm {
  return {
    id: card.id,
    term: card.term,
    definition: card.definition,
    example: card.example || '',
    transcription: card.transcription || '',
    termImageUrl: card.termImageUrl || '',
    definitionImageUrl: card.definitionImageUrl || '',
    isDirty: false,
  };
}

/** Преобразует ответ API колоды в наш DeckMeta. */
function deckItemToMeta(deck: DeckItem): DeckMeta {
  return {
    title: deck.title,
    description: deck.description || '',
    sourceLanguage: deck.sourceLanguage,
    targetLanguage: deck.targetLanguage,
    coverColor: deck.coverColor || '#7C3AED',
    emoji: deck.emoji || '📚',
    visibility: deck.visibility,
  };
}

/**
 * Хук редактора колоды — вся бизнес-логика страницы EditDeckPage.
 *
 * Отвечает за:
 *  - загрузку колоды и её начальную «гидратацию» в локальный state;
 *  - редактирование настроек колоды (saveMeta);
 *  - CRUD карточек (addCard / updateCard / saveCard / deleteCard);
 *  - открытие/закрытие inline-редактора одной активной карточки;
 *  - добавление карточек после массового импорта.
 *
 * Страница `EditDeckPage` остаётся чисто презентационной — берёт данные и
 * колбэки из этого хука и собирает из них UI.
 */
export function useDeckEditor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deckId = Number(id);

  // Запрос колоды с сервера через TanStack Query
  const deckQuery = useApiQuery<DeckItem>({
    queryKey: ['deck', deckId],
    url: `/decks/${deckId}`,
    enabled: Number.isFinite(deckId),
  });

  // Метаданные колоды: название, описание, языки, цвет, эмодзи, видимость
  const [meta, setMeta] = useState<DeckMeta>(DEFAULT_DECK_META);
  // Карточки колоды в виде формы редактора
  const [cards, setCards] = useState<CardForm[]>([]);
  // Идёт ли сейчас сохранение настроек колоды (для disabled у кнопки)
  const [saving, setSaving] = useState(false);
  // Индекс открытой в inline-редакторе карточки; null — ни одна не открыта
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(null);

  // id колоды, для которой уже заполнили локальный state — нужно, чтобы
  // повторный refetch не сбрасывал введённые пользователем правки
  const hydratedDeckIdRef = useRef<number | null>(null);

  // Первичная гидратация meta + cards из ответа API
  useEffect(() => {
    const data = deckQuery.data;
    if (!data) return;
    if (hydratedDeckIdRef.current === data.id) return;

    const prevDeckId = hydratedDeckIdRef.current;
    hydratedDeckIdRef.current = data.id;
    if (prevDeckId !== null && prevDeckId !== data.id) setActiveCardIdx(null);

    setMeta(deckItemToMeta(data));
    setCards((data.cards || []).map(cardItemToForm));
  }, [deckQuery.data]);

  // Колоду не удалось загрузить — уходим на список колод
  useEffect(() => {
    if (deckQuery.isError) {
      toast.error(t('editDeck.notFound'));
      navigate('/decks');
    }
  }, [deckQuery.isError, navigate, t]);

  /** Сохранить настройки колоды (title, языки, цвет, и т.д.) на сервере. */
  const saveMeta = async () => {
    setSaving(true);
    try {
      await deckApi.updateDeck(deckId, meta);
      toast.success(t('editDeck.saved'));
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? t('editDeck.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  /** Добавить пустую карточку в конец списка и сразу открыть её редактор. */
  const addCard = () => {
    setCards((prev) => [...prev, { ...EMPTY_CARD }]);
    setActiveCardIdx(cards.length);
  };

  /** Изменить значение одного поля карточки в локальном state. */
  const updateCardField = (
    idx: number,
    field: keyof CardForm,
    value: string,
  ) => {
    setCards((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [field]: value };
      // Помечаем уже сохранённую карточку как «изменена» — нужно для автосейва
      if (updated.id) updated.isDirty = true;
      next[idx] = updated;
      return next;
    });
  };

  /**
   * Сохранить карточку на сервере (создать или обновить).
   * `silent: true` — не показывать toast (для тихого автосейва при закрытии).
   * Возвращает true, если карточка успешно сохранена.
   */
  const saveCard = async (
    idx: number,
    opts?: { silent?: boolean },
  ): Promise<boolean> => {
    const card = cards[idx];
    if (!card.term.trim() || !card.definition.trim()) {
      if (!opts?.silent) toast.error(t('editDeck.termRequired'));
      return false;
    }
    const payload = {
      term: card.term,
      definition: card.definition,
      example: card.example,
      transcription: card.transcription,
      termImageUrl: card.termImageUrl || null,
      definitionImageUrl: card.definitionImageUrl || null,
      sortOrder: idx,
    };
    try {
      if (!card.id) {
        // Новая карточка — создаём на сервере, сохраняем полученный id
        const { data } = await deckApi.addCard(deckId, payload);
        setCards((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], id: data.id, isDirty: false };
          return next;
        });
        if (!opts?.silent) toast.success(t('editDeck.cardAdded'));
      } else {
        // Существующая карточка — обновляем
        await deckApi.updateCard(deckId, card.id, payload);
        setCards((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], isDirty: false };
          return next;
        });
        if (!opts?.silent) toast.success(t('editDeck.cardUpdated'));
      }
      return true;
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? t('editDeck.cardSaveFailed'));
      return false;
    }
  };

  /** Удалить карточку (на сервере, если уже была сохранена) и убрать из списка. */
  const deleteCard = async (idx: number) => {
    const card = cards[idx];
    if (card.id) {
      try {
        await deckApi.deleteCard(deckId, card.id);
        toast.success(t('editDeck.cardDeleted'));
      } catch {
        toast.error(t('editDeck.cardDeleteFailed'));
        return;
      }
    }
    setCards((prev) => prev.filter((_, i) => i !== idx));
    if (activeCardIdx === idx) setActiveCardIdx(null);
  };

  /**
   * Закрыть inline-редактор карточки.
   * - Пустую новую карточку выбрасываем из списка.
   * - Заполненную и изменённую — тихо сохраняем на сервере.
   */
  const closeCardEditor = async (idx: number) => {
    const card = cards[idx];
    if (!card) {
      setActiveCardIdx(null);
      return;
    }
    const hasAnyText = Boolean(card.term.trim() || card.definition.trim());
    const isComplete = Boolean(card.term.trim() && card.definition.trim());

    if (!hasAnyText && !card.id) {
      setCards((prev) => prev.filter((_, i) => i !== idx));
      setActiveCardIdx(null);
      return;
    }
    if (isComplete && (!card.id || card.isDirty)) {
      await saveCard(idx, { silent: true });
    }
    setActiveCardIdx(null);
  };

  /** Открыть редактор карточки, предварительно закрыв предыдущую (с автосейвом). */
  const openCardEditor = async (idx: number) => {
    if (activeCardIdx !== null && activeCardIdx !== idx) {
      await closeCardEditor(activeCardIdx);
    }
    setActiveCardIdx(idx);
  };

  /** Добавить карточки в список после успешного массового импорта. */
  const appendImportedCards = (newCards: CardForm[]) => {
    setCards((prev) => [...prev, ...newCards]);
  };

  return {
    deckId,
    loading: deckQuery.isLoading,
    meta,
    setMeta,
    cards,
    saving,
    activeCardIdx,
    saveMeta,
    addCard,
    updateCardField,
    saveCard,
    deleteCard,
    openCardEditor,
    closeCardEditor,
    appendImportedCards,
  };
}
