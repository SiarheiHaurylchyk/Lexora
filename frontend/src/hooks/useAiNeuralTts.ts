import { useCallback, useEffect, useRef } from 'react';
import { aiApi } from '../services/api';
import {
  detectTextLanguage,
  hasSignificantRuEnLetterMix,
  type DetectedLang,
} from '../lib/detectTextLanguage';
import { splitMixedRuEn } from './useSpeech';

/**
 * AI tutor voice playback.
 *
 * Routes each reply to the best available engine based on what the reply
 * **actually** says, not what the learner is profiled to study.
 *
 * Routing:
 *  1) Neural TTS disabled → browser SpeechSynthesis.
 *  2) Server xAI TTS (XAI_API_KEY) → multilingual; mixed Russian + English may be
 *     split into script runs and synthesized sequentially.
 *  3) Server Groq Orpheus only → EN / AR neural; other languages → browser TTS.
 *  4) Errors → browser fallback.
 */
export function useAiNeuralTts(
  neuralEnabled: boolean,
  serverXaiTts: boolean,
  serverGroqTts: boolean,
  browserSpeak: (text: string, lang: string) => void,
  browserSpeakMixedRuEn?: (text: string) => void,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortSequentialRef = useRef(false);

  const stop = useCallback(() => {
    abortSequentialRef.current = true;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = '';
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const speak = useCallback(
    async (text: string, hintLang: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      stop();
      abortSequentialRef.current = false;

      const info = detectTextLanguage(trimmed, { hint: hintLang, fallback: 'en' });
      const primary: DetectedLang = info.primary;
      const secondary = info.secondary;
      const mixed = info.mixed;

      if (!neuralEnabled) {
        logTtsRoute({
          engine: 'browser-speech',
          reason: 'no_neural_backend',
          hint:
            'API /ai/status returned no neural TTS (xaiTts, groqTts both false). Russian uses OS/browser voices here.',
          primary,
          secondary,
          mixed,
        });
        if (mixed && isRuEnPair(primary, secondary) && browserSpeakMixedRuEn) {
          browserSpeakMixedRuEn(trimmed);
        } else {
          browserSpeak(trimmed, primary);
        }
        return;
      }

      const groqEnglishOnly = serverGroqTts && !serverXaiTts;
      if (groqEnglishOnly) {
        if (primary === 'ar' && !mixed) {
          await tryServerTts(trimmed, 'ar');
          return;
        }
        if (primary === 'en' && !mixed) {
          await tryServerTts(trimmed, 'en');
          return;
        }
        if (isRuEnPair(primary, secondary) && browserSpeakMixedRuEn) {
          logTtsRoute({
            engine: 'browser-speech',
            reason: 'groq_orpheus_mixed_ru_en',
            primary,
            secondary,
          });
          browserSpeakMixedRuEn(trimmed);
          return;
        }
        logTtsRoute({
          engine: 'browser-speech',
          reason: 'groq_orpheus_monolingual_only',
          hint:
            'Groq Orpheus has EN + AR models only; Russian (and other langs) fall back to SpeechSynthesis. Set XAI_API_KEY for neural Russian.',
          primary,
          secondary,
          mixed,
        });
        browserSpeak(trimmed, primary);
        return;
      }

      const multilingualServer = serverXaiTts;
      const ruEnForSegmentation =
        mixed && isRuEnPair(primary, secondary) ? true : hasSignificantRuEnLetterMix(trimmed);
      const ruEnPieces = multilingualServer && ruEnForSegmentation ? splitMixedRuEn(trimmed) : [];
      const segmentedRuEn = ruEnPieces.length > 1;

      if (segmentedRuEn) {
        const pieces = ruEnPieces;
        try {
          logTtsRoute({
            engine: 'server-neural',
            reason: 'server_segmented_ru_en',
            segments: pieces.length,
          });
          for (const { text: chunk, lang } of pieces) {
            if (abortSequentialRef.current) return;
            const c = chunk.trim();
            if (!c) continue;
            await playOneServerWav(c, lang);
          }
        } catch {
          logTtsRoute({
            engine: 'browser-speech',
            reason: 'server_segmented_ru_en_failed',
            hint: 'One or more /api/ai/speech chunks failed — browser fallback for whole reply.',
          });
          if (browserSpeakMixedRuEn) browserSpeakMixedRuEn(trimmed);
          else browserSpeak(trimmed, primary);
        }
        return;
      }

      await tryServerTts(trimmed, primary, secondary, mixed);

      async function playOneServerWav(text2: string, lang2: string): Promise<void> {
        const res = await aiApi.speech({ text: text2, lang: lang2 });
        if (abortSequentialRef.current) return;
        const blob = new Blob([res.data], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            resolve();
          };
          audio.onerror = () => reject(new Error('audio playback error'));
          void audio.play().catch(reject);
        });
      }

      async function tryServerTts(
        text2: string,
        lang2: string,
        secondary2: DetectedLang | null = null,
        mixed2 = false,
      ) {
        try {
          const payload: { text: string; lang: string; secondaryLang?: string; mixed?: boolean } = {
            text: text2,
            lang: lang2,
          };
          if (secondary2) payload.secondaryLang = secondary2;
          if (mixed2) payload.mixed = true;
          const res = await aiApi.speech(payload);
          logTtsRoute({
            engine: 'server-neural',
            reason: serverGroqTts && !serverXaiTts ? 'groq_orpheus' : 'xai_tts',
            lang: lang2,
            mixed: mixed2,
          });
          const blob = new Blob([res.data], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => stop();
          await audio.play();
        } catch {
          logTtsRoute({
            engine: 'browser-speech',
            reason: 'server_speech_failed',
            hint: 'Network error or non-200 from POST /api/ai/speech — falling back to SpeechSynthesis.',
            lang: lang2,
          });
          if (mixed2 && isRuEnPair(lang2 as DetectedLang, secondary2) && browserSpeakMixedRuEn) {
            browserSpeakMixedRuEn(text2);
          } else {
            browserSpeak(text2, lang2);
          }
        }
      }
    },
    [neuralEnabled, serverXaiTts, serverGroqTts, browserSpeak, browserSpeakMixedRuEn, stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop };
}

function isRuEnPair(a: DetectedLang | null | undefined, b: DetectedLang | null | undefined): boolean {
  if (!a || !b) return false;
  return (a === 'ru' && b === 'en') || (a === 'en' && b === 'ru');
}

function logTtsRoute(payload: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.info('[Lexora TTS]', payload);
  }
}
