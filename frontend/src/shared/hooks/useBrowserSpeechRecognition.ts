import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** True when the browser exposes the Web Speech API recognition constructor (Chrome/Edge). */
export function isBrowserSpeechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/** Join all final segments in order; normalize spaces. */
function buildFinalTranscript(ev: SpeechRecognitionResultEvent): string {
  const parts: string[] = [];
  for (let i = 0; i < ev.results.length; i++) {
    const r = ev.results[i];
    if (!r.isFinal) continue;
    const t = r[0]?.transcript?.trim();
    if (t) parts.push(t);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export interface UseBrowserSpeechRecognitionOptions {
  /** BCP-47 tag, e.g. en-US */
  lang: string;
  /**
   * Full transcript from every finalized slot in this capture session (not a per-event delta).
   * Avoids duplicated words when Chromium emits multiple `result` events.
   */
  onSessionFinalUpdate: (fullFinalTranscript: string) => void;
  onError?: (message: string) => void;
  /** Fired when the engine hears nothing (speak sooner/louder or check mic language). */
  onNoSpeech?: () => void;
}

/**
 * Push-to-talk style recognition: call start() then stop() or wait for silence.
 * Uses the browser’s built-in recognition (free; in Chromium often backed by a cloud service).
 */
export function useBrowserSpeechRecognition(
  opts: UseBrowserSpeechRecognitionOptions,
) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const userStoppedRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    },
    [],
  );

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    /** Don’t clear recRef here — let `onend` run so Chrome can flush the last finalized words after stop(). */
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      optsRef.current.onError?.(
        'Speech recognition is not supported in this browser.',
      );
      return;
    }
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }

    userStoppedRef.current = false;

    const rec = new Ctor();
    rec.lang = optsRef.current.lang;
    /**
     * false = one coherent utterance until you pause (fewer garbled word tails than continuous mode).
     * true = long monologue; Chrome often splits into chunks and the last chunk is wrong more often.
     */
    rec.continuous = false;
    /** Must stay false: interim hypotheses are unstable and were appended to the textarea → garbage text. */
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: SpeechRecognitionResultEvent) => {
      const full = buildFinalTranscript(ev);
      if (full) optsRef.current.onSessionFinalUpdate(full);
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === 'aborted') return;
      if (ev.error === 'no-speech') {
        if (!userStoppedRef.current) optsRef.current.onNoSpeech?.();
        setListening(false);
        recRef.current = null;
        return;
      }
      optsRef.current.onError?.(ev.message || ev.error || 'Recognition error');
      setListening(false);
      recRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      optsRef.current.onError?.(
        e instanceof Error ? e.message : 'Could not start microphone',
      );
      recRef.current = null;
      setListening(false);
    }
  }, []);

  return {
    listening,
    start,
    stop,
    supported: isBrowserSpeechRecognitionSupported(),
  };
}
