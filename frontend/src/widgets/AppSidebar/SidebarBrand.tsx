import { useTranslation } from 'react-i18next';
import { SidebarItemTooltip } from '@ui';
import { Sparkles } from 'lucide-react';

import {
  SIDEBAR_BRAND_GAP_PX,
  SIDEBAR_BRAND_ICON_SIZE_COLLAPSED_PX,
  SIDEBAR_BRAND_ICON_SIZE_EXPANDED_PX,
  SIDEBAR_BRAND_LOGO_BORDER_RADIUS_PX,
  SIDEBAR_BRAND_LOGO_BOX_COLLAPSED_PX,
  SIDEBAR_BRAND_LOGO_BOX_EXPANDED_PX,
  SIDEBAR_BRAND_MARGIN_BOTTOM_PX,
  SIDEBAR_BRAND_PADDING_LEFT_COLLAPSED_PX,
  SIDEBAR_BRAND_PADDING_RIGHT_COLLAPSED_PX,
  SIDEBAR_BRAND_PADDING_X_EXPANDED_PX,
  SIDEBAR_BRAND_TITLE_FONT_SIZE_PX,
  SIDEBAR_ICON_STROKE_WIDTH,
} from './sidebarLayout';

/** Пропсы шапки боковой панели. */
interface SidebarBrandProps {
  /** Боковая панель в узком режиме — только логотип по центру. */
  isCollapsed: boolean;
  /** Колбэк переключения свёрнут/развёрнут. */
  onToggleCollapsed: () => void;
}

const brandButton = tw`text-text flex cursor-pointer items-center border-0 bg-transparent transition-opacity hover:opacity-90`;
const logoBox = tw`from-brand to-accent flex shrink-0 items-center justify-center bg-gradient-to-br text-white`;

/**
 * Шапка боковой панели: логотип Lexora и кнопка свернуть/развернуть.
 * В свёрнутом виде — только иконка, строго по центру колонки.
 */
export function SidebarBrand({
  isCollapsed,
  onToggleCollapsed,
}: SidebarBrandProps) {
  const { t } = useTranslation();

  const logoBoxSizePx = isCollapsed
    ? SIDEBAR_BRAND_LOGO_BOX_COLLAPSED_PX
    : SIDEBAR_BRAND_LOGO_BOX_EXPANDED_PX;

  const iconSizePx = isCollapsed
    ? SIDEBAR_BRAND_ICON_SIZE_COLLAPSED_PX
    : SIDEBAR_BRAND_ICON_SIZE_EXPANDED_PX;

  return (
    <header
      className={cn('flex w-full shrink-0', isCollapsed && 'justify-center')}
      style={{
        marginBottom: SIDEBAR_BRAND_MARGIN_BOTTOM_PX,
        paddingLeft: isCollapsed
          ? SIDEBAR_BRAND_PADDING_LEFT_COLLAPSED_PX
          : SIDEBAR_BRAND_PADDING_X_EXPANDED_PX,
        paddingRight: isCollapsed
          ? SIDEBAR_BRAND_PADDING_RIGHT_COLLAPSED_PX
          : SIDEBAR_BRAND_PADDING_X_EXPANDED_PX,
      }}
    >
      <SidebarItemTooltip
        label={isCollapsed ? t('nav.expand') : t('nav.collapse')}
        enabled={isCollapsed}
      >
        <button
          type='button'
          className={cn(brandButton, isCollapsed ? 'justify-center' : 'w-full')}
          style={isCollapsed ? undefined : { gap: SIDEBAR_BRAND_GAP_PX }}
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!isCollapsed}
        >
          <span
            className={logoBox}
            style={{
              width: logoBoxSizePx,
              height: logoBoxSizePx,
              borderRadius: SIDEBAR_BRAND_LOGO_BORDER_RADIUS_PX,
            }}
          >
            <Sparkles
              size={iconSizePx}
              strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
              className='drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
              aria-hidden
            />
          </span>
          {!isCollapsed && (
            <span
              className='font-display font-extrabold tracking-[-0.02em]'
              style={{ fontSize: SIDEBAR_BRAND_TITLE_FONT_SIZE_PX }}
            >
              Lexora
            </span>
          )}
        </button>
      </SidebarItemTooltip>
    </header>
  );
}
