/**
 * Imperative entry points for global Zustand stores. Keeps widgets/pages in
 * `features/` and `pages/` from importing store modules for one-off updates
 * (FSD-friendly).
 */
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { User } from '../types';

export function setCredentials(payload: {
  user: User;
  accessToken: string;
  refreshToken: string;
}) {
  useAuthStore.getState().setCredentials(payload);
}

export function updateTokens(payload: {
  accessToken: string;
  refreshToken: string;
}) {
  useAuthStore.getState().updateTokens(payload);
}

export function updateUser(payload: Partial<User>) {
  useAuthStore.getState().updateUser(payload);
}

export function logout() {
  useAuthStore.getState().logout();
}

export function setLanguageVoice(payload: { lang: string; voiceURI: string }) {
  useSettingsStore.getState().setLanguageVoice(payload);
}

export function setNormalRate(payload: number) {
  useSettingsStore.getState().setNormalRate(payload);
}

export function setSlowRate(payload: number) {
  useSettingsStore.getState().setSlowRate(payload);
}

export function resetSpeech() {
  useSettingsStore.getState().resetSpeech();
}
