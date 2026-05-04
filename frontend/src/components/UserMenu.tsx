import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, GraduationCap, LogOut, Settings, Trophy, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { userCanTeach } from '../lib/accountRole';
import { classNames } from '../lib/classNames';
import styles from './UserMenu.module.css';

/**
 * UserMenu — popover with account actions (Settings, Become a teacher, Log out).
 *
 * The menu is rendered with a portal so it is not clipped by the sidebar overflow.
 * Position follows the trigger on scroll/resize.
 */
interface Props {
  /** Top bar: avatar-only trigger; menu opens below. */
  placement?: 'header';
}

const GAP_PX = 10;
const MENU_MIN_WIDTH = 248;

export default function UserMenu({ placement }: Props) {
  const isHeader = placement === 'header';
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.max(MENU_MIN_WIDTH, r.width);
    let left = r.left;
    const vw = window.innerWidth;
    left = Math.min(Math.max(GAP_PX, left), vw - width - GAP_PX);
    if (isHeader) {
      const top = r.bottom + GAP_PX;
      const maxHeight = Math.min(420, window.innerHeight - top - GAP_PX);
      setMenuStyle({ left, width, top, maxHeight });
    } else {
      const bottom = window.innerHeight - r.top + GAP_PX;
      setMenuStyle({ left, width, bottom });
    }
  }, [isHeader]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  React.useEffect(() => {
    if (!open) return undefined;

    const onMouseDown = (e: MouseEvent) => {
      const node = e.target as Node;
      if (wrapRef.current?.contains(node)) return;
      if (menuRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.username || 'U')[0].toUpperCase();
  const canTeach = userCanTeach(user.role);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    dispatch(logout());
    navigate('/');
  };

  const menu =
    open &&
    menuStyle &&
    createPortal(
      <div
        ref={menuRef}
        className={styles.popover}
        style={menuStyle}
        role="menu"
      >
        <div className={styles.popHeader}>
          <div className={styles.popName}>{user.displayName || user.username}</div>
          <div className={styles.popEmail}>{user.email}</div>
        </div>

        <button type="button" className={styles.item} role="menuitem" onClick={() => go('/profile')}>
          <span className={styles.itemIcon} aria-hidden>
            <UserCircle size={16} strokeWidth={2.25} />
          </span>
          <span>{t('userMenu.profile')}</span>
        </button>

        <button type="button" className={styles.item} role="menuitem" onClick={() => go('/progress')}>
          <span className={styles.itemIcon} aria-hidden>
            <Trophy size={16} strokeWidth={2.25} />
          </span>
          <span>{t('userMenu.progress')}</span>
        </button>

        <button type="button" className={styles.item} role="menuitem" onClick={() => go('/settings')}>
          <span className={styles.itemIcon} aria-hidden>
            <Settings size={16} strokeWidth={2.25} />
          </span>
          <span>{t('userMenu.settings')}</span>
        </button>

        {!canTeach && (
          <button
            type="button"
            className={`${styles.item} ${styles.itemAccent}`}
            role="menuitem"
            onClick={() => go('/become-teacher')}
          >
            <span className={styles.itemIcon} aria-hidden>
              <GraduationCap size={16} strokeWidth={2.25} />
            </span>
            <span>{t('userMenu.becomeTeacher')}</span>
          </button>
        )}

        <div className={styles.divider} />

        <button
          type="button"
          className={`${styles.item} ${styles.itemDanger}`}
          role="menuitem"
          onClick={handleLogout}
        >
          <span className={styles.itemIcon} aria-hidden>
            <LogOut size={16} strokeWidth={2.25} />
          </span>
          <span>{t('common.logout')}</span>
        </button>
      </div>,
      document.body,
    );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={classNames(
          styles.trigger,
          open && styles.triggerOpen,
          isHeader && styles.triggerHeader,
        )}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className={classNames(styles.avatarImg, isHeader && styles.avatarImgHeader)}
          />
        ) : (
          <span className={classNames(styles.avatar, isHeader && styles.avatarHeader)}>{initial}</span>
        )}

        {!isHeader && (
          <>
            <span className={styles.identity}>
              <span className={styles.name}>{user.displayName || user.username}</span>
              <span className={styles.role}>
                {t(`profile.accountRole.${user.role || 'USER'}`)}
              </span>
            </span>
            <span className={styles.caret} aria-hidden>
              <ChevronDown size={16} strokeWidth={2.25} />
            </span>
          </>
        )}
      </button>

      {menu}
    </div>
  );
}
