/**
 * Helpers to work with YouTube video URLs.
 *
 * We accept any common YouTube URL form and turn it into a video id.
 * The video id can then be used to build an embed URL that plays inside our app
 * (no redirect to youtube.com).
 *
 * Supported formats:
 *   https://www.youtube.com/watch?v=ID
 *   https://m.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   ID (a raw 11-character id is also accepted)
 */

/** Get the YouTube video id from any URL or raw id. Returns null when nothing found. */
export function getYouTubeId(input: string): string | null {
  if (!input) return null;
  const text = input.trim();

  // Case 1: it already looks like a raw 11-char video id.
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

  // Case 2: short form like https://youtu.be/ID
  if (host === 'youtu.be') {
    const id = url.pathname.replace('/', '');
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  // Case 3: full youtube.com (and music.youtube.com).
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    // /watch?v=ID
    const v = url.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    // /embed/ID  or  /shorts/ID  or  /v/ID
    const match = url.pathname.match(/\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[2];
  }

  return null;
}

/** Build an embeddable iframe URL from any YouTube URL or id. Returns null on bad input. */
export function getYouTubeEmbedUrl(input: string): string | null {
  const id = getYouTubeId(input);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

/** Build a thumbnail image URL for a YouTube video (used as a preview). */
export function getYouTubeThumbUrl(input: string): string | null {
  const id = getYouTubeId(input);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
