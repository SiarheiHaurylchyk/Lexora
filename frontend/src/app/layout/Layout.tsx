/**
 * Оболочка авторизованного приложения: боковая панель + верхний бар + контент страницы.
 *
 * Сама разметка тонкая — виджеты:
 *  - AppSidebar — навигация слева;
 *  - AppTopBar — язык, уведомления, профиль;
 *  - ClassroomReturnBar — быстрый возврат в класс (если нужен).
 *
 * Маршруты и бизнес-логика страниц живут в `pages/`, не здесь.
 */

import { Outlet, useLocation } from 'react-router-dom';
import { TooltipProvider } from '@ui';

import AppTopBar from './AppTopBar';

import { AppSidebar, useAppSidebarLayout } from '@/widgets/AppSidebar';
import { ClassroomReturnBar } from '@/widgets/ClassroomReturnBar';

import { useLessonReminder } from '@/shared/hooks/useLessonReminder';
import {
  APP_MAIN_CONTENT_PADDING_X_PERCENT,
  APP_SHELL_SIDEBAR_TRANSITION_MS,
} from '@/shared/lib/appShellLayout';
import {
  isMainFullBleedRoute,
  shouldHideGlobalTopBar,
} from '@/shared/lib/layoutRoutes';

const mainShellClass = tw`flex min-h-screen flex-1 flex-col transition-[margin-left] ease-[cubic-bezier(0.4,0,0.2,1)]`;

export default function Layout() {
  const { pathname } = useLocation();
  const { isCollapsed, setIsCollapsed, mainShellMarginLeft } =
    useAppSidebarLayout();

  const isFullBleed = isMainFullBleedRoute(pathname);
  const hideTopBar = shouldHideGlobalTopBar(pathname);

  useLessonReminder();

  return (
    <TooltipProvider>
      <div className='flex min-h-screen'>
        <AppSidebar
          isCollapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
        />

        {/* Основная колонка: отступ слева совпадает с шириной панели */}
        <div
          className={mainShellClass}
          style={{
            marginLeft: mainShellMarginLeft,
            transitionDuration: `${APP_SHELL_SIDEBAR_TRANSITION_MS}ms`,
          }}
        >
          {!hideTopBar && <AppTopBar />}
          <ClassroomReturnBar />
          <main
            className={cn('min-w-0 flex-1', isFullBleed && 'flex flex-col')}
            style={
              isFullBleed
                ? undefined
                : {
                    paddingLeft: `${APP_MAIN_CONTENT_PADDING_X_PERCENT}%`,
                    paddingRight: `${APP_MAIN_CONTENT_PADDING_X_PERCENT}%`,
                  }
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
