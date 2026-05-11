import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Settings,
  Trophy,
  UserCircle,
} from 'lucide-react';

import { userCanTeach } from '@/shared/lib/accountRole';
import { logout } from '@/shared/lib/storeActions';
import { useAppDispatch, useAppSelector } from '@/shared/lib/storeHooks';

interface UserMenuProps {
  /** Top bar: avatar-only trigger; menu opens below. */
  placement?: 'header';
}

const GAP_PX = 10;
const MENU_MIN_WIDTH = 248;

const triggerBase = tw`flex items-center gap-2.5 cursor-pointer rounded-[12px] border border-transparent bg-transparent px-2.5 py-1.5 text-text transition-[background,border-color] duration-200 hover:bg-bg3`;
const triggerOpen = tw`bg-bg3 border-border2`;
const triggerHeader = tw`!gap-0 !p-0`;
const itemBase = tw`flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-3.5 py-2.5 text-left text-sm text-text transition-colors duration-200 hover:bg-bg3`;
const itemAccent = tw`text-brand-light`;
const itemDanger = tw`text-danger hover:bg-[rgba(239,68,68,0.08)]`;

export function UserMenu({ placement }: UserMenuProps) {
  const isHeader = placement === 'header';
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

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

  useEffect(() => {
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
        className='border-border2 bg-bg2 fixed z-[5300] flex flex-col overflow-y-auto rounded-[12px] border py-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]'
        style={menuStyle}
        role='menu'
      >
        <div className='border-border border-b px-3.5 py-2.5'>
          <div className='text-text text-sm font-semibold'>
            {user.displayName || user.username}
          </div>
          <div className='text-text3 mt-0.5 text-xs'>{user.email}</div>
        </div>

        <button
          type='button'
          className={itemBase}
          role='menuitem'
          onClick={() => go('/profile')}
        >
          <span className='text-text3 inline-flex' aria-hidden>
            <UserCircle size={16} strokeWidth={2.25} />
          </span>
          <span>{t('userMenu.profile')}</span>
        </button>

        <button
          type='button'
          className={itemBase}
          role='menuitem'
          onClick={() => go('/progress')}
        >
          <span className='text-text3 inline-flex' aria-hidden>
            <Trophy size={16} strokeWidth={2.25} />
          </span>
          <span>{t('userMenu.progress')}</span>
        </button>

        <button
          type='button'
          className={itemBase}
          role='menuitem'
          onClick={() => go('/settings')}
        >
          <span className='text-text3 inline-flex' aria-hidden>
            <Settings size={16} strokeWidth={2.25} />
          </span>
          <span>{t('userMenu.settings')}</span>
        </button>

        {!canTeach && (
          <button
            type='button'
            className={cn(itemBase, itemAccent)}
            role='menuitem'
            onClick={() => go('/become-teacher')}
          >
            <span className='inline-flex' aria-hidden>
              <GraduationCap size={16} strokeWidth={2.25} />
            </span>
            <span>{t('userMenu.becomeTeacher')}</span>
          </button>
        )}

        <div className='bg-border my-1.5 h-px' />

        <button
          type='button'
          className={cn(itemBase, itemDanger)}
          role='menuitem'
          onClick={handleLogout}
        >
          <span className='inline-flex' aria-hidden>
            <LogOut size={16} strokeWidth={2.25} />
          </span>
          <span>{t('common.logout')}</span>
        </button>
      </div>,
      document.body,
    );

  return (
    <div className='relative inline-block' ref={wrapRef}>
      <button
        ref={triggerRef}
        type='button'
        className={cn(
          triggerBase,
          open && triggerOpen,
          isHeader && triggerHeader,
        )}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup='menu'
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=''
            className={cn(
              'shrink-0 rounded-full object-cover',
              isHeader ? 'h-9 w-9' : 'h-8 w-8',
            )}
          />
        ) : (
          <span
            className={cn(
              'from-brand to-accent flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white',
              isHeader ? 'h-9 w-9 text-sm' : 'h-8 w-8 text-xs',
            )}
          >
            {initial}
          </span>
        )}

        {!isHeader && (
          <>
            <span className='flex min-w-0 flex-col'>
              <span className='text-text truncate text-sm font-semibold'>
                {user.displayName || user.username}
              </span>
              <span className='text-text3 text-xs'>
                {t(`profile.accountRole.${user.role || 'USER'}`)}
              </span>
            </span>
            <span className='text-text3 ml-auto inline-flex' aria-hidden>
              <ChevronDown size={16} strokeWidth={2.25} />
            </span>
          </>
        )}
      </button>

      {menu}
    </div>
  );
}
