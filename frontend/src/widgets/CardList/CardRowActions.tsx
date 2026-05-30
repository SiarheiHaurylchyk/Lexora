import { useTranslation } from 'react-i18next';

import { CardSpeakButton } from './CardSpeakButton';

interface CardRowActionsProps {
  /** Term text that will be spoken when the user clicks 🔊 / 🐢. */
  term: string;
  /** Source language of the term, used to pick the voice. */
  sourceLanguage: string;
  /** True when the card is not saved on the server yet. */
  hasUnsavedChanges: boolean;
  /** True when the speak button can actually play this language/text. */
  canSpeakTerm: boolean;
  onDelete: () => void;
}

const rowSpeakButtonClasses = tw`btn btn-ghost btn-icon text-text3 text-base`;
const deleteButtonClasses = tw`btn btn-ghost btn-icon text-text3 hover:text-danger text-base`;

/**
 * Buttons on the right side of one card row:
 * "unsaved" badge (only for new cards), 🔊 + 🐢 speak buttons, and "🗑".
 *
 * The parent wraps these in a `stopPropagation()` div so clicks here do not
 * accidentally open the inline editor.
 */
export function CardRowActions({
  term,
  sourceLanguage,
  hasUnsavedChanges,
  canSpeakTerm,
  onDelete,
}: CardRowActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      {hasUnsavedChanges && (
        <span className='badge badge-warning'>{t('editDeck.unsaved')}</span>
      )}

      {canSpeakTerm && (
        <>
          <CardSpeakButton
            text={term}
            language={sourceLanguage}
            className={rowSpeakButtonClasses}
          />
          <CardSpeakButton
            text={term}
            language={sourceLanguage}
            slow
            className={rowSpeakButtonClasses}
          />
        </>
      )}

      <button
        type='button'
        className={deleteButtonClasses}
        title={t('editDeck.deleteCard')}
        onClick={onDelete}
      >
        🗑
      </button>
    </>
  );
}
