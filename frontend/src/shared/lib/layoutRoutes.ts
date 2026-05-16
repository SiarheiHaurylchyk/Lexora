/**
 * Правила отступов и «полноэкранного» контента для оболочки приложения (Layout).
 * Используются в `app/layout/Layout.tsx`, чтобы не дублировать regex по pathname.
 */

/** Режим обучения: без боковых отступов у `<main>`. Используется только внутри модуля. */
function isStudyRoute(pathname: string): boolean {
  return /^\/decks\/\d+\/study\/[^/]+$/.test(pathname);
}

/** Страницы, где основной контент занимает всю ширину колонки (без px-[10%]). */
export function isMainFullBleedRoute(pathname: string): boolean {
  if (isStudyRoute(pathname)) return true;
  if (pathname === '/schedule') return true;
  if (pathname === '/messages' || pathname.startsWith('/messages/'))
    return true;
  if (/^\/chat\/[^/]+$/.test(pathname)) return true;
  if (pathname === '/lesson-call') return true;
  if (/^\/class\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** На странице виртуального класса свой верхний бар — глобальный header скрываем. */
export function shouldHideGlobalTopBar(pathname: string): boolean {
  return /^\/class\/[^/]+$/.test(pathname);
}
