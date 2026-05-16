import { studyApi } from '../api/api-legacy';

/**
 * Отправить ответ по карточке на сервер. Не ждёт результата — это «огонь и
 * забыть»: ошибка сети не должна ломать UX обучения.
 *
 * Если `rating` не задан, выбирается дефолтный: 4 — верно, 1 — неверно.
 * Параметр `rating` нужен режиму «Карточки», где пользователь сам выбирает
 * сложность (Сложно/Норм/Легко) и хочется передать это в SM-2.
 */
export function sendStudyAnswer(
  sessionId: number | null,
  cardId: number,
  correct: boolean,
  rating?: number,
): void {
  if (!sessionId) return;
  const finalRating = rating ?? (correct ? 4 : 1);
  studyApi
    .recordAnswer(sessionId, { cardId, correct, rating: finalRating })
    .catch(() => {
      // Намеренно глушим — пользователь не должен видеть ошибку логирования
    });
}
