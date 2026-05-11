export interface SpeechSettings {
  voices: Record<string, string>;
  normalRate: number;
  slowRate: number;
}

export interface SettingsState {
  speech: SpeechSettings;
}
