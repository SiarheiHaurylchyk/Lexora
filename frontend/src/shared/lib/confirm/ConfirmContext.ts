/**
 * Confirm-dialog context — defined in the shared layer so any layer
 * (entities/features/widgets/pages) can call `useConfirm()` without crossing
 * FSD boundaries. The actual dialog UI (modal, buttons, styling) lives in the
 * `app/providers/ConfirmProvider.tsx` which renders into this context.
 */
import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

/** No-op fallback so consumers don't crash when no provider is mounted. */
const noopConfirm: ConfirmFn = () => Promise.resolve(false);

export const ConfirmContext = createContext<ConfirmFn>(noopConfirm);

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
