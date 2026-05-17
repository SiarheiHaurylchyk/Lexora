/**
 * Утилиты для построения «вопросов» (prompts) и поведения, которые
 * переиспользуют сразу несколько режимов обучения: Spell, Scramble,
 * Gravity, Exam, а также общая ориентация карточек для Flashcard / Learn /
 * Match / Drag.
 */
import type { CardItem, DeckItem } from '../api/types';

/** Направление обучения, выбранное пользователем на странице колоды. */
export type StudyDir = 'forward' | 'reverse' | 'mixed';

/** Карточка после применения направления (term/definition могли поменяться местами). */
export type StudyCard = CardItem & { studyReversed?: boolean };

/**
 * Применить направление обучения к списку карточек.
 *
 * - forward — оставляем как есть;
 * - reverse — меняем term ↔ definition у каждой карточки;
 * - mixed   — для каждой карточки случайно решаем, переворачивать или нет.
 *
 * Картинки и транскрипция тоже корректно «переезжают» вместе с полями.
 */
export function applyStudyDirection(
  cards: CardItem[],
  dir: StudyDir,
): StudyCard[] {
  if (dir === 'forward') {
    return cards.map((c) => ({ ...c, studyReversed: false }));
  }
  return cards.map((c) => {
    const swap = dir === 'reverse' || Math.random() < 0.5;
    if (!swap) return { ...c, studyReversed: false };
    return {
      ...c,
      studyReversed: true,
      term: c.definition,
      definition: c.term,
      termImageUrl: (c.definitionImageUrl ?? null) as string | null | undefined,
      definitionImageUrl: (c.termImageUrl ?? null) as string | null | undefined,
      transcription: '',
    };
  });
}

/** Язык лицевой стороны карточки (с учётом её ориентации). */
export function studyCardFrontLang(deck: DeckItem, card: StudyCard) {
  return card.studyReversed ? deck.targetLanguage : deck.sourceLanguage;
}

/** Язык обратной стороны карточки (с учётом её ориентации). */
export function studyCardBackLang(deck: DeckItem, card: StudyCard) {
  return card.studyReversed ? deck.sourceLanguage : deck.targetLanguage;
}

/** Один «вопрос» для режимов Spell / Scramble / Gravity / Exam. */
export interface StudyPrompt {
  cardId: number;
  question: string;
  answer: string;
  questionLang: string;
  answerLang: string;
  questionImageUrl?: string;
  /** Какое направление было применено к этому prompt. */
  direction: 'forward' | 'reverse';
}

/** Привести строку ответа к каноничному виду (lower-case, без пунктуации). */
export function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, ' ')
    .trim();
}

/** Сравнить «введённый» и «ожидаемый» ответ без учёта регистра/пунктуации. */
export function answersMatch(typed: string, expected: string) {
  return normalizeAnswer(typed) === normalizeAnswer(expected);
}

/**
 * Сформировать набор «вопросов» из карточек колоды с учётом направления.
 *
 * - forward → один вопрос «term → definition» на карточку;
 * - reverse → один вопрос «definition → term» на карточку;
 * - mixed   → оба вопроса на каждую карточку.
 *
 * Дополнительно перемешиваем и стараемся не ставить два вопроса по одной
 * карточке подряд — иначе следующий вопрос «подсказывает» ответ.
 */
export function buildStudyPrompts(
  cards: CardItem[],
  deck: DeckItem,
  dir: StudyDir,
): StudyPrompt[] {
  const all: StudyPrompt[] = [];
  cards.forEach((c: CardItem) => {
    if (dir !== 'reverse') {
      all.push({
        cardId: c.id,
        question: c.term,
        answer: c.definition,
        questionLang: deck.sourceLanguage,
        answerLang: deck.targetLanguage,
        questionImageUrl: c.termImageUrl || c.definitionImageUrl || undefined,
        direction: 'forward',
      });
    }
    if (dir !== 'forward') {
      all.push({
        cardId: c.id,
        question: c.definition,
        answer: c.term,
        questionLang: deck.targetLanguage,
        answerLang: deck.sourceLanguage,
        questionImageUrl: c.definitionImageUrl || c.termImageUrl || undefined,
        direction: 'reverse',
      });
    }
  });

  const shuffled = all.sort(() => Math.random() - 0.5);
  // Чтобы соседние вопросы не «подсказывали» ответ друг другу
  for (let i = 1; i < shuffled.length; i++) {
    if (shuffled[i].cardId === shuffled[i - 1].cardId) {
      const swap = shuffled.findIndex(
        (p, j) =>
          j > i &&
          p.cardId !== shuffled[i - 1].cardId &&
          p.cardId !== shuffled[i].cardId,
      );
      if (swap !== -1) {
        [shuffled[i], shuffled[swap]] = [shuffled[swap], shuffled[i]];
      }
    }
  }
  return shuffled;
}

const MAX_SCRAMBLE_LEN = 22;
const MIN_SCRAMBLE_LEN = 2;

/** Подходит ли ответ для режима «Сборка слова» (короткий, есть буквы). */
export function isScrambleFriendly(answer: string) {
  const compact = answer.replace(/\s+/g, '');
  if (compact.length < MIN_SCRAMBLE_LEN || compact.length > MAX_SCRAMBLE_LEN)
    return false;
  return /[\p{L}\p{N}]/u.test(compact);
}

/** Перемешать массив (Fisher-Yates) — не мутирует исходный. */
export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Одна буква-плитка в режиме «Сборка слова». */
export interface ScrambleLetter {
  id: string;
  char: string;
}

/** Разбить ответ на перемешанные буквы-плитки для режима Scramble. */
export function buildScrambleLetters(answer: string): ScrambleLetter[] {
  const chars = [...answer.replace(/\s+/g, '')];
  return shuffleArray(chars).map((char, i) => ({
    id: `${char}_${i}_${Math.random().toString(36).slice(2, 7)}`,
    char,
  }));
}

/** Максимальное число вопросов в экзамене. */
export const EXAM_MAX_QUESTIONS = 15;
/** Минимум карточек в колоде, чтобы режим «Экзамен» был доступен. */
export const EXAM_MIN_QUESTIONS = 3;
const EXAM_TYPE_MAX_LEN = 48;

/** «Выбор из вариантов» или «введи руками». */
export type ExamQuestionType = 'choice' | 'type';

/** Один вопрос в экзамене. */
export interface ExamQuestion extends StudyPrompt {
  type: ExamQuestionType;
  /** 4 варианта ответа (для type === 'choice'); для 'type' игнорируем. */
  choices: string[];
}

/** Подобрать 4 варианта ответа: 1 правильный + 3 случайных неверных. */
export function buildMultipleChoiceOptions(
  prompt: StudyPrompt,
  all: StudyPrompt[],
): string[] {
  const pool = all
    .filter((p) => !answersMatch(p.answer, prompt.answer))
    .map((p) => p.answer);
  const unique = [...new Set(pool)];
  const wrong = shuffleArray(unique).slice(0, 3);
  // Если уникальных вариантов < 3, добиваем повторами и заглушками
  while (wrong.length < 3 && unique.length > 0) {
    wrong.push(unique[wrong.length % unique.length]);
  }
  if (wrong.length < 3) {
    const fillers = ['—', '…', '?'];
    wrong.push(...fillers.slice(0, 3 - wrong.length));
  }
  return shuffleArray([prompt.answer, ...wrong.slice(0, 3)]);
}

/**
 * Сформировать вопросы для режима «Экзамен».
 *
 * Случайно чередует «выбор из 4-х» и «введи слово» (около 40% набирать).
 * Длинные ответы всегда отдаются как «выбор» (вводить тяжело).
 * Если карточек слишком мало — вернётся пустой массив (UI покажет hint).
 */
export function buildExamQuestions(
  cards: CardItem[],
  deck: DeckItem,
  dir: StudyDir,
  maxQuestions = EXAM_MAX_QUESTIONS,
): ExamQuestion[] {
  const prompts = buildStudyPrompts(cards, deck, dir);
  if (prompts.length < EXAM_MIN_QUESTIONS) return [];

  const count = Math.min(maxQuestions, prompts.length);
  const picked = shuffleArray(prompts).slice(0, count);

  return picked.map((p) => {
    const canType =
      p.answer.length >= 2 && p.answer.length <= EXAM_TYPE_MAX_LEN;
    const useType = canType && Math.random() < 0.4;
    return {
      ...p,
      type: useType ? 'type' : 'choice',
      choices: buildMultipleChoiceOptions(p, prompts),
    };
  });
}
