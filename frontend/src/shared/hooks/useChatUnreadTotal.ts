import { useEffect, useState } from 'react';

import { chatApi } from '../api/api-legacy';

const POLL_MS = 20000;

/** Badge count for /messages — polls so teachers see new DM without reload. */
export function useChatUnreadTotal(): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await chatApi.unreadTotal();
        if (!cancelled) setTotal(data.totalUnread ?? 0);
      } catch {
        if (!cancelled) setTotal(0);
      }
    };
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return total;
}
