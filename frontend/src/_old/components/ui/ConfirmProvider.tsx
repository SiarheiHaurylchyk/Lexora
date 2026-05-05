import * as AlertDialog from '@radix-ui/react-alert-dialog';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import styles from './ConfirmDialog.module.css';

export type ConfirmOptions = {
  /** Short heading; defaults to a generic “Confirm” label. */
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
};

type DialogBody = Omit<ConfirmOptions, 'message'> & { message: string };

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(() =>
  Promise.resolve(false),
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

/**
 * Global confirmation dialogs (Radix Alert Dialog) styled like Lexora modals.
 * Wrap the app once and call `useConfirm()` where you would use `window.confirm`.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<DialogBody | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const finish = useCallback((value: boolean) => {
    const resolve = resolveRef.current;
    if (!resolve) return;
    resolveRef.current = null;
    resolve(value);
    setOpen(false);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setBody({
          title: opts.title ?? t('common.confirmTitle'),
          message: opts.message,
          confirmText: opts.confirmText ?? t('common.confirm'),
          cancelText: opts.cancelText ?? t('common.cancel'),
          variant: opts.variant ?? 'default',
        });
        setOpen(true);
      }),
    [t],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) finish(false);
    },
    [finish],
  );

  const value = useMemo(() => confirm, [confirm]);

  const confirmKind = body?.variant === 'danger' ? 'danger' : 'primary';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={styles.overlay} />
          <AlertDialog.Content className={styles.content}>
            <AlertDialog.Title className={styles.title}>{body?.title}</AlertDialog.Title>
            <AlertDialog.Description className={styles.description}>
              {body?.message}
            </AlertDialog.Description>
            <div className={styles.actions}>
              <AlertDialog.Cancel asChild>
                <Button
                  kind="secondary"
                  type="button"
                  autoFocus={body?.variant === 'danger'}
                  onClick={() => finish(false)}
                >
                  {body?.cancelText}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  kind={confirmKind}
                  type="button"
                  autoFocus={body?.variant !== 'danger'}
                  onClick={() => finish(true)}
                >
                  {body?.confirmText}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
