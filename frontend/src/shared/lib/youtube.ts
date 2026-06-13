/**
 * Хелперы для работы с URL YouTube-видео.
 *
 * Принимаем любой распространённый формат URL и извлекаем id видео.
 * Id используется для embed-URL, который воспроизводится внутри приложения
 * (без редиректа на youtube.com).
 *
 * Поддерживаемые форматы:
 *   https://www.youtube.com/watch?v=ID
 *   https://m.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   ID (сырой 11-символьный id тоже принимается)
 */

/** Обрезать пробелы и добавить схему, чтобы `new URL()` мог распарсить строку. */
export function normalizeYoutubeInput(input: string): string {
  const text = input.trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

/** Извлечь id YouTube из URL или сырого id. null, если ничего не найдено. */
export function getYouTubeId(input: string): string | null {
  if (!input) return null;
  const text = normalizeYoutubeInput(input);
  if (!text) return null;

  // Случай 1: уже похоже на сырой 11-символьный id.
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

  // Случай 2: короткая форма https://youtu.be/ID
  if (host === 'youtu.be') {
    const id = url.pathname.replace('/', '');
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  // Случай 3: полный youtube.com (и music.youtube.com).
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    // /watch?v=ID
    const v = url.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    // /embed/ID  или  /shorts/ID  или  /v/ID
    const match = url.pathname.match(/\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[2];
  }

  return null;
}

/** Собрать embed-URL для iframe из любого YouTube URL или id. null при невалидном вводе. */
export function getYouTubeEmbedUrl(input: string): string | null {
  const id = getYouTubeId(input);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

/** URL превью-картинки YouTube (для миниатюры). */
export function getYouTubeThumbUrl(input: string): string | null {
  const id = getYouTubeId(input);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Прочитать YouTube URL из блока урока.
 * Основное поле — `content`; `extra` — запасной вариант для старых сохранений.
 */
export function resolveBlockYoutubeUrl(block: {
  content?: string | null;
  extra?: string | null;
}): string {
  const fromContent = block.content?.trim() ?? '';
  if (fromContent) return fromContent;
  const fromExtra = block.extra?.trim() ?? '';
  if (fromExtra && getYouTubeId(fromExtra)) return fromExtra;
  return '';
}
