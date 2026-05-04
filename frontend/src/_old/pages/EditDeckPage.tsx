/**
 * EditDeckPage — full editor for a single deck.
 *
 * The page has two big parts:
 *   1. "Deck settings" card — title, description, language pair, color, emoji,
 *      visibility (private vs public). Saved with the "Save settings" button.
 *   2. "Cards" list — each card can be expanded into an editor with term,
 *      definition, transcription, example sentence and optional images for
 *      both the term and the translation. Cards can also be created in bulk
 *      from a multi-line "term - definition" text.
 *
 * Only the deck owner can open this page; the backend also enforces this.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi } from '../services/api';
import { useSpeech } from '../hooks/useSpeech';
import CardImagePicker from '../components/CardImagePicker';
import styles from './EditDeckPage.module.css';

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#0EA5E9', '#14B8A6', '#F97316'];
const EMOJIS = ['📚', '🌍', '💬', '🔤', '🎓', '✍️', '🧠', '🗣️', '📖', '🌐', '🎯', '⚡', '🔑', '🏆', '✨'];
const LANG_CODES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'zh', 'ja', 'ko', 'tr', 'pl', 'uk', 'ar'] as const;

/** Local form state for a single card while the user is editing. */
interface CardForm {
  id?: number;
  term: string;
  definition: string;
  example: string;
  transcription: string;
  termImageUrl: string;
  definitionImageUrl: string;
  /** True for cards that exist only in the form (not saved on the server yet). */
  isNew?: boolean;
}

/** Tiny helper: join class names while skipping falsy values. */
const cx = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(' ');

/** Pick a human-readable error message out of an axios error, if any. */
function apiErrorMessage(e: unknown): string | undefined {
  if (!e || typeof e !== 'object') return undefined;
  const res = (e as { response?: { data?: unknown } }).response?.data;
  if (typeof res === 'string') return res;
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.error === 'string') return o.error;
  }
  return undefined;
}

export default function EditDeckPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [, setDeck] = useState<any>(null);
  const [meta, setMeta] = useState({
    title: '',
    description: '',
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    coverColor: '#7C3AED',
    emoji: '📚',
    visibility: 'PRIVATE',
  });
  const [cards, setCards] = useState<CardForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const langName = useCallback((code: string) => t(`languages.${code}`), [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await deckApi.getDeck(Number(id));
        if (cancelled) return;
        setDeck(data);
        setMeta({
          title: data.title,
          description: data.description || '',
          sourceLanguage: data.sourceLanguage,
          targetLanguage: data.targetLanguage,
          coverColor: data.coverColor || '#7C3AED',
          emoji: data.emoji || '📚',
          visibility: data.visibility,
        });
        setCards((data.cards || []).map((c: any) => ({
          id: c.id,
          term: c.term,
          definition: c.definition,
          example: c.example || '',
          transcription: c.transcription || '',
          termImageUrl: c.termImageUrl || '',
          definitionImageUrl: c.definitionImageUrl || '',
        })));
      } catch {
        if (!cancelled) {
          toast.error(t('editDeck.notFound'));
          navigate('/decks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate, t]);

  /** Save the deck-level settings (title, description, color, etc.). */
  const saveMeta = async () => {
    setSaving(true);
    try {
      await deckApi.updateDeck(Number(id), meta);
      toast.success(t('editDeck.saved'));
    } catch (e) {
      toast.error(apiErrorMessage(e) || t('editDeck.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  /** Append an empty card at the bottom and open it for editing right away. */
  const addCard = () => {
    const newCard: CardForm = {
      term: '',
      definition: '',
      example: '',
      transcription: '',
      termImageUrl: '',
      definitionImageUrl: '',
      isNew: true,
    };
    setCards((prev) => [...prev, newCard]);
    setActiveCard(cards.length);
  };

  /** Persist one card. Creates it if it is still local, otherwise updates. */
  const saveCard = async (idx: number) => {
    const card = cards[idx];
    if (!card.term.trim() || !card.definition.trim()) {
      toast.error(t('editDeck.termRequired'));
      return;
    }
    try {
      const payload = {
        term: card.term,
        definition: card.definition,
        example: card.example,
        transcription: card.transcription,
        termImageUrl: card.termImageUrl || null,
        definitionImageUrl: card.definitionImageUrl || null,
        sortOrder: idx,
      };
      if (card.isNew || !card.id) {
        const { data } = await deckApi.addCard(Number(id), payload);
        setCards((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], id: data.id, isNew: false };
          return next;
        });
        toast.success(t('editDeck.cardAdded'));
      } else {
        await deckApi.updateCard(Number(id), card.id!, payload);
        setCards((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], isNew: false };
          return next;
        });
        toast.success(t('editDeck.cardUpdated'));
      }
    } catch (e) {
      toast.error(apiErrorMessage(e) || t('editDeck.cardSaveFailed'));
    }
  };

  /** Remove a card both locally and on the server (if it was saved). */
  const deleteCard = async (idx: number) => {
    const card = cards[idx];
    if (card.id && !card.isNew) {
      try {
        await deckApi.deleteCard(Number(id), card.id);
        toast.success(t('editDeck.cardDeleted'));
      } catch {
        toast.error(t('editDeck.cardDeleteFailed'));
        return;
      }
    }
    setCards((prev) => prev.filter((_, i) => i !== idx));
    if (activeCard === idx) setActiveCard(null);
  };

  /**
   * Parse a multi-line "term separator definition" string and add a new
   * (unsaved) card for every valid line. Accepted separators: tab, ";", "-".
   */
  const handleBulkImport = () => {
    const lines = bulkText.trim().split('\n').filter((l) => l.trim());
    const newCards: CardForm[] = [];
    for (const line of lines) {
      const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : '-';
      const parts = line.split(sep);
      if (parts.length >= 2) {
        newCards.push({
          term: parts[0].trim(),
          definition: parts[1].trim(),
          example: parts[2]?.trim() || '',
          transcription: '',
          termImageUrl: '',
          definitionImageUrl: '',
          isNew: true,
        });
      }
    }
    if (newCards.length === 0) {
      toast.error(t('editDeck.bulkInvalid'));
      return;
    }
    setCards((prev) => [...prev, ...newCards]);
    setBulkText('');
    setShowBulk(false);
    toast.success(t('editDeck.bulkSuccess', { count: newCards.length }));
  };

  /** Patch one field of one card in the local form state. */
  const updateCard = (idx: number, field: keyof CardForm, value: string) => {
    setCards((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });
  };

  if (loading) return (
    <div style={{ padding: '40px 0', width: '100%', boxSizing: 'border-box' }}>
      <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
    </div>
  );

  const bulkLines = bulkText.split('\n').filter((l) => l.trim()).length;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(`/decks/${id}`)}>
          {t('common.back')}
        </button>
        <h1 className={styles.title}>{t('editDeck.title')}</h1>
        <div className={styles.headActions}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/decks/${id}`)}>
            {t('editDeck.viewDeck')}
          </button>
          <button type="button" className="btn btn-primary" onClick={saveMeta} disabled={saving}>
            {saving ? t('editDeck.saving') : t('editDeck.saveSettings')}
          </button>
        </div>
      </div>

      <div className={`card ${styles.section}`}>
        <h2 className={styles.sectionTitle}>{t('editDeck.settingsTitle')}</h2>

        <div className={styles.row2}>
          <div>
            <label className={styles.label}>{t('editDeck.titleLabel')}</label>
            <input
              className="input-field"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder={t('editDeck.titlePh')}
            />
          </div>
          <div>
            <label className={styles.label}>{t('editDeck.visibility')}</label>
            <select
              className="input-field"
              value={meta.visibility}
              onChange={(e) => setMeta({ ...meta, visibility: e.target.value })}
            >
              <option value="PRIVATE">{t('editDeck.optPrivate')}</option>
              <option value="PUBLIC">{t('editDeck.optPublic')}</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('editDeck.description')}</label>
          <textarea
            className={`input-field ${styles.textarea}`}
            value={meta.description}
            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
          />
        </div>

        <div className={styles.row2}>
          <div>
            <label className={styles.label}>{t('editDeck.fromLang')}</label>
            <select
              className="input-field"
              value={meta.sourceLanguage}
              onChange={(e) => setMeta({ ...meta, sourceLanguage: e.target.value })}
            >
              {LANG_CODES.map((code) => <option key={code} value={code}>{langName(code)}</option>)}
            </select>
          </div>
          <div>
            <label className={styles.label}>{t('editDeck.toLang')}</label>
            <select
              className="input-field"
              value={meta.targetLanguage}
              onChange={(e) => setMeta({ ...meta, targetLanguage: e.target.value })}
            >
              {LANG_CODES.map((code) => <option key={code} value={code}>{langName(code)}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('editDeck.color')}</label>
          <div className={styles.colorRow}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setMeta({ ...meta, coverColor: c })}
                className={cx(styles.colorBtn, meta.coverColor === c && styles.colorBtnActive)}
                style={{ background: c, outline: meta.coverColor === c ? `3px solid ${c}` : 'none' }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={styles.label}>{t('editDeck.icon')}</label>
          <div className={styles.emojiRow}>
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setMeta({ ...meta, emoji: em })}
                className={cx(styles.emojiBtn, meta.emoji === em && styles.emojiBtnActive)}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className={styles.cardsHead}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            {t('editDeck.cardsTitle', { count: cards.length })}
          </h2>
          <div className={styles.cardsHeadActions}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBulk((s) => !s)}>
              {t('editDeck.bulkImport')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={addCard}>
              {t('editDeck.addCard')}
            </button>
          </div>
        </div>

        {showBulk && (
          <div className={`card ${styles.bulkBox}`}>
            <h3 className={styles.bulkTitle}>{t('editDeck.bulkTitle')}</h3>
            <p className={styles.bulkHelp}>{t('editDeck.bulkImportInstructions')}</p>
            <textarea
              className={`input-field ${styles.bulkTextarea}`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'apple - яблоко\ndog - собака\nhouse - дом'}
            />
            <div className={styles.bulkActions}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBulk(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleBulkImport}>
                {t('editDeck.importCount', { count: bulkLines })}
              </button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIcon}>🃏</div>
            <p style={{ color: 'var(--text3)', marginBottom: 20 }}>{t('editDeck.noCardsBody')}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBulk(true)}>
                {t('editDeck.bulkImport')}
              </button>
              <button type="button" className="btn btn-primary" onClick={addCard}>
                {t('editDeck.addFirst')}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.cardList}>
            {cards.map((card, idx) => (
              <div key={idx} className={cx(styles.cardWrap, activeCard === idx && styles.cardWrapActive)}>
                {activeCard !== idx ? (
                  <div className={styles.cardCollapsed} onClick={() => setActiveCard(idx)}>
                    {card.termImageUrl && (
                      <img src={card.termImageUrl} alt="" className={styles.cardThumb} />
                    )}
                    <div className={styles.cardTerm} style={{ color: card.term ? 'var(--text)' : 'var(--text3)' }}>
                      {card.term || t('editDeck.clickEditTerm')}
                    </div>
                    <div className={styles.cardDef} style={{ color: card.definition ? 'var(--text2)' : 'var(--text3)' }}>
                      {card.definition || t('editDeck.clickEditDef')}
                    </div>
                    <div className={styles.cardActions}>
                      {card.isNew && <span className="badge badge-warning">{t('editDeck.unsaved')}</span>}
                      <button
                        type="button"
                        className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                        title={t('editDeck.speakTerm')}
                        onClick={(e) => { e.stopPropagation(); speak(card.term, meta.sourceLanguage); }}
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        className={`btn btn-ghost btn-icon ${styles.iconBtn}`}
                        title={t('editDeck.deleteCard')}
                        onClick={(e) => { e.stopPropagation(); deleteCard(idx); }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardEditing}>
                    <div className={styles.editFieldRow}>
                      <div>
                        <label className={styles.smallLabel}>{t('editDeck.term', { lang: meta.sourceLanguage })}</label>
                        <div className={styles.relative}>
                          <input
                            className={`input-field ${styles.inputSpeak}`}
                            value={card.term}
                            onChange={(e) => updateCard(idx, 'term', e.target.value)}
                            placeholder={t('editDeck.termPh')}
                            autoFocus
                          />
                          <button
                            type="button"
                            className={styles.speakBtn}
                            onClick={() => speak(card.term, meta.sourceLanguage)}
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={styles.smallLabel}>{t('editDeck.definition', { lang: meta.targetLanguage })}</label>
                        <div className={styles.relative}>
                          <input
                            className={`input-field ${styles.inputSpeak}`}
                            value={card.definition}
                            onChange={(e) => updateCard(idx, 'definition', e.target.value)}
                            placeholder={t('editDeck.defPh')}
                          />
                          <button
                            type="button"
                            className={styles.speakBtn}
                            onClick={() => speak(card.definition, meta.targetLanguage)}
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.editFieldRowSpaced}>
                      <div>
                        <label className={styles.smallLabelPlain}>{t('editDeck.transcription')}</label>
                        <input
                          className="input-field"
                          value={card.transcription}
                          onChange={(e) => updateCard(idx, 'transcription', e.target.value)}
                          placeholder="/ˈæp.əl/"
                        />
                      </div>
                      <div>
                        <label className={styles.smallLabelPlain}>{t('editDeck.example')}</label>
                        <input
                          className="input-field"
                          value={card.example}
                          onChange={(e) => updateCard(idx, 'example', e.target.value)}
                          placeholder={t('editDeck.examplePh')}
                        />
                      </div>
                    </div>

                    <div className={styles.imagePickers}>
                      <CardImagePicker
                        label={t('editDeck.termImage')}
                        prompt={card.term || card.definition}
                        context={card.definition || undefined}
                        value={card.termImageUrl}
                        onChange={(url) => updateCard(idx, 'termImageUrl', url)}
                      />
                      <CardImagePicker
                        label={t('editDeck.defImage')}
                        prompt={card.definition || card.term}
                        context={card.term || undefined}
                        value={card.definitionImageUrl}
                        onChange={(url) => updateCard(idx, 'definitionImageUrl', url)}
                      />
                    </div>

                    <div className={styles.editActions}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveCard(null)}>
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => deleteCard(idx)}
                      >
                        🗑 {t('common.delete')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-primary btn-sm ${styles.saveBtn}`}
                        onClick={() => { saveCard(idx); setActiveCard(null); }}
                      >
                        {t('editDeck.saveCard')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button type="button" className={`btn btn-secondary ${styles.addAnother}`} onClick={addCard}>
              {t('editDeck.addAnother')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
