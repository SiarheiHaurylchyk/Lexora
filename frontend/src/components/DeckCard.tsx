/**
 * DeckCard — a small card that represents a deck in a grid (Dashboard, Explore,
 * Shared with me, Profile).
 *
 * It shows the deck color, emoji, title, language pair and a few stats.
 * On hover the card highlights with the deck color. The "⋮" menu (only when
 * `readonly` is false) gives quick "view / edit / delete" actions for the owner.
 *
 * Props:
 *   - deck       : the deck object from the API
 *   - onDeleted  : called after a successful delete so the parent can refresh
 *   - readonly   : true when the user does not own this deck (Explore, Shared)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi } from '../services/api';
import styles from './DeckCard.module.css';
import { useConfirm } from './ui';

/** Order of the small "study now" buttons at the bottom of each card. */
const MODE_ORDER = ['FLASHCARD', 'LEARN', 'MATCH'] as const;

interface Props {
  deck: any;
  onDeleted?: () => void;
  readonly?: boolean;
}

export default function DeckCard({ deck, onDeleted, readonly }: Props) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Confirm + delete the deck. Then call `onDeleted` so the list refreshes. */
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      message: t('deckCard.confirmDelete', { title: deck.title }),
      variant: 'danger',
      confirmText: t('common.delete'),
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deckApi.deleteDeck(deck.id);
      toast.success(t('deckCard.deleted'));
      onDeleted?.();
    } catch {
      toast.error(t('deckCard.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const accent = deck.coverColor || '#7C3AED';

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/decks/${deck.id}`)}
      style={{ borderColor: undefined }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = accent)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '')}
    >
      <div className={styles.cover} style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div className={styles.body}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div
              className={styles.emoji}
              style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
            >
              {deck.emoji || '📚'}
            </div>
            <div>
              <h3 className={styles.title}>{deck.title}</h3>
              <div className={styles.langs}>
                {deck.sourceLanguage} → {deck.targetLanguage}
              </div>
            </div>
          </div>

          {!readonly && (
            <div className={styles.menuWrap}>
              <button
                type="button"
                className={`btn btn-ghost btn-icon ${styles.menuBtn}`}
                onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
                aria-label={t('deckCard.menu')}
              >
                ⋮
              </button>

              {showMenu && (
                <>
                  <div className={styles.menuBackdrop} onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                  <div className={styles.menu}>
                    {[
                      { label: t('deckCard.view'), action: () => navigate(`/decks/${deck.id}`), danger: false },
                      { label: t('deckCard.edit'), action: () => navigate(`/decks/${deck.id}/edit`), danger: false },
                      { label: t('deckCard.del'), action: handleDelete, danger: true },
                    ].map(({ label, action, danger }) => (
                      <button
                        type="button"
                        key={label}
                        className={`btn btn-ghost ${styles.menuItem} ${danger ? styles.menuItemDanger : ''}`}
                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); action(e as any); }}
                        disabled={deleting}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {deck.description && <p className={styles.description}>{deck.description}</p>}

        <div className={styles.stats}>
          <span className={styles.statsCards}>
            🃏 <strong>{deck.cardCount}</strong> {t('deckCard.cards')}
          </span>
          {deck.studyCount > 0 && (
            <span className={styles.statsSessions}>
              ▶ {deck.studyCount} {t('common.sessions')}
            </span>
          )}
          <span className={`${styles.visibility} ${deck.visibility === 'PUBLIC' ? styles.visPublic : styles.visPrivate}`}>
            {deck.visibility === 'PUBLIC' ? t('common.public') : t('common.private')}
          </span>
        </div>

        {deck.cardCount > 0 && (
          <div className={styles.modes}>
            {MODE_ORDER.map((mode) => (
              <button
                type="button"
                key={mode}
                className={`btn btn-secondary btn-sm ${styles.modeBtn}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/decks/${deck.id}/study/${mode}`);
                }}
              >
                {t(`deckCard.modes.${mode}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
