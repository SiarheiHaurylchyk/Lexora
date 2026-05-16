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
  Target,
  Trophy,
  Users,
} from 'lucide-react';

/**
 * Описание одного пункта бокового меню.
 * `key` — ключ в `nav.*` файлах локализации (ru.json / en.json).
 */
export interface SidebarNavItemConfig {
  to: string;
  Icon: LucideIcon;
  key: string;
  /** Точное совпадение URL (для «Старт» = /home). */
  end?: boolean;
  /** Показывать только учителю / преподавателю. */
  teacherOnly?: boolean;
  /** Показывать только ученику (не преподавателю). */
  learnerOnly?: boolean;
}

/**
 * Статический список разделов боковой панели.
 * Фильтрация по роли пользователя — в хуке `useSidebarNavItems`.
 */
export const SIDEBAR_NAV_ITEMS: SidebarNavItemConfig[] = [
  { to: '/home', Icon: Home, key: 'home', end: true },
  { to: '/decks', Icon: Layers, key: 'flashcards' },
  { to: '/teachers', Icon: Target, key: 'findTeachers', learnerOnly: true },
  { to: '/classes', Icon: Users, key: 'students', teacherOnly: true },
  {
    to: '/classes',
    Icon: GraduationCap,
    key: 'myTeachers',
    learnerOnly: true,
  },
  { to: '/messages', Icon: MessageCircle, key: 'messages' },
  { to: '/schedule', Icon: Calendar, key: 'mySchedule', teacherOnly: true },
  {
    to: '/bookings',
    Icon: CalendarDays,
    key: 'myBookings',
    learnerOnly: true,
  },
  { to: '/assignments', Icon: ClipboardList, key: 'assignments' },
  { to: '/materials', Icon: Library, key: 'materials' },
  { to: '/lessons', Icon: BookOpen, key: 'lessons' },
  { to: '/ai', Icon: Bot, key: 'ai' },
  { to: '/shared', Icon: Gift, key: 'shared', learnerOnly: true },
  { to: '/progress', Icon: Trophy, key: 'progress' },
];
