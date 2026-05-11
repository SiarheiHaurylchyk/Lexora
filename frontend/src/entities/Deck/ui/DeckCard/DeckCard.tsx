import { type CSSProperties, type MouseEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { deckApi } from '@/shared/api/api-legacy';
import type { DeckItem } from '@/shared/api/types';
import { useConfirm } from '@/shared/lib/confirm';

const MODE_ORDER = ['FLASHCARD', 'LEARN', 'MATCH'] as const;

export interface DeckCardProps {
  deck: DeckItem;
  onDeleted?: () => void;
  readonly?: boolean;
}

const cardClasses = tw`group relative cursor-pointer overflow-hidden rounded-[20px] border border-border bg-surface transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]`;

export function DeckCard({ deck, onDeleted, readonly }: DeckCardProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: MouseEvent) => {
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

  const accent: string = deck.coverColor || '#7C3AED';
  const coverStyle: CSSProperties = {
    background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
  };
  const emojiStyle: CSSProperties = {
    background: `${accent}22`,
    border: `1px solid ${accent}44`,
  };

  return (
    <div
      className={cardClasses}
      onClick={() => navigate(`/decks/${deck.id}`)}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = accent)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor = '')
      }
    >
      <div className='h-1.5' style={coverStyle} />

      <div className='px-5 pt-5 pb-4'>
        <div className='mb-3 flex items-start justify-between'>
          <div className='flex items-center gap-2.5'>
            <div
              className='flex h-10 w-10 items-center justify-center rounded-[10px] text-xl'
              style={emojiStyle}
            >
              {deck.emoji || '📚'}
            </div>
            <div>
              <h3 className='font-display text-base leading-[1.2] font-bold'>
                {deck.title}
              </h3>
              <div className='text-text3 mt-0.5 text-xs'>
                {deck.sourceLanguage} → {deck.targetLanguage}
              </div>
            </div>
          </div>

          {!readonly && (
            <div className='relative'>
              <button
                type='button'
                className='btn btn-ghost btn-icon text-text3 text-lg'
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((v) => !v);
                }}
                aria-label={t('deckCard.menu')}
              >
                ⋮
              </button>

              {showMenu && (
                <>
                  <div
                    className='fixed inset-0 z-10'
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className='border-border2 bg-bg3 absolute top-full right-0 z-20 mt-1 min-w-[140px] rounded-[10px] border p-1.5 shadow-[var(--shadow)]'>
                    {[
                      {
                        label: t('deckCard.view'),
                        action: () => navigate(`/decks/${deck.id}`),
                        danger: false,
                      },
                      {
                        label: t('deckCard.edit'),
                        action: () => navigate(`/decks/${deck.id}/edit`),
                        danger: false,
                      },
                      {
                        label: t('deckCard.del'),
                        action: handleDelete,
                        danger: true,
                      },
                    ].map(({ label, action, danger }) => (
                      <button
                        type='button'
                        key={label}
                        className={cn(
                          'btn btn-ghost text-text w-full justify-start rounded-md px-2.5 py-1.5 text-[13px]',
                          danger && 'text-danger',
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          action(e as any);
                        }}
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

        {deck.description && (
          <p className='text-text3 mb-3.5 line-clamp-2 text-[13px]'>
            {deck.description}
          </p>
        )}

        <div className='mb-4 flex items-center gap-4'>
          <span className='text-text2 flex items-center gap-1 text-[13px]'>
            🃏 <strong>{deck.cardCount}</strong> {t('deckCard.cards')}
          </span>
          {(deck.studyCount ?? 0) > 0 && (
            <span className='text-text3 text-[13px]'>
              ▶ {deck.studyCount} {t('common.sessions')}
            </span>
          )}
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-[11px]',
              deck.visibility === 'PUBLIC'
                ? 'bg-success-dim text-success'
                : 'bg-bg4 text-text3',
            )}
          >
            {deck.visibility === 'PUBLIC'
              ? t('common.public')
              : t('common.private')}
          </span>
        </div>

        {deck.cardCount > 0 && (
          <div className='flex gap-1.5'>
            {MODE_ORDER.map((mode) => (
              <button
                type='button'
                key={mode}
                className='btn btn-secondary btn-sm flex-1 justify-center px-2 py-1.5 text-xs'
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
