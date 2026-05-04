import type { CSSProperties } from 'react';

/**
 * Layout for lesson-related pages inside the main column (right of the sidebar).
 * Horizontal gutters come from `Layout`’s main column (`padding-left/right: 10%`).
 */
export const wideContentShellStyle: CSSProperties = {
  paddingTop: 40,
  paddingBottom: 48,
  paddingLeft: 0,
  paddingRight: 0,
  width: '100%',
  maxWidth: 'none',
  boxSizing: 'border-box',
};
