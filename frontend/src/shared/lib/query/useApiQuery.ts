/**
 * Thin wrappers around TanStack Query that use the project-wide $api axios
 * instance. Pages should call `useApiQuery` / `useApiMutation` instead of
 * mixing axios calls with raw `useEffect` + `useState` (which trips the
 * `react-hooks/set-state-in-effect` lint rule).
 */
import {
  type InfiniteData,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  useMutation,
  type UseMutationOptions,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { $api } from '../../api/api';

type QueryKey = readonly unknown[];

interface ApiQueryOptions<TData> extends Omit<
  UseQueryOptions<TData, Error, TData, QueryKey>,
  'queryKey' | 'queryFn'
> {
  /** Stable key identifying the request — used for cache lookup and invalidation. */
  queryKey: QueryKey;
  /** Endpoint path relative to the API base URL (e.g. `/decks/${id}`). */
  url: string;
  /** Optional axios config (params, headers, etc.). */
  config?: AxiosRequestConfig;
}

/**
 * GET helper. Returns the unwrapped response body (not the AxiosResponse).
 *
 * @example
 *   const { data: deck, isLoading } = useApiQuery<Deck>({
 *     queryKey: ['deck', id],
 *     url: `/decks/${id}`,
 *     enabled: Number.isFinite(id),
 *   });
 */
export function useApiQuery<TData>({
  queryKey,
  url,
  config,
  ...rest
}: ApiQueryOptions<TData>) {
  return useQuery<TData, Error, TData, QueryKey>({
    queryKey,
    queryFn: async () => {
      const res = await $api.get<TData>(url, config);
      return res.data;
    },
    ...rest,
  });
}

type ApiMethod = 'post' | 'put' | 'patch' | 'delete';

interface ApiMutationOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
> {
  /** HTTP method. Default: 'post'. */
  method?: ApiMethod;
  /** Endpoint URL builder — receives the mutation variables. */
  url: (variables: TVariables) => string;
  /** Optional body builder — by default the variables object is sent as-is. */
  body?: (variables: TVariables) => unknown;
}

/**
 * POST/PUT/PATCH/DELETE helper. Returns the unwrapped response body.
 *
 * @example
 *   const createDeck = useApiMutation<Deck, NewDeckPayload>({
 *     url: () => '/decks',
 *     onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decks'] }),
 *   });
 *   createDeck.mutate({ title: 'New' });
 */
export function useApiMutation<TData, TVariables = void>({
  method = 'post',
  url,
  body,
  ...rest
}: ApiMutationOptions<TData, TVariables>) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const target = url(variables);
      const payload = body ? body(variables) : variables;
      const res =
        method === 'delete'
          ? await $api.delete<TData>(target, { data: payload })
          : await $api[method]<TData>(target, payload);
      return res.data;
    },
    ...rest,
  });
}

interface ApiInfiniteQueryOptions<TPage> extends Omit<
  UseInfiniteQueryOptions<TPage, Error, InfiniteData<TPage>, QueryKey, number>,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
> {
  /** Stable cache key. */
  queryKey: QueryKey;
  /** Endpoint URL — receives the current page index (0-based by default). */
  url: (pageParam: number) => string;
  /** First page index (default 0). */
  initialPageParam?: number;
  /** Decide whether more pages exist. Receives the last page and all pages. */
  getNextPageParam: (
    lastPage: TPage,
    allPages: TPage[],
    lastPageParam: number,
  ) => number | undefined;
  /** Optional axios config. */
  config?: AxiosRequestConfig;
}

/**
 * Paginated GET helper for endpoints with classic "?page=N" pagination.
 *
 * @example
 *   const decksInfinite = useApiInfiniteQuery<Page<Deck>>({
 *     queryKey: ['public-decks'],
 *     url: (page) => `/decks/public?page=${page}`,
 *     getNextPageParam: (last, all) =>
 *       last.content.length < 20 ? undefined : all.length,
 *   });
 */
export function useApiInfiniteQuery<TPage>({
  queryKey,
  url,
  initialPageParam = 0,
  getNextPageParam,
  config,
  ...rest
}: ApiInfiniteQueryOptions<TPage>) {
  return useInfiniteQuery<TPage, Error, InfiniteData<TPage>, QueryKey, number>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const res = await $api.get<TPage>(url(pageParam), config);
      return res.data;
    },
    initialPageParam,
    getNextPageParam,
    ...rest,
  });
}
