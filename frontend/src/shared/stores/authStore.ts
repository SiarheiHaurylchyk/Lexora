/**
 * Global auth state (user + JWT). Persisted to localStorage; wired to axios via
 * `configureLegacyApiAuth` so refresh/logout stay in sync with the UI.
 */
import { configureLegacyApiAuth } from '../api/api-legacy';
import { createStore } from '../lib/zustand/createStore';
import type { AuthState, User } from '../types';

export const AUTH_STORAGE_KEY = 'lexora-auth';

function loadInitial(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      isAuthenticated: Boolean(parsed.accessToken && parsed.user),
    };
  } catch {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }
}

type AuthActions = {
  setCredentials: (payload: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  updateTokens: (payload: {
    accessToken: string;
    refreshToken: string;
  }) => void;
  updateUser: (payload: Partial<User>) => void;
  logout: () => void;
};

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = createStore<AuthStore>((set, get) => ({
  ...loadInitial(),
  setCredentials: (payload) =>
    set({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      isAuthenticated: true,
    }),
  updateTokens: (payload) =>
    set({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    }),
  updateUser: (payload) => {
    const u = get().user;
    if (u) set({ user: { ...u, ...payload } });
  },
  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    }),
}));

useAuthStore.subscribe((state) => {
  try {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    );
  } catch {
    // localStorage may be unavailable (private mode).
  }
});

configureLegacyApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (tokens) => useAuthStore.getState().updateTokens(tokens),
  onAuthFailure: () => useAuthStore.getState().logout(),
});
