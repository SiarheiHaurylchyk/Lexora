import { useEffect, useState } from 'react';

import { api } from '../api/api-legacy';
import { chatPathForAxios } from '../lib/chatPaths';

/**
 * Fetches a protected chat file with the JWT (axios), then exposes a temporary blob: URL for <img> / <a>.
 */
export function useAuthenticatedBlobUrl(
  storedUrl: string | null | undefined,
): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storedUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlobUrl(null);
      return undefined;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const rel = chatPathForAxios(storedUrl);
        const res = await api.get(rel, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      setBlobUrl(null);
    };
  }, [storedUrl]);

  return blobUrl;
}
