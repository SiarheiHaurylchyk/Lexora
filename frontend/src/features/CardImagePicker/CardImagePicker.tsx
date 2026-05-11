import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  parts.push(
    'clear simple illustration, educational flashcard, centered subject, soft lighting, white background',
  );
  return parts.join(', ').slice(0, 300);
}

function buildUrl(fullPrompt: string, seed: number) {
  const encoded = encodeURIComponent(fullPrompt);
  const bust = Date.now();
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&safe=true&_=${bust}`;
}

const tileBase = tw`relative aspect-square overflow-hidden rounded-[12px] border border-border bg-bg3 flex items-center justify-center`;

export function CardImagePicker({
  value,
  label,
  prompt,
  context,
  onChange,
}: Props) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const fullPromptRef = useRef('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadWatchers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
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
      }),
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
      prev.map((x) => (x.id === id ? { ...x, state: 'ready' as const } : x)),
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
            : x,
        );
      }
      const next = prev.map((x) =>
        x.id === id ? { ...x, state: 'error' as const } : x,
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
        x.id === id
          ? { ...x, retried: false, url: null, state: 'loading' as const }
          : x,
      ),
    );
    const t = setTimeout(() => loadTile(id, true), 0);
    timers.current.push(t);
  };

  return (
    <div>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <span className='text-text3 text-xs font-semibold tracking-[0.05em] uppercase'>
          {label}
        </span>
        <div className='flex flex-wrap gap-1.5'>
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            disabled={!prompt.trim()}
            onClick={openGenerator}
            title={t('image.aiHint')}
          >
            {t('image.ai')}
          </button>
          {value && (
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={clear}
              title={t('image.remove')}
            >
              {t('image.remove')}
            </button>
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-stretch gap-3'>
        {value ? (
          <img
            src={value}
            alt={prompt}
            className='border-border h-[100px] w-[100px] rounded-[12px] border object-cover'
            referrerPolicy='no-referrer'
          />
        ) : (
          <div className='border-border bg-bg3 text-text3 flex h-[100px] w-[100px] flex-col items-center justify-center rounded-[12px] border border-dashed'>
            <div className='text-3xl'>🖼️</div>
            <div className='mt-1 text-xs'>{t('image.empty')}</div>
          </div>
        )}

        <div className='flex flex-1 flex-col gap-2'>
          <input
            className='input-field'
            placeholder={t('image.pastePh')}
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitCustomUrl();
              }
            }}
          />
          <button
            type='button'
            className='btn btn-secondary btn-sm self-start'
            onClick={submitCustomUrl}
            disabled={!customUrl.trim()}
          >
            {t('image.use')}
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className='fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-5 backdrop-blur-[6px]'
          onClick={closeModal}
        >
          <div
            className='border-border2 bg-bg2 flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] border'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='border-border flex items-start justify-between gap-3 border-b px-6 py-4'>
              <div>
                <h3 className='m-0 mb-1 text-base font-bold'>
                  {t('image.pickTitle')}
                </h3>
                <div className='text-text3 text-xs'>
                  {t('image.promptLabel')}{' '}
                  <span className='bg-bg3 text-text2 inline-block rounded-full px-2 py-0.5'>
                    {prompt}
                  </span>
                  {context &&
                    context.toLowerCase() !== prompt.toLowerCase() && (
                      <span className='bg-bg3 text-text2 ml-1 inline-block rounded-full px-2 py-0.5'>
                        {context}
                      </span>
                    )}
                </div>
                <div className='text-text3 mt-1 text-[11px]'>
                  {t('image.generatingHint')}
                </div>
              </div>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            <div className='grid grid-cols-2 gap-3 overflow-y-auto p-6'>
              {tiles.map((tile) => (
                <div key={tile.id} className={tileBase}>
                  {tile.state === 'queued' && (
                    <div className='text-text3 text-xs'>
                      {t('image.queued')}
                    </div>
                  )}
                  {tile.state === 'error' ? (
                    <div className='flex flex-col items-center gap-2 p-3 text-center'>
                      <div className='text-3xl'>⚠️</div>
                      <div className='text-text3 text-xs'>
                        {t('image.tileFailed')}
                      </div>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        onClick={() => retryTile(tile.id)}
                      >
                        {t('image.retry')}
                      </button>
                    </div>
                  ) : (
                    <>
                      {tile.state === 'loading' && (
                        <div className='text-text3 flex flex-col items-center gap-2 p-3 text-center text-xs'>
                          <div className='animate-spin-slow border-text3 border-t-brand-light h-6 w-6 rounded-full border-2' />
                          <span>{t('image.generating')}</span>
                          <span className='text-[10px] opacity-70'>
                            {t('image.slowService')}
                          </span>
                        </div>
                      )}
                      {tile.url && (
                        <img
                          key={tile.url}
                          src={tile.url}
                          alt={prompt}
                          className='absolute inset-0 h-full w-full object-cover'
                          loading='eager'
                          decoding='async'
                          referrerPolicy='no-referrer'
                          onLoad={() => handleLoad(tile.id)}
                          onError={() => handleError(tile.id)}
                          style={{ opacity: tile.state === 'ready' ? 1 : 0.01 }}
                        />
                      )}
                      {tile.state === 'ready' && tile.url && (
                        <button
                          type='button'
                          className='btn btn-primary btn-sm absolute right-2 bottom-2'
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

            <div className='border-border flex items-center justify-between gap-3 border-t px-6 py-4'>
              <div className='text-text3 text-xs'>{t('image.hint')}</div>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={regenerate}
              >
                {t('image.regenerate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
