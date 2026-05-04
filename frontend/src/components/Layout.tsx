import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bot,
  Calendar,
  CalendarDays,
  ClipboardList,
  Gift,
  GraduationCap,
  Home,
  Layers,
  Library,
  MessageCircle,
  Plus,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import { classNames } from '../lib/classNames';
import { userCanTeach } from '../lib/accountRole';
import LanguageSwitcher from './LanguageSwitcher';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import ClassroomReturnBar from './ClassroomReturnBar';
import { useChatUnreadTotal } from '../hooks/useChatUnreadTotal';
import { useLessonReminder } from '../hooks/useLessonReminder';
import { LessonCallProvider } from '../contexts/LessonCallContext';
import { SidebarItemTooltip, TooltipProvider } from './ui';
import styles from './Layout.module.css';

/**
 * Layout — the screen frame for every authenticated page.
 *
 * Sidebar: logo, “+ New Deck”, links (home hub, flashcards, …). Top bar: language,
 * notifications, account. Main content: <Outlet />.
 *
 * The sidebar can be collapsed to icons-only by clicking the Lexora logo
 * (star mark + name when expanded).
 */

/** Single navigation link in the sidebar. */
interface NavItem {
  to: string;
  Icon: LucideIcon;
  /** Translation key under the "nav" section in the locales file. */
  key: string;
  /** Only match exact path (e.g. `/home` vs `/home/...`). */
  end?: boolean;
}

/** Sidebar: `/home` hub, `/decks` flashcards, role-specific items, etc. */
const NAV_ITEMS: (NavItem & { teacherOnly?: boolean; learnerOnly?: boolean })[] = [
  { to: '/home', Icon: Home, key: 'home', end: true },
  { to: '/decks', Icon: Layers, key: 'flashcards' },
  { to: '/teachers', Icon: Target, key: 'findTeachers', learnerOnly: true },
  { to: '/classes', Icon: Users, key: 'students', teacherOnly: true },
  { to: '/classes', Icon: GraduationCap, key: 'myTeachers', learnerOnly: true },
  { to: '/messages', Icon: MessageCircle, key: 'messages' },
  { to: '/schedule', Icon: Calendar, key: 'mySchedule', teacherOnly: true },
  { to: '/bookings', Icon: CalendarDays, key: 'myBookings', learnerOnly: true },
  { to: '/assignments', Icon: ClipboardList, key: 'assignments' },
  { to: '/materials', Icon: Library, key: 'materials' },
  { to: '/lessons', Icon: BookOpen, key: 'lessons' },
  { to: '/ai', Icon: Bot, key: 'ai' },
  { to: '/shared', Icon: Gift, key: 'shared', learnerOnly: true },
  { to: '/progress', Icon: Trophy, key: 'progress' },
];

/** Main column uses full width (no 10% gutters): study, chat hub, direct chat, weekly schedule. */
function isMainFullBleed(pathname: string): boolean {
  if (/^\/decks\/\d+\/study\/[^/]+$/.test(pathname)) return true;
  if (pathname === '/schedule') return true;
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true;
  if (/^\/chat\/[^/]+$/.test(pathname)) return true;
  if (pathname === '/lesson-call') return true;
  if (/^\/class\/[^/]+$/.test(pathname)) return true;
  return false;
}

export default function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const mainFullBleed = isMainFullBleed(pathname);
  const hideGlobalTopBar = /^\/class\/[^/]+$/.test(pathname);
  const chatUnread = useChatUnreadTotal();
  useLessonReminder();

  return (
    <TooltipProvider>
      <LessonCallProvider>
        <div className={styles.root}>
        <aside className={classNames(styles.sidebar, collapsed && styles.collapsed)}>
          <div className={classNames(styles.brandRow, collapsed && styles.brandRowCollapsed)}>
            <SidebarItemTooltip label={t('nav.expand')} enabled={collapsed}>
              <button
                type="button"
                className={styles.brandButton}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
                aria-expanded={!collapsed}
              >
                <span className={classNames(styles.logoMark, collapsed && styles.logoMarkCollapsed)}>
                  <Sparkles
                    size={collapsed ? 26 : 22}
                    strokeWidth={2.25}
                    className={styles.logoGlyph}
                    aria-hidden
                  />
                </span>
                {!collapsed && <span className={styles.brandName}>Lexora</span>}
              </button>
            </SidebarItemTooltip>
          </div>

          <div className={styles.section}>
            <SidebarItemTooltip label={t('nav.newDeck')} enabled={collapsed}>
              <button
                type="button"
                className={classNames('btn', 'btn-primary', styles.newDeckBtn, collapsed && styles.newDeckCollapsed)}
                onClick={() => navigate('/decks?new=1')}
              >
                <span className={classNames(styles.navIcon, collapsed && styles.navIconLg)}>
                  <Plus
                    size={collapsed ? 26 : 18}
                    strokeWidth={2.5}
                    className={styles.navGlyph}
                    aria-hidden
                  />
                </span>
                {!collapsed && <span>{t('nav.newDeck')}</span>}
              </button>
            </SidebarItemTooltip>
          </div>

          <nav className={classNames(styles.nav, collapsed && styles.navCollapsed)}>
            {NAV_ITEMS.filter((item) => {
              if (item.teacherOnly && !userCanTeach(user?.role)) return false;
              if (item.learnerOnly && userCanTeach(user?.role)) return false;
              return true;
            }).map(({ to, Icon, key, end }) => {
              const label = t(`nav.${key}`);
              return (
                <SidebarItemTooltip key={`${to}-${key}`} label={label} enabled={collapsed}>
                  <NavLink
                    to={to}
                    end={Boolean(end)}
                    className={({ isActive }) => classNames(styles.navLink, isActive && styles.navLinkActive)}
                  >
                    <span
                      className={classNames(
                        styles.navIcon,
                        collapsed && styles.navIconLg,
                        collapsed && key === 'messages' && chatUnread > 0 && styles.navIconUnreadDot,
                      )}
                    >
                      <Icon
                        size={collapsed ? 24 : 18}
                        strokeWidth={2.25}
                        className={styles.navGlyph}
                        aria-hidden
                      />
                    </span>
                    {!collapsed && (
                      <>
                        <span className={styles.navLabel}>{label}</span>
                        {key === 'messages' && chatUnread > 0 && (
                          <span className={styles.navUnread}>{chatUnread > 99 ? '99+' : chatUnread}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                </SidebarItemTooltip>
              );
            })}
          </nav>
        </aside>

        <div className={classNames(styles.shell, collapsed && styles.shellCollapsed)}>
          {!hideGlobalTopBar && (
            <header className={styles.topBar}>
              <div className={styles.topBarSpacer} />
              <div className={styles.topBarActions}>
                <LanguageSwitcher compact className={styles.topLang} />
                <NotificationBell placement="header" />
                <UserMenu placement="header" />
              </div>
            </header>
          )}
          <ClassroomReturnBar />
          <main className={classNames(styles.main, mainFullBleed && styles.mainStudy)}>
            <Outlet />
          </main>
        </div>
        </div>
      </LessonCallProvider>
    </TooltipProvider>
  );
}
