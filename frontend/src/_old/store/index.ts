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
import authReducer, { AUTH_STORAGE_KEY } from './authSlice';
import settingsReducer, { SETTINGS_STORAGE_KEY } from './settingsSlice';

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
      })
    );
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage can be disabled in private mode — we silently ignore.
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
