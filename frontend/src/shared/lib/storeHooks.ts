/**
 * Zustand-хуки для глобальных сторов (`shared/stores`). Разделены по доменам,
 * чтобы компоненты подписывались только на auth или settings, а не на монолит.
 */
import { useShallow } from 'zustand/shallow';

import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

export { useAuthStore, useSettingsStore };

/**
 * Срез auth без методов — удобно для деструктуризации.
 *
 * Селектор возвращает новый объект, поэтому его ОБЯЗАТЕЛЬНО оборачивать в
 * `useShallow`. В Zustand v5 снапшоты сравниваются через `Object.is`; новый
 * объект на каждом рендере заставит `useSyncExternalStore` крутиться бесконечно
 * и выбросит React error #185 («Maximum update depth exceeded»).
 */
export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
      isAuthenticated: s.isAuthenticated,
    })),
  );
}
