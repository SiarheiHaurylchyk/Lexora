import { useTranslation } from 'react-i18next';

import {
  SIDEBAR_NAV_ITEM_LIST_GAP_PX,
  SIDEBAR_NAV_LIST_PADDING_X_COLLAPSED_PX,
  SIDEBAR_NAV_LIST_PADDING_X_EXPANDED_PX,
} from './sidebarLayout';
import { SidebarNavItem } from './SidebarNavItem';
import { useSidebarNavItems } from './useSidebarNavItems';

/** Пропсы списка навигации боковой панели. */
interface SidebarNavProps {
  isCollapsed: boolean;
  /** Общее число непрочитанных в чатах — для бейджа у «Сообщения». */
  chatUnreadTotal: number;
}

const navList = tw`flex w-full flex-1 flex-col overflow-y-auto`;

/**
 * Список ссылок навигации боковой панели.
 * Пункты подбираются по роли пользователя (см. useSidebarNavItems).
 */
export function SidebarNav({ isCollapsed, chatUnreadTotal }: SidebarNavProps) {
  const { t } = useTranslation();
  const items = useSidebarNavItems();

  return (
    <nav
      className={cn(navList, isCollapsed && 'items-center')}
      style={{
        gap: SIDEBAR_NAV_ITEM_LIST_GAP_PX,
        paddingLeft: isCollapsed
          ? SIDEBAR_NAV_LIST_PADDING_X_COLLAPSED_PX
          : SIDEBAR_NAV_LIST_PADDING_X_EXPANDED_PX,
        paddingRight: isCollapsed
          ? SIDEBAR_NAV_LIST_PADDING_X_COLLAPSED_PX
          : SIDEBAR_NAV_LIST_PADDING_X_EXPANDED_PX,
      }}
      aria-label={t('nav.sidebarAria')}
    >
      {items.map(({ to, Icon, key, end }) => (
        <SidebarNavItem
          key={`${to}-${key}`}
          to={to}
          Icon={Icon}
          label={t(`nav.${key}`)}
          end={end}
          isCollapsed={isCollapsed}
          unreadCount={key === 'messages' ? chatUnreadTotal : 0}
        />
      ))}
    </nav>
  );
}
