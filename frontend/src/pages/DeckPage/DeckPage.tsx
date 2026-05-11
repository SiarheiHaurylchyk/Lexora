import { type CSSProperties, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ShareDeckModal } from '@/features/ShareDeck';

import type { CardItem, DeckItem } from '@/shared/api/types';
import { useSpeech } from '@/shared/hooks/useSpeech';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useApiQuery } from '@/shared/lib/query';
import { useAppSelector } from '@/shared/lib/storeHooks';

const STUDY_MODES = [
  { key: 'FLASHCARD', icon: '⚡' },
  { key: 'LEARN', icon: '🎯' },
  { key: 'MATCH', icon: '🧩' },
  { key: 'SPELL', icon: '✏️' },
] as const;

const cardRowClasses = tw`grid items-center gap-4 grid-cols-[56px_1fr_1fr_auto] rounded-[12px] border border-border bg-surface px-5 py-4 transition-colors duration-200 hover:border-border2`;

export function DeckPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { speak } = useSpeech();
  const [searchQ, setSearchQ] = useState('');
  const [showShare, setShowShare] = useState(false);

  const deckId = Number(id);
  const deckQuery = useApiQuery<DeckItem>({
    queryKey: ['deck', deckId],
    url: `/decks/${deckId}`,
    enabled: Number.isFinite(deckId),
  });
  const deck = deckQuery.data ?? null;
  const loading = deckQuery.isLoading;
  useEffect(() => {
    if (deckQuery.isError) {
      toast.error(t('deck.notFound'));
      navigate('/decks');
    }
  }, [deckQuery.isError, navigate, t]);

  if (loading)
    return (
      <div className='box-border w-full py-10'>
        <div className='skeleton mb-6 h-[200px] rounded-[20px]' />
        <div className='grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='skeleton h-20 rounded-[12px]' />
          ))}
        </div>
      </div>
    );

  if (!deck) return null;
  const isOwner = user?.id === deck.owner?.id;
  const canShareDeck = isOwner && userCanTeach(user?.role);
  const filtered = (deck.cards || []).filter(
    (c: CardItem) =>
      c.term.toLowerCase().includes(searchQ.toLowerCase()) ||
      c.definition.toLowerCase().includes(searchQ.toLowerCase()),
  );

  const accent: string = deck.coverColor || '#7C3AED';
  const heroStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
    border: `1px solid ${accent}33`,
  };
  const heroCircleStyle: CSSProperties = { background: `${accent}10` };
  const heroIconStyle: CSSProperties = {
    background: `${accent}25`,
    border: `1px solid ${accent}44`,
  };
  const modeBtnStyle: CSSProperties = { border: `1px solid ${accent}44` };

  return (
    <div className='box-border w-full py-10'>
      <button
        type='button'
        className='btn btn-ghost mb-6 text-sm'
        onClick={() => navigate('/decks')}
      >
        {t('deck.backToDecks')}
      </button>

      <div
        className='relative mb-8 overflow-hidden rounded-[28px] px-9 py-8'
        style={heroStyle}
      >
        <div
          className='absolute -top-10 -right-10 h-[200px] w-[200px] rounded-full'
          style={heroCircleStyle}
        />
        <div className='relative'>
          <div className='mb-5 flex items-start gap-5 max-[720px]:flex-col'>
            <div
              className='flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[32px]'
              style={heroIconStyle}
            >
              {deck.emoji || '📚'}
            </div>
            <div className='flex-1'>
              <h1 className='font-display mb-1.5 text-3xl'>{deck.title}</h1>
              {deck.description && (
                <p className='text-text2 text-[15px]'>{deck.description}</p>
              )}
              <div className='mt-2.5 flex flex-wrap gap-3'>
                <span className='badge badge-brand'>
                  {deck.sourceLanguage} → {deck.targetLanguage}
                </span>
                <span className='text-text3 text-[13px]'>
                  {t('common.by')}{' '}
                  {deck.owner?.displayName || deck.owner?.username}
                </span>
                <span className='text-text3 text-[13px]'>
                  🃏 {deck.cardCount} {t('common.cards')}
                </span>
                {(deck.studyCount ?? 0) > 0 && (
                  <span className='text-text3 text-[13px]'>
                    ▶ {deck.studyCount} {t('common.sessions')}
                  </span>
                )}
              </div>
            </div>
            {isOwner && (
              <div className='flex gap-2'>
                {canShareDeck && (
                  <button
                    type='button'
                    className='btn btn-secondary btn-sm'
                    onClick={() => setShowShare(true)}
                  >
                    {t('deck.share')}
                  </button>
                )}
                <button
                  type='button'
                  className='btn btn-secondary btn-sm'
                  onClick={() => navigate(`/decks/${id}/edit`)}
                >
                  {t('deck.editDeck')}
                </button>
              </div>
            )}
          </div>

          {deck.cardCount > 0 && (
            <div className='grid grid-cols-4 gap-2.5 max-[720px]:grid-cols-2'>
              {STUDY_MODES.map(({ key, icon }) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => navigate(`/decks/${id}/study/${key}`)}
                  className='text-text cursor-pointer rounded-[12px] bg-[rgba(0,0,0,0.3)] p-3 text-center transition-colors duration-200'
                  style={modeBtnStyle}
                >
                  <div className='mb-1 text-[22px]'>{icon}</div>
                  <div className='text-[13px] font-semibold'>
                    {t(`deck.modes.${key}.label`)}
                  </div>
                  <div className='text-text3 mt-0.5 text-[11px]'>
                    {t(`deck.modes.${key}.desc`)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='mb-5 flex items-center justify-between gap-3'>
        <h2 className='font-display text-xl'>
          {t('deck.cardsTitle', { count: deck.cardCount })}
        </h2>
        <div className='relative'>
          <span className='text-text3 absolute top-1/2 left-3 -translate-y-1/2 text-sm'>
            🔍
          </span>
          <input
            className='input-field h-[38px] w-[220px] pl-9 text-sm'
            placeholder={t('deck.searchCards')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className='text-text3 px-6 py-[60px] text-center'>
          {deck.cardCount === 0 ? (
            <>
              <div className='mb-4 text-5xl'>🃏</div>
              <p className='mb-4'>{t('deck.noCards')}</p>
              {isOwner && (
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => navigate(`/decks/${id}/edit`)}
                >
                  {t('deck.addCards')}
                </button>
              )}
            </>
          ) : (
            <p>{t('deck.noCardMatch', { q: searchQ })}</p>
          )}
        </div>
      ) : (
        <div className='flex flex-col gap-2.5'>
          {filtered.map((card: CardItem) => (
            <div key={card.id} className={cardRowClasses}>
              {card.termImageUrl ? (
                <img
                  src={card.termImageUrl}
                  alt={card.term}
                  className='border-border h-14 w-14 rounded-[10px] border object-cover'
                  loading='lazy'
                />
              ) : (
                <div
                  className='border-border bg-bg text-text3 flex h-14 w-14 items-center justify-center rounded-[10px] border border-dashed text-[22px]'
                  aria-hidden
                >
                  🃏
                </div>
              )}
              <div>
                <div className='text-[15px] font-medium'>{card.term}</div>
                {card.transcription && (
                  <div className='text-text3 mt-0.5 text-xs'>
                    {card.transcription}
                  </div>
                )}
                {card.example && (
                  <div className='text-text3 mt-1 text-xs italic'>
                    &ldquo;{card.example}&rdquo;
                  </div>
                )}
              </div>
              <div className='text-text2 text-[15px]'>{card.definition}</div>
              <div className='flex gap-1.5'>
                <button
                  type='button'
                  className='btn btn-ghost btn-icon text-text3 text-base'
                  title={t('deck.pronounceTerm')}
                  onClick={() => speak(card.term, deck.sourceLanguage)}
                >
                  🔊
                </button>
                <button
                  type='button'
                  className='btn btn-ghost btn-icon text-text3 text-base'
                  title={t('deck.pronounceTermSlow')}
                  onClick={() =>
                    speak(card.term, deck.sourceLanguage, { slow: true })
                  }
                >
                  🐢
                </button>
                <button
                  type='button'
                  className='btn btn-ghost btn-icon text-text3 text-base'
                  title={t('deck.pronounceDef')}
                  onClick={() => speak(card.definition, deck.targetLanguage)}
                >
                  🔊
                </button>
                <button
                  type='button'
                  className='btn btn-ghost btn-icon text-text3 text-base'
                  title={t('deck.pronounceDefSlow')}
                  onClick={() =>
                    speak(card.definition, deck.targetLanguage, { slow: true })
                  }
                >
                  🐢
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showShare && (
        <ShareDeckModal
          deckId={Number(id)}
          deckTitle={deck.title}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
