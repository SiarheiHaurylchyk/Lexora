import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CardImagePicker.module.css';

interface Props {
  value: string;
  label: string;
  prompt: string;
  context?: string;
  onChange: (url: string) => void;
}

type TileState = 'queued' | 'loading' | 'ready' | 'error';

interface Tile {
  id: number;
  seed: number;
  url: string | null;
  state: TileState;
  retried: boolean;
}

const VARIANTS = 4;
/** Pollinations often keeps the connection open 30–120+ s; browser may never fire onError. */
const LOAD_TIMEOUT_MS = 75_000;
const NEXT_TILE_GAP_MS = 900;

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

function buildPrompt(prompt: string, context?: string) {
  const base = prompt.trim();
  const ctx = context?.trim();
  const parts = [base];
  if (ctx && ctx.toLowerCase() !== base.toLowerCase()) parts.push(ctx);
  parts.push('clear simple illustration, educational flashcard, centered subject, soft lighting, white background');
  return parts.join(', ').slice(0, 300);
}

function buildUrl(fullPrompt: string, seed: number) {
  const encoded = encodeURIComponent(fullPrompt);
  const bust = Date.now();
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&safe=true&_=${bust}`;
}

export default function CardImagePicker({ value, label, prompt, context, onChange }: Props) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const fullPromptRef = useRef('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadWatchers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const completedLoadIds = useRef<Set<number>>(new Set());

  const clearLoadWatch = (id: number) => {
    const w = loadWatchers.current.get(id);
    if (w) {
      clearTimeout(w);
      loadWatchers.current.delete(id);
    }
  };

  const clearAllLoadWatches = () => {
    loadWatchers.current.forEach((w) => clearTimeout(w));
    loadWatchers.current.clear();
  };

  const scheduleLoadWatch = (id: number) => {
    clearLoadWatch(id);
    const w = setTimeout(() => {
      loadWatchers.current.delete(id);
      handleError(id);
    }, LOAD_TIMEOUT_MS);
    loadWatchers.current.set(id, w);
  };

  const clearTimers = () => {
    timers.current.forEach((x) => clearTimeout(x));
    timers.current = [];
    clearAllLoadWatches();
  };

  useEffect(() => clearTimers, []);

  const startNext = (afterId: number) => {
    const next = afterId + 1;
    if (next >= VARIANTS) return;
    const t0 = setTimeout(() => {
      loadTile(next, false);
    }, NEXT_TILE_GAP_MS);
    timers.current.push(t0);
  };

  const loadTile = (id: number, isRetry: boolean) => {
    const fp = fullPromptRef.current;
    setTiles((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const seed = isRetry ? randomSeed() : x.seed;
        return {
          ...x,
          seed,
          url: buildUrl(fp, seed),
          state: 'loading' as const,
          retried: isRetry ? true : x.retried,
        };
      })
    );
    scheduleLoadWatch(id);
  };

  const startGeneration = () => {
    clearTimers();
    completedLoadIds.current.clear();
    const fullPrompt = buildPrompt(prompt, context);
    fullPromptRef.current = fullPrompt;
    const fresh: Tile[] = Array.from({ length: VARIANTS }, (_, i) => ({
      id: i,
      seed: randomSeed(),
      url: null,
      state: 'queued',
      retried: false,
    }));
    setTiles(fresh);
    const t0 = setTimeout(() => loadTile(0, false), 0);
    timers.current.push(t0);
  };

  const openGenerator = () => {
    if (!prompt.trim()) return;
    setShowModal(true);
    startGeneration();
  };

  const regenerate = () => startGeneration();

  const closeModal = () => {
    clearTimers();
    completedLoadIds.current.clear();
    setShowModal(false);
  };

  const pick = (url: string) => {
    onChange(url);
    closeModal();
  };

  const clear = () => onChange('');

  const submitCustomUrl = () => {
    if (!customUrl.trim()) return;
    onChange(customUrl.trim());
    setCustomUrl('');
  };

  const handleLoad = (id: number) => {
    if (completedLoadIds.current.has(id)) return;
    completedLoadIds.current.add(id);
    clearLoadWatch(id);
    setTiles((prev) =>
      prev.map((x) => (x.id === id ? { ...x, state: 'ready' as const } : x))
    );
    startNext(id);
  };

  const handleError = (id: number) => {
    clearLoadWatch(id);
    setTiles((prev) => {
      const tile = prev.find((x) => x.id === id);
      if (!tile) return prev;
      if (!tile.retried) {
        const t1 = setTimeout(() => loadTile(id, true), 800);
        timers.current.push(t1);
        return prev.map((x) =>
          x.id === id
            ? { ...x, url: null, state: 'loading' as const, retried: true }
            : x
        );
      }
      const next = prev.map((x) =>
        x.id === id ? { ...x, state: 'error' as const } : x
      );
      const t2 = setTimeout(() => startNext(id), 0);
      timers.current.push(t2);
      return next;
    });
  };

  const retryTile = (id: number) => {
    completedLoadIds.current.delete(id);
    setTiles((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, retried: false, url: null, state: 'loading' as const } : x
      )
    );
    const t = setTimeout(() => loadTile(id, true), 0);
    timers.current.push(t);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <div className={styles.headActions}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!prompt.trim()}
            onClick={openGenerator}
            title={t('image.aiHint')}
          >
            {t('image.ai')}
          </button>
          {value && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clear}
              title={t('image.remove')}
            >
              {t('image.remove')}
            </button>
          )}
        </div>
      </div>

      <div className={styles.previewRow}>
        {value ? (
          <img src={value} alt={prompt} className={styles.preview} referrerPolicy="no-referrer" />
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>🖼️</div>
            <div className={styles.placeholderText}>{t('image.empty')}</div>
          </div>
        )}

        <div className={styles.urlBox}>
          <input
            className={`input-field ${styles.urlInput}`}
            placeholder={t('image.pastePh')}
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCustomUrl(); } }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={submitCustomUrl}
            disabled={!customUrl.trim()}
          >
            {t('image.use')}
          </button>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <h3 className={styles.modalTitle}>{t('image.pickTitle')}</h3>
                <div className={styles.modalSub}>
                  {t('image.promptLabel')} <span className={styles.promptChip}>{prompt}</span>
                  {context && context.toLowerCase() !== prompt.toLowerCase() && (
                    <span className={styles.promptChip}>{context}</span>
                  )}
                </div>
                <div className={styles.modalHintInline}>{t('image.generatingHint')}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            <div className={styles.grid}>
              {tiles.map((tile) => (
                <div key={tile.id} className={styles.tile}>
                  {tile.state === 'queued' && (
                    <div className={styles.tileQueued}>
                      <span>{t('image.queued')}</span>
                    </div>
                  )}
                  {tile.state === 'error' ? (
                    <div className={styles.tileError}>
                      <div className={styles.tileErrorIcon}>⚠️</div>
                      <div className={styles.tileErrorText}>{t('image.tileFailed')}</div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => retryTile(tile.id)}
                      >
                        {t('image.retry')}
                      </button>
                    </div>
                  ) : (
                    <>
                      {tile.state === 'loading' && (
                        <div className={styles.tileLoader}>
                          <div className={styles.spinner} />
                          <span>{t('image.generating')}</span>
                          <span className={styles.tileLoaderHint}>{t('image.slowService')}</span>
                        </div>
                      )}
                      {tile.url && (
                        <img
                          key={tile.url}
                          src={tile.url}
                          alt={prompt}
                          className={styles.tileImg}
                          loading="eager"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onLoad={() => handleLoad(tile.id)}
                          onError={() => handleError(tile.id)}
                          style={{
                            opacity: tile.state === 'ready' ? 1 : 0.01,
                          }}
                        />
                      )}
                      {tile.state === 'ready' && tile.url && (
                        <button
                          type="button"
                          className={styles.pickBtn}
                          onClick={() => pick(tile.url as string)}
                        >
                          {t('image.pickThis')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.modalFoot}>
              <div className={styles.modalHint}>{t('image.hint')}</div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={regenerate}>
                {t('image.regenerate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
