import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SpeechSettings {
  voices: Record<string, string>;
  normalRate: number;
  slowRate: number;
}

export interface SettingsState {
  speech: SpeechSettings;
}

const STORAGE_KEY = 'lexora-settings';

const DEFAULT_STATE: SettingsState = {
  speech: {
    voices: {},
    normalRate: 0.95,
    slowRate: 0.5,
  },
};

function loadInitial(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      speech: {
        voices: parsed.speech?.voices ?? {},
        normalRate: parsed.speech?.normalRate ?? DEFAULT_STATE.speech.normalRate,
        slowRate: parsed.speech?.slowRate ?? DEFAULT_STATE.speech.slowRate,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitial(),
  reducers: {
    setLanguageVoice: (state, action: PayloadAction<{ lang: string; voiceURI: string }>) => {
      const { lang, voiceURI } = action.payload;
      if (voiceURI) state.speech.voices[lang] = voiceURI;
      else delete state.speech.voices[lang];
    },
    setNormalRate: (state, action: PayloadAction<number>) => {
      state.speech.normalRate = clampRate(action.payload);
    },
    setSlowRate: (state, action: PayloadAction<number>) => {
      state.speech.slowRate = clampRate(action.payload);
    },
    resetSpeech: (state) => {
      state.speech = { ...DEFAULT_STATE.speech, voices: {} };
    },
  },
});

function clampRate(r: number) {
  return Math.max(0.1, Math.min(2, r));
}

export const { setLanguageVoice, setNormalRate, setSlowRate, resetSpeech } = settingsSlice.actions;
export const SETTINGS_STORAGE_KEY = STORAGE_KEY;
export default settingsSlice.reducer;
