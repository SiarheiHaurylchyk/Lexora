import { type CSSProperties, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@ui';

import type { DeckItem } from '@/shared/api/types';
import {
  decksShareLanguages,
  STUDY_MODE_KEYS,
  type StudyModeKey,
} from '@/shared/lib/combinedStudy';

const MODE_ICONS: Record<StudyModeKey, string> = {
  FLASHCARD: '⚡',
  LEARN: '🎯',
  MATCH: '🧩',
  SPELL: '✏️',
  DRAG: '🔀',
  SCRAMBLE: '🔤',
  GRAVITY: '☄️',
  EXAM: '📝',
};

interface Props {
  decks: DeckItem[];
  onClose: () => void;
}

export function CombinedStudyModal({ decks, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [studyDir, setStudyDir] = useState<'forward' | 'reverse' | 'mixed'>(
    'forward',
  );

  const playableDecks = useMemo(
    () => decks.filter((d) => (d.cardCount ?? 0) > 0),
    [decks],
  );

  const selectedDecks = playableDecks.filter((d) => selectedIds.includes(d.id));
  const langDeck = selectedDecks[0] ?? playableDecks[0] ?? null;

  const toggleDeck = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const startMode = (mode: StudyModeKey) => {
    if (selectedIds.length < 2) {
      toast.error(t('combinedStudy.needTwo'));
      return;
    }
    if (!decksShareLanguages(selectedDecks)) {
      toast.error(t('combinedStudy.langMismatch'));
      return;
    }
    const ids = selectedIds.join(',');
    navigate(`/study/combined/${mode}?decks=${ids}&dir=${studyDir}`);
    onClose();
  };

  const accent = langDeck?.coverColor || '#7C3AED';
  const modeBtnStyle: CSSProperties = { border: `1px solid ${accent}44` };

  return (
    <Modal onClose={onClose} title={t('combinedStudy.title')} wide>
      <p className='text-text2 mb-4 text-sm'>{t('combinedStudy.hint')}</p>

      <div className='mb-4 max-h-[240px] space-y-2 overflow-y-auto'>
        {playableDecks.map((deck) => {
          const checked = selectedIds.includes(deck.id);
          return (
            <label
              key={deck.id}
              className={cn(
                'border-border flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                checked && 'border-brand bg-brand/10',
              )}
            >
              <input
                type='checkbox'
                className='accent-brand h-4 w-4'
                checked={checked}
                onChange={() => toggleDeck(deck.id)}
              />
              <span className='text-lg'>{deck.emoji || '📚'}</span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{deck.title}</span>
                <span className='text-text3 text-xs'>
                  {deck.sourceLanguage} → {deck.targetLanguage} ·{' '}
                  {deck.cardCount} {t('deckCard.cards')}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p className='text-text3 mb-4 text-xs'>
        {t('combinedStudy.selected', { count: selectedIds.length })}
      </p>

      {langDeck && selectedIds.length >= 2 && (
        <>
          <p className='text-text3 mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase'>
            {t('deck.direction.label')}
          </p>
          <div className='border-border bg-bg/50 mb-4 grid grid-cols-3 gap-1 rounded-2xl border p-1'>
            {(
              [
                {
                  id: 'forward' as const,
                  primary: langDeck.sourceLanguage,
                  secondary: langDeck.targetLanguage,
                },
                {
                  id: 'reverse' as const,
                  primary: langDeck.targetLanguage,
                  secondary: langDeck.sourceLanguage,
                },
                { id: 'mixed' as const, primary: null, secondary: null },
              ] as const
            ).map((opt) => {
              const active = studyDir === opt.id;
              return (
                <button
                  key={opt.id}
                  type='button'
                  onClick={() => setStudyDir(opt.id)}
                  className={cn(
                    'flex min-h-[44px] flex-col items-center justify-center rounded-xl px-2 py-2 text-xs transition-all',
                    active
                      ? 'from-brand to-accent bg-gradient-to-br text-white'
                      : 'text-text2 hover:bg-surface/90',
                  )}
                >
                  {opt.id === 'mixed' ? (
                    t('deck.direction.mixed')
                  ) : (
                    <span className='font-semibold uppercase'>
                      {opt.primary} → {opt.secondary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {STUDY_MODE_KEYS.map((key) => (
              <button
                key={key}
                type='button'
                onClick={() => startMode(key)}
                className='rounded-xl bg-[rgba(0,0,0,0.3)] p-3 text-center transition-colors hover:bg-[rgba(0,0,0,0.45)]'
                style={modeBtnStyle}
              >
                <div className='mb-1 text-xl'>{MODE_ICONS[key]}</div>
                <div className='text-[12px] font-semibold'>
                  {t(`deck.modes.${key}.label`)}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
