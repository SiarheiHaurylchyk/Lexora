/**
 * Верхняя полоса приложения: язык, уведомления, меню пользователя.
 * На странице виртуального класса скрывается — там свой UI.
 *
 * Живёт в `app/layout`, а не в `widgets/`: собирает несколько виджетов,
 * что для слоя widgets запрещено правилами FSD (импорт вверх по слоям).
 */

import { LanguageSwitcher } from '@/widgets/LanguageSwitcher';
import { NotificationBell } from '@/widgets/NotificationBell';
import { UserMenu } from '@/widgets/UserMenu';

import { APP_TOP_BAR_HEIGHT_PX } from '@/shared/lib/appShellLayout';

const topBarClass = tw`border-border bg-bg flex shrink-0 items-center gap-3 border-b px-4`;

export default function AppTopBar() {
  return (
    <header className={topBarClass} style={{ height: APP_TOP_BAR_HEIGHT_PX }}>
      <div className='flex-1' />
      <div className='flex items-center gap-2'>
        <LanguageSwitcher compact />
        <NotificationBell placement='header' />
        <UserMenu placement='header' />
      </div>
    </header>
  );
}
