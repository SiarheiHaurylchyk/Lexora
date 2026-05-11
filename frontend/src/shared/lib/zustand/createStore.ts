/**
 * Thin wrapper around `zustand` so feature stores follow a consistent shape.
 *
 * Typical usage in `features/<name>/model/store.ts`:
 *
 *   import { createStore } from '@/shared/lib/zustand';
 *
 *   interface FilterState {
 *     query: string;
 *     setQuery: (value: string) => void;
 *   }
 *
 *   export const useFilterStore = createStore<FilterState>((set) => ({
 *     query: '',
 *     setQuery: (value) => set({ query: value }),
 *   }));
 *
 * The wrapper exists so we can centrally add devtools / persistence middleware
 * later without touching every store.
 */
import { create, type StateCreator } from 'zustand';

export function createStore<T>(initializer: StateCreator<T>) {
  return create<T>()(initializer);
}
