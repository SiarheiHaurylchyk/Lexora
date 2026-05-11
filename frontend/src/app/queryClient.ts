/**
 * Shared QueryClient — single TanStack Query cache for the whole app.
 *
 * Defaults are conservative: 30 s freshness window (no refetch storm on
 * tab focus), 1 retry on failure (network blips), 5 min garbage-collection
 * for unused queries.
 */
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
