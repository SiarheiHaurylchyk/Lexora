/**
 * Redux store for the whole frontend.
 *
 * Two slices live inside:
 *   - auth     : signed-in user and their JWT tokens
 *   - settings : voice / TTS preferences
 *
 * After every change we also save both slices into localStorage so the user
 * stays signed in and keeps their voice settings after a page refresh.
 */
import { configureStore } from '@reduxjs/toolkit';

import authReducer, {
  AUTH_STORAGE_KEY,
  logout,
  updateTokens,
} from './authSlice';
import settingsReducer, { SETTINGS_STORAGE_KEY } from './settingsSlice';

import { configureLegacyApiAuth } from '@/shared/api/api-legacy';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
  },
});

// Persist auth + settings to localStorage on every change.
store.subscribe(() => {
  try {
    const { auth, settings } = store.getState();
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: auth.user,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
      }),
    );
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage can be disabled in private mode — we silently ignore.
  }
});

// Wire the legacy axios client to this store so it can read tokens and
// dispatch refresh / logout actions without crossing FSD layer boundaries.
configureLegacyApiAuth({
  getAccessToken: () => store.getState().auth.accessToken,
  getRefreshToken: () => store.getState().auth.refreshToken,
  onTokensRefreshed: (tokens) => store.dispatch(updateTokens(tokens)),
  onAuthFailure: () => store.dispatch(logout()),
});

export type { AppDispatch, RootState } from '@/shared/types';
