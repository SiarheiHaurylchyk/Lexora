import { type CSSProperties, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { CardImagePicker } from '@/features/CardImagePicker';

import { deckApi } from '@/shared/api/api-legacy';
import type { CardItem, DeckItem } from '@/shared/api/types';
import { useSpeech } from '@/shared/hooks/useSpeech';

const COLORS = [
  '#7C3AED',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
];
const EMOJIS = [
  '📚',
  '🌍',
  '💬',
  '🔤',
  '🎓',
  '✍️',
  '🧠',
  '🗣️',
  '📖',
  '🌐',
  '🎯',
  '⚡',
  '🔑',
  '🏆',
  '✨',
];
const LANG_CODES = [
  'en',
  'ru',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'zh',
  'ja',
  'ko',
  'tr',
  'pl',
  'uk',
  'ar',
] as const;

interface CardForm {
  id?: number;
  term: string;
  definition: string;
  example: string;
  transcription: string;
  termImageUrl: string;
  definitionImageUrl: string;
  isNew?: boolean;
}

const labelClasses = tw`mb-1.5 block text-[13px] font-medium text-text2`;
const smallLabelUpper = tw`mb-1.5 block text-xs uppercase tracking-[0.5px] text-text3`;
const smallLabelPlain = tw`mb-1.5 block text-xs text-text3`;
const editRowGrid = tw`mb-3 grid gap-4 grid-cols-2 max-[600px]:grid-cols-1`;
const inputSpeakClasses = tw`input-field !pr-10`;
const speakBtnClasses = tw`absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent text-base text-text3`;
const sectionClasses = tw`card mb-7`;

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

export function EditDeckPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [, setDeck] = useState<DeckItem | null>(null);
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
        setCards(
          (data.cards || []).map((c: CardItem) => ({
            id: c.id,
            term: c.term,
            definition: c.definition,
            example: c.example || '',
            transcription: c.transcription || '',
            termImageUrl: c.termImageUrl || '',
            definitionImageUrl: c.definitionImageUrl || '',
          })),
        );
      } catch {
        if (!cancelled) {
          toast.error(t('editDeck.notFound'));
          navigate('/decks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, t]);

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

  const handleBulkImport = () => {
    const lines = bulkText
      .trim()
      .split('\n')
      .filter((l) => l.trim());
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

  const updateCard = (idx: number, field: keyof CardForm, value: string) => {
    setCards((prev) => {
      const next = [...prev];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next[idx] as any)[field] = value;
      return next;
    });
  };

  if (loading)
    return (
      <div className='box-border w-full py-10'>
        <div className='skeleton h-[400px] rounded-[20px]' />
      </div>
    );

  const bulkLines = bulkText.split('\n').filter((l) => l.trim()).length;

  return (
    <div className='box-border w-full py-10'>
      <div className='mb-8 flex flex-wrap items-center gap-4'>
        <button
          type='button'
          className='btn btn-ghost'
          onClick={() => navigate(`/decks/${id}`)}
        >
          {t('common.back')}
        </button>
        <h1 className='font-display text-[28px]'>{t('editDeck.title')}</h1>
        <div className='ml-auto flex gap-2.5'>
          <button
            type='button'
            className='btn btn-secondary'
            onClick={() => navigate(`/decks/${id}`)}
          >
            {t('editDeck.viewDeck')}
          </button>
          <button
            type='button'
            className='btn btn-primary'
            onClick={saveMeta}
            disabled={saving}
          >
            {saving ? t('editDeck.saving') : t('editDeck.saveSettings')}
          </button>
        </div>
      </div>

      <div className={sectionClasses}>
        <h2 className='font-display mb-5 text-lg'>
          {t('editDeck.settingsTitle')}
        </h2>

        <div className='mb-4 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
          <div>
            <label className={labelClasses}>{t('editDeck.titleLabel')}</label>
            <input
              className='input-field'
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder={t('editDeck.titlePh')}
            />
          </div>
          <div>
            <label className={labelClasses}>{t('editDeck.visibility')}</label>
            <select
              className='input-field'
              value={meta.visibility}
              onChange={(e) => setMeta({ ...meta, visibility: e.target.value })}
            >
              <option value='PRIVATE'>{t('editDeck.optPrivate')}</option>
              <option value='PUBLIC'>{t('editDeck.optPublic')}</option>
            </select>
          </div>
        </div>

        <div className='mb-4'>
          <label className={labelClasses}>{t('editDeck.description')}</label>
          <textarea
            className='input-field min-h-[60px] resize-y'
            value={meta.description}
            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
          />
        </div>

        <div className='mb-4 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
          <div>
            <label className={labelClasses}>{t('editDeck.fromLang')}</label>
            <select
              className='input-field'
              value={meta.sourceLanguage}
              onChange={(e) =>
                setMeta({ ...meta, sourceLanguage: e.target.value })
              }
            >
              {LANG_CODES.map((code) => (
                <option key={code} value={code}>
                  {langName(code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>{t('editDeck.toLang')}</label>
            <select
              className='input-field'
              value={meta.targetLanguage}
              onChange={(e) =>
                setMeta({ ...meta, targetLanguage: e.target.value })
              }
            >
              {LANG_CODES.map((code) => (
                <option key={code} value={code}>
                  {langName(code)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='mb-4'>
          <label className={labelClasses}>{t('editDeck.color')}</label>
          <div className='flex flex-wrap gap-2'>
            {COLORS.map((c) => {
              const style: CSSProperties = {
                background: c,
                outline: meta.coverColor === c ? `3px solid ${c}` : 'none',
              };
              return (
                <button
                  key={c}
                  type='button'
                  onClick={() => setMeta({ ...meta, coverColor: c })}
                  className={cn(
                    'h-7 w-7 cursor-pointer rounded-full border-2 border-transparent p-0',
                    meta.coverColor === c && 'border-[3px] border-white',
                  )}
                  style={style}
                  aria-label={c}
                />
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelClasses}>{t('editDeck.icon')}</label>
          <div className='flex flex-wrap gap-2'>
            {EMOJIS.map((em) => (
              <button
                key={em}
                type='button'
                onClick={() => setMeta({ ...meta, emoji: em })}
                className={cn(
                  'border-border bg-bg3 h-9 w-9 cursor-pointer rounded-lg border text-xl',
                  meta.emoji === em && 'border-brand bg-brand-dim border-2',
                )}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2.5'>
          <h2 className='font-display m-0 text-lg'>
            {t('editDeck.cardsTitle', { count: cards.length })}
          </h2>
          <div className='flex gap-2.5'>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setShowBulk((s) => !s)}
            >
              {t('editDeck.bulkImport')}
            </button>
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={addCard}
            >
              {t('editDeck.addCard')}
            </button>
          </div>
        </div>

        {showBulk && (
          <div className='card mb-5'>
            <h3 className='font-display mb-2 text-[15px]'>
              {t('editDeck.bulkTitle')}
            </h3>
            <p className='text-text3 mb-3 text-[13px]'>
              {t('editDeck.bulkImportInstructions')}
            </p>
            <textarea
              className='input-field min-h-[120px] resize-y font-mono text-[13px]'
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'apple - яблоко\ndog - собака\nhouse - дом'}
            />
            <div className='mt-3 flex gap-2.5'>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={() => setShowBulk(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={handleBulkImport}
              >
                {t('editDeck.importCount', { count: bulkLines })}
              </button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <div className='border-border2 bg-surface rounded-[20px] border-2 border-dashed px-6 py-[60px] text-center'>
            <div className='mb-4 text-5xl'>🃏</div>
            <p className='text-text3 mb-5'>{t('editDeck.noCardsBody')}</p>
            <div className='flex justify-center gap-3'>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={() => setShowBulk(true)}
              >
                {t('editDeck.bulkImport')}
              </button>
              <button
                type='button'
                className='btn btn-primary'
                onClick={addCard}
              >
                {t('editDeck.addFirst')}
              </button>
            </div>
          </div>
        ) : (
          <div className='flex flex-col gap-2.5'>
            {cards.map((card, idx) => (
              <div
                key={idx}
                className={cn(
                  'border-border bg-surface overflow-hidden rounded-[12px] border transition-colors duration-200',
                  activeCard === idx && 'border-brand',
                )}
              >
                {activeCard !== idx ? (
                  <div
                    className='grid cursor-pointer grid-cols-[auto_1fr_1fr_auto] items-center gap-4 px-5 py-3.5'
                    onClick={() => setActiveCard(idx)}
                  >
                    {card.termImageUrl && (
                      <img
                        src={card.termImageUrl}
                        alt=''
                        className='border-border h-12 w-12 rounded-[10px] border object-cover'
                      />
                    )}
                    <div
                      className={cn(
                        'text-[15px] font-medium',
                        card.term ? 'text-text' : 'text-text3',
                      )}
                    >
                      {card.term || t('editDeck.clickEditTerm')}
                    </div>
                    <div
                      className={cn(
                        'text-[15px]',
                        card.definition ? 'text-text2' : 'text-text3',
                      )}
                    >
                      {card.definition || t('editDeck.clickEditDef')}
                    </div>
                    <div className='flex items-center gap-1.5'>
                      {card.isNew && (
                        <span className='badge badge-warning'>
                          {t('editDeck.unsaved')}
                        </span>
                      )}
                      <button
                        type='button'
                        className='btn btn-ghost btn-icon text-text3 text-[15px]'
                        title={t('editDeck.speakTerm')}
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(card.term, meta.sourceLanguage);
                        }}
                      >
                        🔊
                      </button>
                      <button
                        type='button'
                        className='btn btn-ghost btn-icon text-text3 text-[15px]'
                        title={t('editDeck.deleteCard')}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCard(idx);
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className='px-5 pt-5 pb-4'>
                    <div className={editRowGrid}>
                      <div>
                        <label className={smallLabelUpper}>
                          {t('editDeck.term', { lang: meta.sourceLanguage })}
                        </label>
                        <div className='relative'>
                          <input
                            className={inputSpeakClasses}
                            value={card.term}
                            onChange={(e) =>
                              updateCard(idx, 'term', e.target.value)
                            }
                            placeholder={t('editDeck.termPh')}
                            autoFocus
                          />
                          <button
                            type='button'
                            className={speakBtnClasses}
                            onClick={() =>
                              speak(card.term, meta.sourceLanguage)
                            }
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={smallLabelUpper}>
                          {t('editDeck.definition', {
                            lang: meta.targetLanguage,
                          })}
                        </label>
                        <div className='relative'>
                          <input
                            className={inputSpeakClasses}
                            value={card.definition}
                            onChange={(e) =>
                              updateCard(idx, 'definition', e.target.value)
                            }
                            placeholder={t('editDeck.defPh')}
                          />
                          <button
                            type='button'
                            className={speakBtnClasses}
                            onClick={() =>
                              speak(card.definition, meta.targetLanguage)
                            }
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className='mb-3.5 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1'>
                      <div>
                        <label className={smallLabelPlain}>
                          {t('editDeck.transcription')}
                        </label>
                        <input
                          className='input-field'
                          value={card.transcription}
                          onChange={(e) =>
                            updateCard(idx, 'transcription', e.target.value)
                          }
                          placeholder='/ˈæp.əl/'
                        />
                      </div>
                      <div>
                        <label className={smallLabelPlain}>
                          {t('editDeck.example')}
                        </label>
                        <input
                          className='input-field'
                          value={card.example}
                          onChange={(e) =>
                            updateCard(idx, 'example', e.target.value)
                          }
                          placeholder={t('editDeck.examplePh')}
                        />
                      </div>
                    </div>

                    <div className='border-border mb-[18px] grid grid-cols-2 gap-4 border-t border-dashed pt-3.5 max-[600px]:grid-cols-1'>
                      <CardImagePicker
                        label={t('editDeck.termImage')}
                        prompt={card.term || card.definition}
                        context={card.definition || undefined}
                        value={card.termImageUrl}
                        onChange={(url: string) =>
                          updateCard(idx, 'termImageUrl', url)
                        }
                      />
                      <CardImagePicker
                        label={t('editDeck.defImage')}
                        prompt={card.definition || card.term}
                        context={card.term || undefined}
                        value={card.definitionImageUrl}
                        onChange={(url: string) =>
                          updateCard(idx, 'definitionImageUrl', url)
                        }
                      />
                    </div>

                    <div className='flex gap-2'>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        onClick={() => setActiveCard(null)}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm text-danger'
                        onClick={() => deleteCard(idx)}
                      >
                        🗑 {t('common.delete')}
                      </button>
                      <button
                        type='button'
                        className='btn btn-primary btn-sm ml-auto'
                        onClick={() => {
                          saveCard(idx);
                          setActiveCard(null);
                        }}
                      >
                        {t('editDeck.saveCard')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type='button'
              className='btn btn-secondary mt-1 justify-center'
              onClick={addCard}
            >
              {t('editDeck.addAnother')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
