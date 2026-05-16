/**
 * User preferences (speech / TTS). Separate from auth to keep stores small and
 * avoid unrelated rerenders when only voice settings change.
 */
import { createStore } from '../lib/zustand/createStore';
import type { SettingsState } from '../types';

export const SETTINGS_STORAGE_KEY = 'lexora-settings';

const DEFAULT_STATE: SettingsState = {
  speech: {
    voices: {},
    normalRate: 0.95,
    slowRate: 0.5,
  },
};

function loadInitial(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      speech: {
        voices: parsed.speech?.voices ?? {},
        normalRate:
          parsed.speech?.normalRate ?? DEFAULT_STATE.speech.normalRate,
        slowRate: parsed.speech?.slowRate ?? DEFAULT_STATE.speech.slowRate,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function clampRate(r: number) {
  return Math.max(0.1, Math.min(2, r));
}

type SettingsActions = {
  setLanguageVoice: (payload: { lang: string; voiceURI: string }) => void;
  setNormalRate: (rate: number) => void;
  setSlowRate: (rate: number) => void;
  resetSpeech: () => void;
};

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = createStore<SettingsStore>((set) => ({
  ...loadInitial(),
  setLanguageVoice: ({ lang, voiceURI }) =>
    set((s) => {
      const voices = { ...s.speech.voices };
      if (voiceURI) voices[lang] = voiceURI;
      else delete voices[lang];
      return { speech: { ...s.speech, voices } };
    }),
  setNormalRate: (rate) =>
    set((s) => ({
      speech: { ...s.speech, normalRate: clampRate(rate) },
    })),
  setSlowRate: (rate) =>
    set((s) => ({
      speech: { ...s.speech, slowRate: clampRate(rate) },
    })),
  resetSpeech: () =>
    set({
      speech: { ...DEFAULT_STATE.speech, voices: {} },
    }),
}));

useSettingsStore.subscribe((state) => {
  try {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ speech: state.speech }),
    );
  } catch {
    // localStorage may be unavailable.
  }
});
