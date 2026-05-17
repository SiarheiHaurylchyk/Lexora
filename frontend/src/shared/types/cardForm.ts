/**
 * Локальное состояние одной карточки внутри редактора колоды.
 *
 * Это удобный «черновик» поверх серверного типа CardItem:
 *  - все строковые поля гарантированно непустые (используем '' вместо null);
 *  - есть служебные флаги `id`/`isDirty`, которые отличают новую карточку от
 *    уже сохранённой и помогают понять, нужен ли автосейв.
 */
export interface CardForm {
  /** Если id отсутствует — карточка ещё не была сохранена на сервере. */
  id?: number;
  term: string;
  definition: string;
  example: string;
  transcription: string;
  termImageUrl: string;
  definitionImageUrl: string;
  /** True, если у уже сохранённой карточки есть несохранённые правки. */
  isDirty?: boolean;
}
