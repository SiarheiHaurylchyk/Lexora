/**
 * Type-safe Redux hooks.
 * Use these instead of plain `useDispatch` / `useSelector` so TypeScript can
 * infer the right state and action types for our store.
 */
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

/** Same as `useDispatch`, but typed for our AppDispatch. */
export const useAppDispatch: () => AppDispatch = useDispatch;

/** Same as `useSelector`, but typed for our RootState. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** Shortcut: return the whole `auth` slice in one line. */
export const useAuth = () => useAppSelector((s) => s.auth);
