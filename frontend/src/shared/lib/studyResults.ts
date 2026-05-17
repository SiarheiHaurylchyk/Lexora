/**
 * Результаты сессии обучения.
 *
 * Каждый режим (Flashcard, Learn, Match…) возвращает массив `ModeResult` —
 * по одному на карточку. Эти данные собираются на странице StudyPage и
 * показываются на экране итогов (StudyResultScreen).
 */

/** Результат одной карточки в мини-игре или экзамене. */
export interface ModeResult {
  cardId: number;
  /** True — пользователь ответил правильно. */
  correct: boolean;
  /** Что было показано в качестве вопроса (для отчёта об ошибках). */
  question?: string;
  /** Ожидаемый правильный ответ. */
  expected?: string;
  /** Что пользователь ответил (для типа «введите слово»). */
  given?: string;
}

/** Результат «ошибся» с подробностями для экрана разбора. */
export function mistakeResult(
  cardId: number,
  question: string,
  expected: string,
  given?: string,
): ModeResult {
  return {
    cardId,
    correct: false,
    question,
    expected,
    ...(given !== undefined && given !== '' ? { given } : {}),
  };
}

/** Результат «ответил верно» — без дополнительных полей. */
export function okResult(cardId: number): ModeResult {
  return { cardId, correct: true };
}

/** Карта cardId → {term, definition} для подстановок на экране итогов. */
export type CardLookup = Map<number, { term: string; definition: string }>;

/**
 * Построить cardLookup из «сырых» (rawCards) и «ориентированных» (cards) данных.
 * Ориентированные карточки перезаписывают сырые, потому что показываются
 * пользователю именно они и именно их хочется видеть в отчёте.
 */
export function buildCardLookup(
  oriented: Array<{ id: number; term: string; definition: string }>,
  raw: Array<{ id: number; term: string; definition: string }>,
): CardLookup {
  const map: CardLookup = new Map();
  raw.forEach((c) => map.set(c.id, { term: c.term, definition: c.definition }));
  oriented.forEach((c) =>
    map.set(c.id, { term: c.term, definition: c.definition }),
  );
  return map;
}

/** Полностью «дозаполненная» ошибка для UI разбора. */
export interface ResolvedMistake {
  question: string;
  expected: string;
  given?: string;
}

/**
 * Привести список результатов к плоскому списку ошибок:
 * выбрасываем верные ответы, дополняем недостающие question/expected
 * данными карточки из cardLookup.
 */
export function resolveMistakes(
  results: ModeResult[],
  lookup: CardLookup,
): ResolvedMistake[] {
  return results
    .filter((r) => !r.correct)
    .map((r) => {
      const card = lookup.get(r.cardId);
      return {
        question: r.question ?? card?.term ?? '—',
        expected: r.expected ?? card?.definition ?? '—',
        given: r.given,
      };
    });
}
