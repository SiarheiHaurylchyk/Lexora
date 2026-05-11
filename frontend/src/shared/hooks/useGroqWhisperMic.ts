import { useCallback, useEffect, useRef, useState } from 'react';

import { aiApi } from '../api/api-legacy';
import { getApiErrorMessage } from '../lib/apiError';

export type WhisperMicErrorCode =
  | 'UNSUPPORTED'
  | 'MIC_DENIED'
  | 'SHORT_AUDIO'
  | 'EMPTY_TRANSCRIPT'
  | 'TRANSCRIBE_FAILED'
  | 'RECORDER_ERROR';

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

export function useGroqWhisperMic(options: {
  onTranscript: (text: string) => void;
  onError: (code: WhisperMicErrorCode, detail?: string) => void;
}) {
  const { onTranscript, onError } = options;
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string | undefined>(undefined);
  const skipUploadRef = useRef(false);

  const cleanupStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') mr.stop();
  }, []);

  const discard = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== 'recording') return;
    skipUploadRef.current = true;
    mr.stop();
  }, []);

  const start = useCallback(async () => {
    if (recording || uploading) return;
    const mime = pickRecorderMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      onError('UNSUPPORTED');
      return;
    }
    mimeRef.current = mime;
    skipUploadRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onerror = () => {
        skipUploadRef.current = true;
        setRecording(false);
        cleanupStream();
        mediaRecorderRef.current = null;
        onError('RECORDER_ERROR');
      };
      mr.onstop = () => {
        setRecording(false);
        const mimeType = mimeRef.current || mime;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        cleanupStream();
        mediaRecorderRef.current = null;

        if (skipUploadRef.current) {
          skipUploadRef.current = false;
          return;
        }

        if (blob.size < 500) {
          onError('SHORT_AUDIO');
          return;
        }

        void (async () => {
          setUploading(true);
          try {
            const { data } = await aiApi.transcribe(blob);
            const text = data.text?.trim();
            if (text) onTranscript(text);
            else onError('EMPTY_TRANSCRIPT');
          } catch (e: unknown) {
            const detail = getApiErrorMessage(e) ?? undefined;
            onError('TRANSCRIBE_FAILED', detail);
          } finally {
            setUploading(false);
          }
        })();
      };

      mr.start();
      setRecording(true);
    } catch {
      cleanupStream();
      mediaRecorderRef.current = null;
      onError('MIC_DENIED');
    }
  }, [recording, uploading, cleanupStream, onTranscript, onError]);

  useEffect(
    () => () => {
      skipUploadRef.current = true;
      const mr = mediaRecorderRef.current;
      if (mr && mr.state === 'recording') mr.stop();
      cleanupStream();
      mediaRecorderRef.current = null;
    },
    [cleanupStream],
  );

  const supported =
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!pickRecorderMime();

  return { supported, recording, uploading, start, stop, discard };
}
