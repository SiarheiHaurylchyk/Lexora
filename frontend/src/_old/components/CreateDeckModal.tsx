/**
 * CreateDeckModal — popup with a small wizard to create a new deck.
 *
 * The user picks a title, language pair, color and emoji. A live preview at
 * the top shows what the deck card will look like. After "Create deck" the
 * parent (Dashboard) usually navigates to the deck editor so the user can
 * start adding cards.
 */
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { deckApi } from '../services/api';
import styles from './CreateDeckModal.module.css';

/** Palette of colors the user can pick for the deck cover. */
const COLORS = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6','#0EA5E9','#14B8A6','#F97316'];

/** Set of icons the user can pick to represent the deck. */
const EMOJIS = ['📚','🌍','💬','🔤','🎓','✍️','🧠','🗣️','📖','🌐','🎯','⚡','🔑','🏆','✨'];

/** Supported language codes (used for the From / To dropdowns). */
const LANG_CODES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'zh', 'ja', 'ko', 'tr', 'pl', 'uk', 'ar'] as const;

interface Props {
  onClose: () => void;
  onCreated: (deck: any) => void;
}

export default function CreateDeckModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    sourceLanguage: 'en',
    targetLanguage: 'ru',
    coverColor: COLORS[0],
    emoji: EMOJIS[0],
    visibility: 'PRIVATE',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t('createDeck.titleRequired'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await deckApi.createDeck(form);
      toast.success(t('createDeck.created'));
      onCreated(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('createDeck.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const langName = (code: string) => t(`languages.${code}`);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} animate-scale`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('createDeck.modalTitle')}</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </div>

        <div
          className={styles.preview}
          style={{
            background: `linear-gradient(135deg, ${form.coverColor}22, ${form.coverColor}11)`,
            border: `1px solid ${form.coverColor}44`,
          }}
        >
          <div className={styles.previewIcon} style={{ background: `${form.coverColor}33` }}>
            {form.emoji}
          </div>
          <div>
            <div className={styles.previewTitle}>{form.title || t('createDeck.previewTitle')}</div>
            <div className={styles.previewSub}>
              {langName(form.sourceLanguage)} → {langName(form.targetLanguage)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>{t('createDeck.titleStar')}</label>
            <input
              className="input-field"
              placeholder={t('createDeck.titlePh')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('createDeck.description')}</label>
            <textarea
              className="input-field"
              placeholder={t('createDeck.descPh')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ resize: 'vertical', minHeight: 72 }}
            />
          </div>

          <div className={styles.langsRow}>
            <div>
              <label className={styles.label}>{t('createDeck.fromLang')}</label>
              <select
                className={`input-field ${styles.inputSelect}`}
                value={form.sourceLanguage}
                onChange={(e) => setForm({ ...form, sourceLanguage: e.target.value })}
              >
                {LANG_CODES.map((code) => (
                  <option key={code} value={code}>{langName(code)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>{t('createDeck.toLang')}</label>
              <select
                className={`input-field ${styles.inputSelect}`}
                value={form.targetLanguage}
                onChange={(e) => setForm({ ...form, targetLanguage: e.target.value })}
              >
                {LANG_CODES.map((code) => (
                  <option key={code} value={code}>{langName(code)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('createDeck.color')}</label>
            <div className={styles.colorRow}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, coverColor: c })}
                  className={`${styles.colorDot} ${form.coverColor === c ? styles.active : ''}`}
                  style={{ background: c, outline: form.coverColor === c ? `3px solid ${c}` : 'none' }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('createDeck.icon')}</label>
            <div className={styles.colorRow}>
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setForm({ ...form, emoji: em })}
                  className={`${styles.emojiBtn} ${form.emoji === em ? styles.active : ''}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t('createDeck.visibility')}</label>
            <div className={styles.visibilityRow}>
              {[
                { value: 'PRIVATE', label: t('editDeck.optPrivate'), desc: t('common.onlyYou') },
                { value: 'PUBLIC', label: t('editDeck.optPublic'), desc: t('common.everyone') },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, visibility: value })}
                  className={`${styles.visibilityBtn} ${form.visibility === value ? styles.active : ''}`}
                >
                  <div className={styles.visLabel}>{label}</div>
                  <div className={styles.visDesc}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={`btn btn-secondary ${styles.actionCancel}`} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className={`btn btn-primary ${styles.actionSubmit}`} disabled={loading}>
              {loading ? t('createDeck.creating') : t('createDeck.createBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
