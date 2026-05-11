/**
 * Type-safe Redux hooks living in the shared layer so widgets/features/pages
 * can consume them without depending on the `app/` layer (FSD-compliant).
 *
 * The underlying store still lives in `app/store/index.ts`; the type shape is
 * declared in `@/shared/types/store.ts`.
 */
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '../types';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** Shortcut: return the whole `auth` slice in one line. */
export const useAuth = () => useAppSelector((s) => s.auth);
