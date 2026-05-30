import { useTranslation } from 'react-i18next';

interface DeckCardMetaProps {
  cardCount: number;
  studyCount?: number;
  visibility: string;
}

/**
 * Small status line for the deck card: how many cards the deck has, how many
 * study sessions it had and a public/private pill on the right side.
 */
export function DeckCardMeta({
  cardCount,
  studyCount,
  visibility,
}: DeckCardMetaProps) {
  const { t } = useTranslation();
  const hasStudySessions = (studyCount ?? 0) > 0;
  const isPublic = visibility === 'PUBLIC';
  const visibilityLabel = isPublic ? t('common.public') : t('common.private');

  return (
    <div className='mb-4 flex items-center gap-4'>
      <span className='text-text2 flex items-center gap-1 text-[13px]'>
        🃏 <strong>{cardCount}</strong> {t('deckCard.cards')}
      </span>

      {hasStudySessions && (
        <span className='text-text3 text-[13px]'>
          ▶ {studyCount} {t('common.sessions')}
        </span>
      )}

      <span
        className={cn(
          'ml-auto rounded-full px-2 py-0.5 text-[11px]',
          isPublic ? 'bg-success-dim text-success' : 'bg-bg4 text-text3',
        )}
      >
        {visibilityLabel}
      </span>
    </div>
  );
}
