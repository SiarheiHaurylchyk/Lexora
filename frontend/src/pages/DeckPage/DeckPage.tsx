import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CardSrsBadge } from '@ui';

import { StudyModeGrid } from '@/widgets/StudyMode';

import { ShareDeckModal } from '@/features/ShareDeck';

import type { CardItem, DeckItem, DeckSrsPayload } from '@/shared/api/types';
import { shouldShowSpeakButton, useSpeech } from '@/shared/hooks/useSpeech';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useApiQuery } from '@/shared/lib/query';
import {
  buildSrsMap,
  type CardSrsFilter,
  matchesSrsFilter,
} from '@/shared/lib/srs';
import { useAuthStore } from '@/shared/lib/storeHooks';

const cardRowClasses = tw`grid items-center gap-4 grid-cols-[56px_1fr_1fr_auto] rounded-[12px] border border-border bg-surface px-5 py-4 transition-colors duration-200 hover:border-border2`;

export function DeckPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { speak } = useSpeech();
  const [searchQ, setSearchQ] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [studyDir, setStudyDir] = useState<'forward' | 'reverse' | 'mixed'>(
    'forward',
  );
  const [cardFilter, setCardFilter] = useState<CardSrsFilter>('all');

  const deckId = Number(id);
  const deckQuery = useApiQuery<DeckItem>({
    queryKey: ['deck', deckId],
    url: `/decks/${deckId}`,
    enabled: Number.isFinite(deckId),
  });
  const srsQuery = useApiQuery<DeckSrsPayload>({
    queryKey: ['srs', deckId],
    url: `/decks/${deckId}/srs`,
    enabled: Number.isFinite(deckId) && !!user,
  });
  const deck = deckQuery.data ?? null;
  const srs = srsQuery.data ?? null;
  const srsMap = buildSrsMap(srs?.cards ?? []);
  const learningCount = useMemo(() => {
    if (!srs) return 0;
    return srs.cards.filter(
      (c) =>
        c.status === 'LEARNING' ||
        c.status === 'FAMILIAR' ||
        c.status === 'KNOWN',
    ).length;
  }, [srs]);
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
  const filtered = (deck.cards || []).filter((c: CardItem) => {
    const q = searchQ.toLowerCase();
    const matchesSearch =
      c.term.toLowerCase().includes(q) ||
      c.definition.toLowerCase().includes(q);
    return matchesSearch && matchesSrsFilter(c.id, cardFilter, srsMap);
  });

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
            <div>
              {srs && (
                <div className='mb-4 flex flex-wrap items-center gap-2'>
                  <span className='badge badge-warning'>
                    {t('srs.statsDue', { count: srs.dueCount })}
                  </span>
                  <span className='badge badge-brand'>
                    {t('srs.statsNew', { count: srs.newCount })}
                  </span>
                  <span className='badge badge-success'>
                    {t('srs.statsMastered', { count: srs.masteredCount })}
                  </span>
                  {srs.dueCount > 0 && (
                    <button
                      type='button'
                      className='btn btn-primary btn-sm ml-auto'
                      onClick={() =>
                        navigate(`/decks/${id}/study/REVIEW?dir=${studyDir}`)
                      }
                    >
                      {t('srs.reviewDeck', { count: srs.dueCount })}
                    </button>
                  )}
                </div>
              )}
              <p className='text-text3 mb-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase'>
                {t('deck.direction.label')}
              </p>

              {/*
               * Direction segmented control.
               * Three pill buttons inside a dark container.
               * Active button: brand gradient + glow shadow.
               * Inactive button: subtle hover background + text brightens.
               */}
              <div
                className='border-border2 bg-bg3/80 mb-5 flex gap-2 rounded-[22px] border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                role='group'
                aria-label={t('deck.direction.label')}
              >
                {(
                  [
                    {
                      id: 'forward' as const,
                      primary: deck.sourceLanguage,
                      secondary: deck.targetLanguage,
                    },
                    {
                      id: 'reverse' as const,
                      primary: deck.targetLanguage,
                      secondary: deck.sourceLanguage,
                    },
                    { id: 'mixed' as const, primary: null, secondary: null },
                  ] as const
                ).map((opt) => {
                  const isActive = studyDir === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type='button'
                      onClick={() => setStudyDir(opt.id)}
                      className={cn(
                        'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-3 py-3.5 transition-all duration-200 active:scale-95',
                        isActive
                          ? 'from-brand to-accent bg-gradient-to-br via-[#6d28d9] text-white shadow-[0_6px_28px_rgba(124,58,237,0.55)]'
                          : 'text-text2 hover:bg-bg4 hover:text-text',
                      )}
                    >
                      {opt.id === 'mixed' ? (
                        <>
                          {/* ↔ icon — gets brighter on active */}
                          <span
                            className={cn(
                              'text-[22px] leading-none transition-transform duration-200',
                              isActive ? 'text-white' : 'text-text3',
                            )}
                          >
                            ↔
                          </span>
                          <span
                            className={cn(
                              'text-[11px] font-semibold tracking-wider uppercase',
                              isActive ? 'text-white/85' : 'text-text3',
                            )}
                          >
                            {t('deck.direction.mixed')}
                          </span>
                        </>
                      ) : (
                        <>
                          {/* Language pair — e.g. "EN → RU" */}
                          <span className='font-display flex items-center gap-1.5 text-[15px] font-bold tracking-wide'>
                            <span className='uppercase'>{opt.primary}</span>
                            <span
                              className={cn(
                                'text-[13px] font-normal',
                                isActive ? 'text-white/65' : 'text-text3',
                              )}
                            >
                              →
                            </span>
                            <span className='uppercase'>{opt.secondary}</span>
                          </span>
                          {/* Small hint label */}
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              isActive ? 'text-white/60' : 'text-text3/70',
                            )}
                          >
                            {opt.id === 'forward'
                              ? t('deck.direction.forwardHint')
                              : t('deck.direction.reverseHint')}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
              <StudyModeGrid deckId={id!} studyDir={studyDir} />
            </div>
          )}
        </div>
      </div>

      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='font-display text-xl'>
          {t('deck.cardsTitle', { count: deck.cardCount })}
        </h2>
        <div className='flex flex-wrap items-center gap-2'>
          {(
            [
              ['all', srs ? deck.cardCount : null],
              ['due', srs?.dueCount],
              ['new', srs?.newCount],
              ['learning', srs ? learningCount : null],
              ['mastered', srs?.masteredCount],
            ] as const
          ).map(([key, count]) => (
            <button
              key={key}
              type='button'
              className={cn(
                'btn btn-sm',
                cardFilter === key ? 'btn-primary' : 'btn-secondary',
              )}
              onClick={() => setCardFilter(key)}
            >
              {t(`srs.filter.${key}`)}
              {count != null ? ` (${count})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className='mb-5 flex justify-end'>
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
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-[15px] font-medium'>{card.term}</div>
                  {srs && srsMap.has(card.id) && (
                    <CardSrsBadge
                      status={srsMap.get(card.id)!.status}
                      due={srsMap.get(card.id)!.due}
                    />
                  )}
                </div>
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
              {shouldShowSpeakButton(card.term, deck.sourceLanguage) && (
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
                </div>
              )}
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
