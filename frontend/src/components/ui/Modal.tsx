import React, { useEffect } from 'react';
import styles from './Modal.module.css';

/**
 * Modal — a popup window that appears in the middle of the screen on a dark backdrop.
 *
 * Pass any content as children. The modal closes when the user:
 *   - clicks the dark area around it
 *   - presses the Escape key
 *   - clicks the optional close (×) button in the header
 *
 * `title` is shown at the top. Pass `wide` to make the dialog wider.
 */
interface Props {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Extra-wide dialog (e.g. teacher filters). Takes precedence over {@link wide}. */
  extraWide?: boolean;
  /** When false, hides the small × close button at the top-right. Default: true. */
  showCloseButton?: boolean;
}

export default function Modal({ title, onClose, children, wide, extraWide, showCloseButton = true }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${extraWide ? styles.extraWide : wide ? styles.wide : ''} animate-scale`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {showCloseButton && (
              <button
                type="button"
                aria-label="Close"
                className={`btn btn-ghost btn-icon ${styles.closeBtn}`}
                onClick={onClose}
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
