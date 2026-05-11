/**
 * ConfirmProvider — concrete UI implementation of the confirm-dialog context
 * declared in `@/shared/lib/confirm`. Mounts an AlertDialog and exposes a
 * `confirm()` callback through context so any consumer can prompt the user
 * for a yes/no decision.
 */
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '@ui';

import {
  ConfirmContext,
  type ConfirmFn,
  type ConfirmOptions,
} from '@/shared/lib/confirm';

type DialogBody = Omit<ConfirmOptions, 'message'> & { message: string };

const overlayClasses = tw`fixed inset-0 z-[1100] bg-[rgba(0,0,0,0.72)] backdrop-blur-[8px] data-[state=open]:animate-fade`;
const contentClasses = tw`fixed left-1/2 top-1/2 z-[1101] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-border2 bg-bg2 px-6 pt-[22px] pb-5 shadow-[0_24px_48px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)] data-[state=open]:animate-scale`;

export default function ConfirmProvider({ children }: { children: ReactNode }) {
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

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
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

  const confirmVariant = body?.variant === 'danger' ? 'danger' : 'primary';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={overlayClasses} />
          <AlertDialog.Content className={contentClasses}>
            <AlertDialog.Title className='text-text m-0 mb-2.5 text-[17px] font-bold tracking-[-0.02em]'>
              {body?.title}
            </AlertDialog.Title>
            <AlertDialog.Description className='text-text2 m-0 mb-[22px] text-sm leading-[1.55]'>
              {body?.message}
            </AlertDialog.Description>
            <div className='flex flex-wrap justify-end gap-2.5'>
              <AlertDialog.Cancel asChild>
                <Button
                  variant='secondary'
                  type='button'
                  autoFocus={body?.variant === 'danger'}
                  onClick={() => finish(false)}
                >
                  {body?.cancelText}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant={confirmVariant}
                  type='button'
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
