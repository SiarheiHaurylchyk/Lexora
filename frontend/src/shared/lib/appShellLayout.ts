/**
 * Размеры и тайминги оболочки приложения (Layout + AppTopBar).
 * Используются в `app/layout` и синхронизируются с анимацией сайдбара.
 */

/** Длительность анимации отступа main-колонки при сворачивании сайдбара (ms). */
export const APP_SHELL_SIDEBAR_TRANSITION_MS = 300;

/**
 * Горизонтальные отступы `<main>` от краёв колонки, в процентах.
 * Не применяется на full-bleed маршрутах (чат, класс, обучение).
 */
export const APP_MAIN_CONTENT_PADDING_X_PERCENT = 10;

/** Высота верхней полосы AppTopBar (px); эквивалент Tailwind `h-14`. */
export const APP_TOP_BAR_HEIGHT_PX = 56;
