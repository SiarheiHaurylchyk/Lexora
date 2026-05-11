import { type ReactNode, useEffect } from 'react';

export interface ModalProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Extra-wide dialog (e.g. teacher filters). Takes precedence over `wide`. */
  extraWide?: boolean;
  /** When false, hides the small × close button at the top-right. Default: true. */
  showCloseButton?: boolean;
}

const overlayClasses = tw`fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-5 backdrop-blur-[6px]`;
const modalClasses = tw`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[20px] border border-border2 bg-bg2 animate-scale`;

export function Modal({
  title,
  onClose,
  children,
  wide,
  extraWide,
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={overlayClasses} onClick={onClose}>
      <div
        className={cn(
          modalClasses,
          extraWide
            ? 'w-full max-w-[min(1120px,98vw)]'
            : wide
              ? 'max-w-[880px]'
              : 'max-w-[560px]',
        )}
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        {(title || showCloseButton) && (
          <div className='border-border flex items-center justify-between border-b px-6 py-4'>
            {title && <h2 className='m-0 text-lg font-bold'>{title}</h2>}
            {showCloseButton && (
              <button
                type='button'
                aria-label='Close'
                className='btn btn-ghost btn-icon text-[22px] leading-none'
                onClick={onClose}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className='overflow-y-auto px-6 py-5'>{children}</div>
      </div>
    </div>
  );
}
