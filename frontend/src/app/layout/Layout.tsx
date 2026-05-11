import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SidebarItemTooltip, TooltipProvider } from '@ui';
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

import { ClassroomReturnBar } from '@/widgets/ClassroomReturnBar';
import { LanguageSwitcher } from '@/widgets/LanguageSwitcher';
import { NotificationBell } from '@/widgets/NotificationBell';
import { UserMenu } from '@/widgets/UserMenu';

import { useChatUnreadTotal } from '@/shared/hooks/useChatUnreadTotal';
import { useLessonReminder } from '@/shared/hooks/useLessonReminder';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useAppSelector } from '@/shared/lib/storeHooks';

interface NavItem {
  to: string;
  Icon: LucideIcon;
  key: string;
  end?: boolean;
}

const NAV_ITEMS: (NavItem & {
  teacherOnly?: boolean;
  learnerOnly?: boolean;
})[] = [
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

function isMainFullBleed(pathname: string): boolean {
  if (/^\/decks\/\d+\/study\/[^/]+$/.test(pathname)) return true;
  if (pathname === '/schedule') return true;
  if (pathname === '/messages' || pathname.startsWith('/messages/'))
    return true;
  if (/^\/chat\/[^/]+$/.test(pathname)) return true;
  if (pathname === '/lesson-call') return true;
  if (/^\/class\/[^/]+$/.test(pathname)) return true;
  return false;
}

const sidebarBase = tw`fixed left-0 top-0 bottom-0 z-[100] flex w-[240px] flex-col border-r border-border bg-bg2 py-5 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`;
const sidebarCollapsed = tw`!w-[84px]`;
const navLinkBase = tw`flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm text-text2 no-underline transition-colors duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-text`;
const navLinkActive = tw`!bg-[rgba(124,58,237,0.12)] !text-brand-light !font-semibold`;
const shellBase = tw`flex min-h-screen flex-1 flex-col ml-[240px] transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`;
const shellCollapsed = tw`!ml-[84px]`;

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
      <div className='flex min-h-screen'>
        <aside className={cn(sidebarBase, collapsed && sidebarCollapsed)}>
          <div
            className={cn(
              'mb-4 flex items-center gap-3 px-5',
              collapsed && 'justify-center px-2',
            )}
          >
            <SidebarItemTooltip label={t('nav.expand')} enabled={collapsed}>
              <button
                type='button'
                className='text-text flex flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent'
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
                aria-expanded={!collapsed}
              >
                <span
                  className={cn(
                    'from-brand to-accent flex shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br text-white',
                    collapsed ? 'h-10 w-10' : 'h-9 w-9',
                  )}
                >
                  <Sparkles
                    size={collapsed ? 26 : 22}
                    strokeWidth={2.25}
                    className='drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                    aria-hidden
                  />
                </span>
                {!collapsed && (
                  <span className='font-display text-[22px] font-extrabold tracking-[-0.02em]'>
                    Lexora
                  </span>
                )}
              </button>
            </SidebarItemTooltip>
          </div>

          <div className={cn('mb-4 px-3', collapsed && 'px-2')}>
            <SidebarItemTooltip label={t('nav.newDeck')} enabled={collapsed}>
              <button
                type='button'
                className={cn(
                  'btn btn-primary w-full justify-center',
                  collapsed && '!px-0',
                )}
                onClick={() => navigate('/decks?new=1')}
              >
                <span className='inline-flex'>
                  <Plus
                    size={collapsed ? 26 : 18}
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
                {!collapsed && <span>{t('nav.newDeck')}</span>}
              </button>
            </SidebarItemTooltip>
          </div>

          <nav
            className={cn(
              'flex flex-1 flex-col gap-0.5 overflow-y-auto px-3',
              collapsed && 'px-2',
            )}
          >
            {NAV_ITEMS.filter((item) => {
              if (item.teacherOnly && !userCanTeach(user?.role)) return false;
              if (item.learnerOnly && userCanTeach(user?.role)) return false;
              return true;
            }).map(({ to, Icon, key, end }) => {
              const label = t(`nav.${key}`);
              return (
                <SidebarItemTooltip
                  key={`${to}-${key}`}
                  label={label}
                  enabled={collapsed}
                >
                  <NavLink
                    to={to}
                    end={Boolean(end)}
                    className={({ isActive }) =>
                      cn(
                        navLinkBase,
                        isActive && navLinkActive,
                        collapsed && 'justify-center px-2',
                      )
                    }
                  >
                    <span
                      className={cn(
                        'relative inline-flex items-center justify-center',
                        collapsed ? 'h-6 w-6' : 'h-[22px] w-[22px]',
                      )}
                    >
                      <Icon
                        size={collapsed ? 24 : 18}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      {collapsed && key === 'messages' && chatUnread > 0 && (
                        <span className='bg-danger absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full' />
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className='flex-1 truncate'>{label}</span>
                        {key === 'messages' && chatUnread > 0 && (
                          <span className='bg-danger ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white'>
                            {chatUnread > 99 ? '99+' : chatUnread}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </SidebarItemTooltip>
              );
            })}
          </nav>
        </aside>

        <div className={cn(shellBase, collapsed && shellCollapsed)}>
          {!hideGlobalTopBar && (
            <header className='border-border bg-bg flex h-14 shrink-0 items-center gap-3 border-b px-4'>
              <div className='flex-1' />
              <div className='flex items-center gap-2'>
                <LanguageSwitcher compact />
                <NotificationBell placement='header' />
                <UserMenu placement='header' />
              </div>
            </header>
          )}
          <ClassroomReturnBar />
          <main
            className={cn(
              'min-w-0 flex-1',
              mainFullBleed ? 'flex flex-col' : 'px-[10%]',
            )}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
