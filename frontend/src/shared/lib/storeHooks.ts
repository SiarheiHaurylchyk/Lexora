/**
 * Zustand hooks for global stores (`shared/stores`). Split by domain so
 * components subscribe only to auth or settings, not a monolithic root state.
 */
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

export { useAuthStore, useSettingsStore };

/** Whole auth slice shape without action methods — handy for destructuring. */
export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    isAuthenticated: s.isAuthenticated,
  }));
}
