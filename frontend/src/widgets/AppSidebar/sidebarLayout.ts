/**
 * Размеры и отступы боковой панели (AppSidebar).
 * Все числа в пикселях, если не указано иное.
 * Ширина панели должна совпадать с `marginLeft` главной колонки в Layout.
 */

import { APP_SHELL_SIDEBAR_TRANSITION_MS } from '@/shared/lib/appShellLayout';

export { APP_SHELL_SIDEBAR_TRANSITION_MS };

/** Ширина панели в развёрнутом режиме (с подписями пунктов). */
export const SIDEBAR_WIDTH_EXPANDED_PX = 240;

/** Ширина панели в свёрнутом режиме (только иконки). */
export const SIDEBAR_WIDTH_COLLAPSED_PX = 84;

/** Z-index: панель поверх контента, ниже модальных окон. */
export const SIDEBAR_Z_INDEX = 100;

/** Внутренний вертикальный отступ панели (`py-5`). */
export const SIDEBAR_VERTICAL_PADDING_PX = 20;

// ——— Шапка с логотипом (SidebarBrand) ———

/** Отступ снизу у блока логотипа (`mb-4`). */
export const SIDEBAR_BRAND_MARGIN_BOTTOM_PX = 45;

/** Горизонтальный отступ шапки в развёрнутом режиме (`px-5`). */
export const SIDEBAR_BRAND_PADDING_X_EXPANDED_PX = 20;

/**
 * Горизонтальные отступы шапки в свёрнутом режиме (асимметрия).
 * Логотип визуально совпадает с осью пунктов меню; симметричные 8px сдвигают вправо.
 */
export const SIDEBAR_BRAND_PADDING_LEFT_COLLAPSED_PX = 0;
export const SIDEBAR_BRAND_PADDING_RIGHT_COLLAPSED_PX = 15;

/** Размер квадрата под иконку логотипа, развёрнутый режим (`h-9`). */
export const SIDEBAR_BRAND_LOGO_BOX_EXPANDED_PX = 36;

/** Размер квадрата под иконку логотипа, свёрнутый режим (`h-10`). */
export const SIDEBAR_BRAND_LOGO_BOX_COLLAPSED_PX = 40;

/** Размер иконки Sparkles в развёрнутом режиме. */
export const SIDEBAR_BRAND_ICON_SIZE_EXPANDED_PX = 22;

/** Размер иконки Sparkles в свёрнутом режиме. */
export const SIDEBAR_BRAND_ICON_SIZE_COLLAPSED_PX = 26;

/** Размер шрифта надписи «Lexora». */
export const SIDEBAR_BRAND_TITLE_FONT_SIZE_PX = 22;

/** Скругление углов у квадрата логотипа. */
export const SIDEBAR_BRAND_LOGO_BORDER_RADIUS_PX = 10;

/** Расстояние между иконкой и текстом в кнопке бренда (`gap-3`). */
export const SIDEBAR_BRAND_GAP_PX = 12;

// ——— Список навигации (SidebarNav) ———

/** Горизонтальный отступ списка в развёрнутом режиме (`px-3`). */
export const SIDEBAR_NAV_LIST_PADDING_X_EXPANDED_PX = 12;

/** Горизонтальный отступ списка в свёрнутом режиме (`px-2`). */
export const SIDEBAR_NAV_LIST_PADDING_X_COLLAPSED_PX = 8;

/** Расстояние между пунктами меню (`gap-0.5`). */
export const SIDEBAR_NAV_ITEM_LIST_GAP_PX = 2;

// ——— Пункт меню (SidebarNavItem) ———

/** Скругление ссылки пункта меню. */
export const SIDEBAR_NAV_LINK_BORDER_RADIUS_PX = 10;

/** Ширина и высота кликабельной области в свёрнутом режиме (`h-11`). */
export const SIDEBAR_NAV_ITEM_HIT_AREA_COLLAPSED_PX = 44;

/** Горизонтальный внутренний отступ ссылки в развёрнутом режиме (`px-3.5`). */
export const SIDEBAR_NAV_ITEM_PADDING_X_EXPANDED_PX = 14;

/** Вертикальный внутренний отступ ссылки в развёрнутом режиме (`py-2.5`). */
export const SIDEBAR_NAV_ITEM_PADDING_Y_EXPANDED_PX = 10;

/** Расстояние между иконкой и текстом в развёрнутом пункте (`gap-3`). */
export const SIDEBAR_NAV_ITEM_INNER_GAP_PX = 12;

/** Размер обёртки иконки в развёрнутом пункте. */
export const SIDEBAR_NAV_ICON_WRAP_EXPANDED_PX = 22;

/** Размер обёртки иконки в свёрнутом пункте (`h-6`). */
export const SIDEBAR_NAV_ICON_WRAP_COLLAPSED_PX = 24;

/** Размер SVG-иконки Lucide в развёрнутом пункте. */
export const SIDEBAR_NAV_ICON_SIZE_EXPANDED_PX = 18;

/** Размер SVG-иконки Lucide в свёрнутом пункте. */
export const SIDEBAR_NAV_ICON_SIZE_COLLAPSED_PX = 24;

/** Толщина линии у иконок Lucide в сайдбаре. */
export const SIDEBAR_ICON_STROKE_WIDTH = 2.25;

// ——— Бейдж непрочитанных сообщений ———

/** Выше этого числа показываем «99+», а не точное значение. */
export const SIDEBAR_NAV_UNREAD_DISPLAY_CAP = 99;

/** Диаметр красной точки на иконке в свёрнутом режиме (`h-2.5`). */
export const SIDEBAR_NAV_UNREAD_DOT_SIZE_PX = 10;

/** Высота числового бейджа в развёрнутом пункте (`h-5`). */
export const SIDEBAR_NAV_UNREAD_BADGE_HEIGHT_PX = 20;

/** Минимальная ширина числового бейджа. */
export const SIDEBAR_NAV_UNREAD_BADGE_MIN_WIDTH_PX = 20;

/** Размер шрифта внутри числового бейджа. */
export const SIDEBAR_NAV_UNREAD_BADGE_FONT_SIZE_PX = 10;

/** Подпись бейджа: точное число или «99+». */
export function formatSidebarUnreadCount(unreadCount: number): string {
  return unreadCount > SIDEBAR_NAV_UNREAD_DISPLAY_CAP
    ? `${SIDEBAR_NAV_UNREAD_DISPLAY_CAP}+`
    : String(unreadCount);
}
