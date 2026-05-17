import { NavLink } from 'react-router-dom';
import { SidebarItemTooltip } from '@ui';
import type { LucideIcon } from 'lucide-react';

import {
  formatSidebarUnreadCount,
  SIDEBAR_ICON_STROKE_WIDTH,
  SIDEBAR_NAV_ICON_SIZE_COLLAPSED_PX,
  SIDEBAR_NAV_ICON_SIZE_EXPANDED_PX,
  SIDEBAR_NAV_ICON_WRAP_COLLAPSED_PX,
  SIDEBAR_NAV_ICON_WRAP_EXPANDED_PX,
  SIDEBAR_NAV_ITEM_HIT_AREA_COLLAPSED_PX,
  SIDEBAR_NAV_ITEM_INNER_GAP_PX,
  SIDEBAR_NAV_ITEM_PADDING_X_EXPANDED_PX,
  SIDEBAR_NAV_ITEM_PADDING_Y_EXPANDED_PX,
  SIDEBAR_NAV_LINK_BORDER_RADIUS_PX,
  SIDEBAR_NAV_UNREAD_BADGE_FONT_SIZE_PX,
  SIDEBAR_NAV_UNREAD_BADGE_HEIGHT_PX,
  SIDEBAR_NAV_UNREAD_BADGE_MIN_WIDTH_PX,
  SIDEBAR_NAV_UNREAD_DOT_SIZE_PX,
} from './sidebarLayout';

/** Пропсы одного пункта навигации. */
interface SidebarNavItemProps {
  to: string;
  Icon: LucideIcon;
  label: string;
  end?: boolean;
  isCollapsed: boolean;
  /** Сколько непрочитанных сообщений (только для раздела messages). */
  unreadCount?: number;
}

const linkBase = tw`flex items-center text-sm text-text2 no-underline transition-colors duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-text`;
const linkActive = tw`!bg-[rgba(124,58,237,0.12)] !text-brand-light !font-semibold`;
const iconWrap = tw`relative inline-flex shrink-0 items-center justify-center`;

/**
 * Один пункт навигации в боковой панели.
 * В свёрнутом режиме — только иконка по центру; подсказка через SidebarItemTooltip.
 */
export function SidebarNavItem({
  to,
  Icon,
  label,
  end,
  isCollapsed,
  unreadCount = 0,
}: SidebarNavItemProps) {
  const showUnread = unreadCount > 0;
  const unreadLabel = formatSidebarUnreadCount(unreadCount);

  const iconWrapSizePx = isCollapsed
    ? SIDEBAR_NAV_ICON_WRAP_COLLAPSED_PX
    : SIDEBAR_NAV_ICON_WRAP_EXPANDED_PX;

  const iconSizePx = isCollapsed
    ? SIDEBAR_NAV_ICON_SIZE_COLLAPSED_PX
    : SIDEBAR_NAV_ICON_SIZE_EXPANDED_PX;

  return (
    <SidebarItemTooltip label={label} enabled={isCollapsed}>
      <NavLink
        to={to}
        end={Boolean(end)}
        className={({ isActive }) =>
          cn(
            linkBase,
            isActive && linkActive,
            isCollapsed ? 'justify-center' : 'w-full',
          )
        }
        style={
          isCollapsed
            ? {
                width: SIDEBAR_NAV_ITEM_HIT_AREA_COLLAPSED_PX,
                height: SIDEBAR_NAV_ITEM_HIT_AREA_COLLAPSED_PX,
                borderRadius: SIDEBAR_NAV_LINK_BORDER_RADIUS_PX,
              }
            : {
                gap: SIDEBAR_NAV_ITEM_INNER_GAP_PX,
                paddingLeft: SIDEBAR_NAV_ITEM_PADDING_X_EXPANDED_PX,
                paddingRight: SIDEBAR_NAV_ITEM_PADDING_X_EXPANDED_PX,
                paddingTop: SIDEBAR_NAV_ITEM_PADDING_Y_EXPANDED_PX,
                paddingBottom: SIDEBAR_NAV_ITEM_PADDING_Y_EXPANDED_PX,
                borderRadius: SIDEBAR_NAV_LINK_BORDER_RADIUS_PX,
              }
        }
      >
        <span
          className={iconWrap}
          style={{ width: iconWrapSizePx, height: iconWrapSizePx }}
        >
          <Icon
            size={iconSizePx}
            strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
            aria-hidden
          />
          {isCollapsed && showUnread && (
            <span
              className='bg-danger absolute -top-1 -right-1 rounded-full'
              style={{
                width: SIDEBAR_NAV_UNREAD_DOT_SIZE_PX,
                height: SIDEBAR_NAV_UNREAD_DOT_SIZE_PX,
              }}
              aria-hidden
            />
          )}
        </span>

        {!isCollapsed && (
          <>
            <span className='min-w-0 flex-1 truncate'>{label}</span>
            {showUnread && (
              <span
                className='bg-danger ml-auto inline-flex shrink-0 items-center justify-center rounded-full px-1 font-bold text-white'
                style={{
                  height: SIDEBAR_NAV_UNREAD_BADGE_HEIGHT_PX,
                  minWidth: SIDEBAR_NAV_UNREAD_BADGE_MIN_WIDTH_PX,
                  fontSize: SIDEBAR_NAV_UNREAD_BADGE_FONT_SIZE_PX,
                }}
              >
                {unreadLabel}
              </span>
            )}
          </>
        )}
      </NavLink>
    </SidebarItemTooltip>
  );
}
