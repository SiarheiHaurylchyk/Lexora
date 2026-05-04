import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi } from '../services/api';
import { useAppSelector } from '../store/hooks';
import { userCanTeach } from '../lib/accountRole';
import { useSpeech } from '../hooks/useSpeech';
import ShareDeckModal from '../components/decks/ShareDeckModal';
import styles from './DeckPage.module.css';

/**
 * DeckPage — view of a single deck.
 *
 * It shows:
 *   - a hero card with the deck title, description, language pair and study modes
 *   - a list of all cards in the deck
 *
 * The owner gets "Edit deck". Teacher accounts also get "Share" (private deck access).
 */

const STUDY_MODES = [
  { key: 'FLASHCARD', icon: '⚡' },
  { key: 'LEARN', icon: '🎯' },
  { key: 'MATCH', icon: '🧩' },
  { key: 'SPELL', icon: '✏️' },
] as const;

export default function DeckPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { speak } = useSpeech();
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await deckApi.getDeck(Number(id));
        if (!cancelled) setDeck(data);
      } catch {
        if (!cancelled) {
          toast.error(t('deck.notFound'));
          navigate('/decks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate, t]);

  if (loading) return (
    <div style={{ padding: '40px 0', width: '100%', boxSizing: 'border-box' }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 20, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
    </div>
  );

  if (!deck) return null;
  const isOwner = user?.id === deck.owner?.id;
  const canShareDeck = isOwner && userCanTeach(user?.role);
  const filtered = (deck.cards || []).filter((c: any) =>
    c.term.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.definition.toLowerCase().includes(searchQ.toLowerCase())
  );

  const accent = deck.coverColor || '#7C3AED';

  return (
    <div className={styles.page}>
      <button type="button" className={`btn btn-ghost ${styles.backBtn}`} onClick={() => navigate('/decks')}>
        {t('deck.backToDecks')}
      </button>

      <div
        className={styles.heroCard}
        style={{
          background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
          border: `1px solid ${accent}33`,
        }}
      >
        <div className={styles.heroCircle} style={{ background: `${accent}10` }} />
        <div className={styles.heroBody}>
          <div className={styles.heroHead}>
            <div
              className={styles.heroIcon}
              style={{ background: `${accent}25`, border: `1px solid ${accent}44` }}
            >
              {deck.emoji || '📚'}
            </div>
            <div style={{ flex: 1 }}>
              <h1 className={styles.heroTitle}>{deck.title}</h1>
              {deck.description && <p className={styles.heroDesc}>{deck.description}</p>}
              <div className={styles.heroMeta}>
                <span className="badge badge-brand">{deck.sourceLanguage} → {deck.targetLanguage}</span>
                <span className={styles.heroMetaText}>{t('common.by')} {deck.owner?.displayName || deck.owner?.username}</span>
                <span className={styles.heroMetaText}>🃏 {deck.cardCount} {t('common.cards')}</span>
                {deck.studyCount > 0 && (
                  <span className={styles.heroMetaText}>▶ {deck.studyCount} {t('common.sessions')}</span>
                )}
              </div>
            </div>
            {isOwner && (
              <div style={{ display: 'flex', gap: 8 }}>
                {canShareDeck && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowShare(true)}
                  >
                    {t('deck.share')}
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/decks/${id}/edit`)}>
                  {t('deck.editDeck')}
                </button>
              </div>
            )}
          </div>

          {deck.cardCount > 0 && (
            <div className={styles.modes}>
              {STUDY_MODES.map(({ key, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate(`/decks/${id}/study/${key}`)}
                  className={styles.modeBtn}
                  style={{ border: `1px solid ${accent}44` }}
                >
                  <div className={styles.modeIcon}>{icon}</div>
                  <div className={styles.modeLabel}>{t(`deck.modes.${key}.label`)}</div>
                  <div className={styles.modeDesc}>{t(`deck.modes.${key}.desc`)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardsHead}>
        <h2 className={styles.cardsTitle}>{t('deck.cardsTitle', { count: deck.cardCount })}</h2>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={`input-field ${styles.searchInput}`}
            placeholder={t('deck.searchCards')}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {deck.cardCount === 0 ? (
            <>
              <div className={styles.emptyIcon}>🃏</div>
              <p style={{ marginBottom: 16 }}>{t('deck.noCards')}</p>
              {isOwner && (
                <button type="button" className="btn btn-primary" onClick={() => navigate(`/decks/${id}/edit`)}>
                  {t('deck.addCards')}
                </button>
              )}
            </>
          ) : <p>{t('deck.noCardMatch', { q: searchQ })}</p>}
        </div>
      ) : (
        <div className={styles.cardList}>
          {filtered.map((card: any) => (
            <div key={card.id} className={styles.cardRow}>
              {card.termImageUrl ? (
                <img src={card.termImageUrl} alt={card.term} className={styles.cardImg} loading="lazy" />
              ) : (
                <div className={styles.cardImgStub} aria-hidden>🃏</div>
              )}
              <div>
                <div className={styles.cardTerm}>{card.term}</div>
                {card.transcription && <div className={styles.cardTrans}>{card.transcription}</div>}
                {card.example && <div className={styles.cardExample}>"{card.example}"</div>}
              </div>
              <div className={styles.cardDef}>{card.definition}</div>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                  title={t('deck.pronounceTerm')}
                  onClick={() => speak(card.term, deck.sourceLanguage)}
                >
                  🔊
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                  title={t('deck.pronounceTermSlow')}
                  onClick={() => speak(card.term, deck.sourceLanguage, { slow: true })}
                >
                  🐢
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                  title={t('deck.pronounceDef')}
                  onClick={() => speak(card.definition, deck.targetLanguage)}
                >
                  🔊
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                  title={t('deck.pronounceDefSlow')}
                  onClick={() => speak(card.definition, deck.targetLanguage, { slow: true })}
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
