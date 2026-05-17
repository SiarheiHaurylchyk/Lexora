/**
 * Хук управления состоянием боковой панели для оболочки приложения (Layout).
 *
 * Возвращает:
 *  - isCollapsed         — свёрнута ли панель;
 *  - setIsCollapsed      — переключатель состояния;
 *  - mainShellMarginLeft — отступ главной колонки в пикселях (числом,
 *                          чтобы не дублировать константы в Tailwind-классах).
 */

import { useState } from 'react';

import {
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
} from './sidebarLayout';

export function useAppSidebarLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainShellMarginLeft = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED_PX
    : SIDEBAR_WIDTH_EXPANDED_PX;

  return { isCollapsed, setIsCollapsed, mainShellMarginLeft };
}
