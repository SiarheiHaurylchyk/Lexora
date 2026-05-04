import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { classroomWhiteboardWebSocketUrl } from '../../lib/classroomWhiteboardWs';
import {
  DEFAULT_LESSON_BOARD_STATE,
  cloneLessonBoardState,
  decodeLessonBoardWire,
  encodeLessonBoardWire,
  parseLessonBoardStored,
  type LessonBoardState,
} from '../../lib/lessonBoardModel';
import LessonBoard from './LessonBoard';
import styles from './ClassroomWhiteboardOverlay.module.css';

export type ClassroomWhiteboardOverlayProps = {
  open: boolean;
  linkId: number;
  onClose: () => void;
};

function storageKey(linkId: number) {
  return `lexora:classroom-lesson-board:v2:${linkId}`;
}

function loadBoardFromStorage(linkId: number): LessonBoardState {
  const raw = localStorage.getItem(storageKey(linkId));
  if (!raw) return cloneLessonBoardState(DEFAULT_LESSON_BOARD_STATE);
  const parsed = parseLessonBoardStored(raw);
  return parsed ? cloneLessonBoardState(parsed) : cloneLessonBoardState(DEFAULT_LESSON_BOARD_STATE);
}

export default function ClassroomWhiteboardOverlay({ open, linkId, onClose }: ClassroomWhiteboardOverlayProps) {
  const { t } = useTranslation();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const wsSendTimerRef = useRef<number | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'offline'>('offline');

  const [board, setBoard] = useState<LessonBoardState>(() => loadBoardFromStorage(linkId));
  const boardRef = useRef(board);
  boardRef.current = board;

  useEffect(() => {
    if (open) {
      setBoard(loadBoardFromStorage(linkId));
    }
  }, [open, linkId]);

  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimerRef.current);
      window.clearTimeout(wsSendTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const applyRemoteBoard = useCallback((next: LessonBoardState) => {
    setBoard(cloneLessonBoardState(next));
    try {
      localStorage.setItem(storageKey(linkId), encodeLessonBoardWire(next));
    } catch {
      /* quota */
    }
  }, [linkId]);

  useEffect(() => {
    if (!open || !accessToken) {
      setSyncStatus('offline');
      return undefined;
    }

    let cancelled = false;
    const url = classroomWhiteboardWebSocketUrl(linkId, accessToken);
    setSyncStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      setSyncStatus('live');
      try {
        ws.send(encodeLessonBoardWire(boardRef.current));
      } catch {
        /* ignore */
      }
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      const raw = typeof ev.data === 'string' ? ev.data : '';
      const next = raw ? decodeLessonBoardWire(raw) : null;
      if (!next) return;
      applyRemoteBoard(next);
    };

    ws.onerror = () => {
      if (!cancelled) setSyncStatus('offline');
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      if (!cancelled) setSyncStatus('offline');
    };

    return () => {
      cancelled = true;
      const w = wsRef.current;
      wsRef.current = null;
      if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
        w.close();
      }
    };
  }, [open, linkId, accessToken, applyRemoteBoard]);

  const flushWsSend = useCallback((snapshot: LessonBoardState) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(encodeLessonBoardWire(snapshot));
    } catch {
      /* ignore */
    }
  }, []);

  const schedulePersist = useCallback(
    (snapshot: LessonBoardState) => {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem(storageKey(linkId), encodeLessonBoardWire(snapshot));
        } catch {
          /* quota */
        }
      }, 400);

      window.clearTimeout(wsSendTimerRef.current);
      wsSendTimerRef.current = window.setTimeout(() => {
        flushWsSend(snapshot);
      }, 140);
    },
    [linkId, flushWsSend],
  );

  const onBoardChange: React.Dispatch<React.SetStateAction<LessonBoardState>> = useCallback(
    (action) => {
      setBoard((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const syncLabel = useMemo(() => {
    if (syncStatus === 'live') return t('classroom.whiteboard.syncLive');
    if (syncStatus === 'connecting') return t('classroom.whiteboard.syncConnecting');
    return t('classroom.whiteboard.syncOffline');
  }, [syncStatus, t]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={t('classroom.whiteboard.title')}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('classroom.whiteboard.title')}</h2>
        <p className={styles.hint}>{t('classroom.whiteboard.hint')}</p>
        <p className={styles.legalLine}>{t('classroom.whiteboard.legalNotice')}</p>
        <p className={styles.syncLine} aria-live="polite">
          {syncLabel}
        </p>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('classroom.whiteboard.close')}>
          <X size={22} strokeWidth={2.25} aria-hidden />
        </button>
      </header>
      <div className={styles.canvasWrap}>
        <div className={styles.boardHost}>
          <LessonBoard state={board} onChange={onBoardChange} />
        </div>
      </div>
    </div>
  );
}
