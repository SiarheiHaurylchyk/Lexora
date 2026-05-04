import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi } from '../services/api';
import type { DeckItem } from '../services/types';
import { EmptyState, PageHeader, Skeleton } from '../components/ui';
import DeckCard from '../components/DeckCard';

/**
 * SharedDecksPage — list of decks that other users (usually a teacher)
 * shared with the current user. Read-only — the student cannot edit them.
 */
export default function SharedDecksPage() {
  const { t } = useTranslation();
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await deckApi.getSharedDecks();
        if (!cancelled) setDecks(data);
      } catch {
        if (!cancelled) toast.error(t('shared.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  return (
    <div style={{ padding: '40px 0', width: '100%', boxSizing: 'border-box' }}>
      <PageHeader title={t('shared.title')} subtitle={t('shared.subtitle')} />

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={200} rounded={20} />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <EmptyState
          icon="🎁"
          title={t('shared.empty')}
          description={t('shared.emptyHelp')}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} readonly />
          ))}
        </div>
      )}
    </div>
  );
}
