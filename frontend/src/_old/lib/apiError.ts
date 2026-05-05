/**
 * Pull a human-readable error message out of an axios / fetch error.
 * If we cannot find one, return null and the caller can show a generic fallback.
 */
export function getApiErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;

  if (typeof data === 'string') return data;

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
  }

  return null;
}
