import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

import type { AuthState } from './auth';
import type { SettingsState } from './settings';

export interface RootState {
  auth: AuthState;
  settings: SettingsState;
}

export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
