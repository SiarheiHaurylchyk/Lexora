/**
 * Chat attachments are returned as paths like `/api/chat/files/{uuid}.png`.
 * Our axios instance uses `baseURL: /api`, so requests must be `chat/files/...`.
 */
export function chatPathForAxios(storedUrl: string): string {
  let p = storedUrl.trim();
  if (p.startsWith('/api/')) p = p.slice(5);
  else if (p.startsWith('api/')) p = p.slice(4);
  return p.replace(/^\//, '');
}
