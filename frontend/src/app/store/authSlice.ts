/**
 * Auth slice — keeps the signed-in user and their tokens in Redux.
 *
 * The shape lives in `@/shared/types/auth.ts` so widgets/features can use it
 * without crossing FSD layer boundaries.
 *
 * The whole slice is also persisted to localStorage (see store/index.ts).
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { AuthState, User } from '@/shared/types';

export type { AuthState, User } from '@/shared/types';

const STORAGE_KEY = 'lexora-auth';

/** Read the saved auth state from localStorage on app start. */
function loadInitial(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };
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

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitial(),
  reducers: {
    /** Store the user + tokens after a successful login or registration. */
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    /** Replace just the tokens (used after refresh). */
    updateTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    /** Patch some fields on the current user (display name, avatar, ...). */
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    /** Clear everything — used on sign out and on auth errors. */
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, updateTokens, updateUser, logout } =
  authSlice.actions;
export const AUTH_STORAGE_KEY = STORAGE_KEY;
export default authSlice.reducer;
