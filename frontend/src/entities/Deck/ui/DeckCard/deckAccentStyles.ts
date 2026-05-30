import type { CSSProperties } from 'react';

/** Default deck accent color shown when the deck has no own color. */
export const DEFAULT_DECK_ACCENT_COLOR = '#7C3AED';

/** Picks the deck's accent color or falls back to the default purple. */
export function pickDeckAccentColor(deckColor?: string | null): string {
  return deckColor || DEFAULT_DECK_ACCENT_COLOR;
}

/** Style for the colored top strip of the deck card cover. */
export function buildDeckCoverStripStyle(accentColor: string): CSSProperties {
  return {
    background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
  };
}

/** Style for the small emoji tile inside the deck card header. */
export function buildDeckEmojiTileStyle(accentColor: string): CSSProperties {
  return {
    background: `${accentColor}22`,
    border: `1px solid ${accentColor}44`,
  };
}
