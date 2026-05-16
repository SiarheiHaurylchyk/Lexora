/**
 * Виджет «Боковая панель приложения».
 *
 * Содержит:
 *  - логотип и переключатель свернуть/развернуть (SidebarBrand);
 *  - список разделов по роли пользователя (SidebarNav).
 *
 * Кнопка «Новая колода» намеренно убрана — создание колоды доступно
 * со страницы «Карточки» (/decks).
 */

import { SidebarBrand } from './SidebarBrand';
import {
  APP_SHELL_SIDEBAR_TRANSITION_MS,
  SIDEBAR_VERTICAL_PADDING_PX,
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
  SIDEBAR_Z_INDEX,
} from './sidebarLayout';
import { SidebarNav } from './SidebarNav';

import { useChatUnreadTotal } from '@/shared/hooks/useChatUnreadTotal';

/** Пропсы боковой панели. Состояние хранится в useAppSidebarLayout. */
interface AppSidebarProps {
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const sidebarAsideClass = tw`fixed top-0 bottom-0 left-0 flex flex-col border-r border-border bg-bg2 transition-[width] ease-[cubic-bezier(0.4,0,0.2,1)]`;

export function AppSidebar({
  isCollapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const chatUnreadTotal = useChatUnreadTotal();

  return (
    <aside
      className={sidebarAsideClass}
      style={{
        zIndex: SIDEBAR_Z_INDEX,
        paddingTop: SIDEBAR_VERTICAL_PADDING_PX,
        paddingBottom: SIDEBAR_VERTICAL_PADDING_PX,
        transitionDuration: `${APP_SHELL_SIDEBAR_TRANSITION_MS}ms`,
        width: isCollapsed
          ? SIDEBAR_WIDTH_COLLAPSED_PX
          : SIDEBAR_WIDTH_EXPANDED_PX,
      }}
      aria-label='Боковая навигация'
    >
      <SidebarBrand
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => onCollapsedChange(!isCollapsed)}
      />
      <SidebarNav isCollapsed={isCollapsed} chatUnreadTotal={chatUnreadTotal} />
    </aside>
  );
}
