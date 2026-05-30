import { type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/** Order of quick-study buttons shown on the deck card. */
const QUICK_STUDY_MODES = ['FLASHCARD', 'LEARN', 'MATCH'] as const;

interface DeckCardStudyButtonsProps {
  deckId: number;
}

/** Three small "Flashcards / Learn / Match" buttons in the deck card footer. */
export function DeckCardStudyButtons({ deckId }: DeckCardStudyButtonsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const openStudyMode = (event: MouseEvent, mode: string) => {
    event.stopPropagation();
    navigate(`/decks/${deckId}/study/${mode}`);
  };

  return (
    <div className='flex gap-1.5'>
      {QUICK_STUDY_MODES.map((mode) => (
        <button
          type='button'
          key={mode}
          className='btn btn-secondary btn-sm flex-1 justify-center px-2 py-1.5 text-xs'
          onClick={(event) => openStudyMode(event, mode)}
        >
          {t(`deckCard.modes.${mode}`)}
        </button>
      ))}
    </div>
  );
}
