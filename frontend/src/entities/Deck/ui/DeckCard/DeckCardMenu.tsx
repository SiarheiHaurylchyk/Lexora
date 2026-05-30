import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface DeckCardMenuProps {
  deckId: number;
  isDeleting: boolean;
  onDelete: (event: MouseEvent) => void;
}

/**
 * Small "⋮" button in the corner of the deck card. When clicked it shows a
 * dropdown with three actions: open the deck, edit it or delete it.
 */
export function DeckCardMenu({
  deckId,
  isDeleting,
  onDelete,
}: DeckCardMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = (event: MouseEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
  };

  const toggleMenu = (event: MouseEvent) => {
    event.stopPropagation();
    setIsMenuOpen((wasOpen) => !wasOpen);
  };

  const goToView = () => navigate(`/decks/${deckId}`);
  const goToEdit = () => navigate(`/decks/${deckId}/edit`);

  const menuItems: Array<{
    label: string;
    onClick: (event: MouseEvent) => void;
    isDanger: boolean;
  }> = [
    { label: t('deckCard.view'), onClick: goToView, isDanger: false },
    { label: t('deckCard.edit'), onClick: goToEdit, isDanger: false },
    { label: t('deckCard.del'), onClick: onDelete, isDanger: true },
  ];

  return (
    <div className='relative'>
      <button
        type='button'
        className='btn btn-ghost btn-icon text-text3 text-lg'
        onClick={toggleMenu}
        aria-label={t('deckCard.menu')}
      >
        ⋮
      </button>

      {isMenuOpen && (
        <>
          <div className='fixed inset-0 z-10' onClick={closeMenu} />
          <div className='border-border2 bg-bg3 absolute top-full right-0 z-20 mt-1 min-w-[140px] rounded-[10px] border p-1.5 shadow-[var(--shadow)]'>
            {menuItems.map(({ label, onClick, isDanger }) => (
              <button
                type='button'
                key={label}
                className={cn(
                  'btn btn-ghost text-text w-full justify-start rounded-md px-2.5 py-1.5 text-[13px]',
                  isDanger && 'text-danger',
                )}
                disabled={isDeleting}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen(false);
                  onClick(event);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
