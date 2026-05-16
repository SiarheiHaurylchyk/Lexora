import { useMemo } from 'react';

import { SIDEBAR_NAV_ITEMS, type SidebarNavItemConfig } from './navItems';

import { userCanTeach } from '@/shared/lib/accountRole';
import { useAuthStore } from '@/shared/lib/storeHooks';

/**
 * Возвращает пункты меню, доступные текущему пользователю по роли.
 * Учитель не видит learnerOnly-пункты и наоборот.
 */
export function useSidebarNavItems(): SidebarNavItemConfig[] {
  const userRole = useAuthStore((s) => s.user?.role);
  const isTeacher = userCanTeach(userRole);

  return useMemo(
    () =>
      SIDEBAR_NAV_ITEMS.filter((item) => {
        if (item.teacherOnly && !isTeacher) return false;
        if (item.learnerOnly && isTeacher) return false;
        return true;
      }),
    [isTeacher],
  );
}
