import { buildDeckEmojiTileStyle } from './deckAccentStyles';

interface DeckCardHeaderProps {
  title: string;
  emoji?: string;
  sourceLanguage: string;
  targetLanguage: string;
  accentColor: string;
}

/** Emoji tile + deck title + "source → target" languages line. */
export function DeckCardHeader({
  title,
  emoji,
  sourceLanguage,
  targetLanguage,
  accentColor,
}: DeckCardHeaderProps) {
  return (
    <div className='flex items-center gap-2.5'>
      <div
        className='flex h-10 w-10 items-center justify-center rounded-[10px] text-xl'
        style={buildDeckEmojiTileStyle(accentColor)}
      >
        {emoji || '📚'}
      </div>
      <div>
        <h3 className='font-display text-base leading-[1.2] font-bold'>
          {title}
        </h3>
        <div className='text-text3 mt-0.5 text-xs'>
          {sourceLanguage} → {targetLanguage}
        </div>
      </div>
    </div>
  );
}
