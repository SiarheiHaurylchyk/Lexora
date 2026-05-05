import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { classroomsApi } from '../../services/api';
import type { ClassroomTimerPayload } from '../../services/types';
import { getApiErrorMessage } from '../../lib/apiError';
import styles from './ClassroomTimerPanel.module.css';

type ClassroomTimerPanelProps = {
  linkId: number;
  asTeacher: boolean;
  onClose: () => void;
};

function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ClassroomTimerPanel({ linkId, asTeacher, onClose }: ClassroomTimerPanelProps) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<ClassroomTimerPayload | null>(null);
  const [anchor, setAnchor] = useState<{ startedAtMs: number; serverNowMs: number; clientMs: number } | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await classroomsApi.timer(linkId);
      setSnap(data);
      if (data.phase === 'RUNNING' && data.startedAtMs != null && data.serverNowMs != null) {
        setAnchor({
          startedAtMs: data.startedAtMs,
          serverNowMs: data.serverNowMs,
          clientMs: Date.now(),
        });
      } else {
        setAnchor(null);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.shell.timerLoadFailed'));
    }
  }, [linkId, t]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 1600);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!(snap?.phase === 'RUNNING' && asTeacher)) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 120);
    return () => window.clearInterval(id);
  }, [snap?.phase, asTeacher]);

  const teacherLiveMs = useMemo(() => {
    if (!anchor || snap?.phase !== 'RUNNING' || !asTeacher) return 0;
    return Math.max(0, anchor.serverNowMs - anchor.startedAtMs + (Date.now() - anchor.clientMs));
  }, [anchor, snap?.phase, asTeacher, tick]);

  const start = async () => {
    try {
      const { data } = await classroomsApi.timerStart(linkId);
      setSnap(data);
      if (data.phase === 'RUNNING' && data.startedAtMs != null && data.serverNowMs != null) {
        setAnchor({
          startedAtMs: data.startedAtMs,
          serverNowMs: data.serverNowMs,
          clientMs: Date.now(),
        });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.shell.timerStartFailed'));
    }
  };

  const stop = async () => {
    try {
      const { data } = await classroomsApi.timerStop(linkId);
      setSnap(data);
      setAnchor(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.shell.timerStopFailed'));
    }
  };

  const reset = async () => {
    try {
      const { data } = await classroomsApi.timerReset(linkId);
      setSnap(data);
      setAnchor(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.shell.timerResetFailed'));
    }
  };

  const phase = snap?.phase ?? 'IDLE';

  let mainDisplay: React.ReactNode;
  if (phase === 'IDLE') {
    mainDisplay = (
      <div className={styles.displayMuted}>
        {asTeacher ? t('classroom.shell.timerTeacherIdle') : t('classroom.shell.timerStudentIdle')}
      </div>
    );
  } else if (phase === 'RUNNING') {
    if (asTeacher) {
      mainDisplay = <div className={styles.display}>{formatElapsed(teacherLiveMs)}</div>;
    } else {
      mainDisplay = <div className={styles.displayMuted}>{t('classroom.shell.timerStudentRunning')}</div>;
    }
  } else {
    const ms = snap?.elapsedMs ?? 0;
    mainDisplay = <div className={styles.display}>{formatElapsed(ms)}</div>;
  }

  return (
    <aside className={styles.panel} aria-label={t('classroom.shell.timerTitle')}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('classroom.shell.timerTitle')}</h2>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('classroom.shell.timerPanelClose')}>
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className={styles.body}>
        {mainDisplay}
        {!asTeacher && phase === 'STOPPED' && (
          <p className={styles.hint}>{t('classroom.shell.timerStudentStoppedHint')}</p>
        )}
        {asTeacher && phase === 'RUNNING' && <p className={styles.hint}>{t('classroom.shell.timerTeacherRunningHint')}</p>}

        {asTeacher && (
          <div className={styles.actions}>
            {(phase === 'IDLE' || phase === 'STOPPED') && (
              <button type="button" className={styles.btnPrimary} onClick={() => void start()}>
                {t('classroom.shell.timerStart')}
              </button>
            )}
            {phase === 'RUNNING' && (
              <button type="button" className={styles.btnPrimary} onClick={() => void stop()}>
                {t('classroom.shell.timerStop')}
              </button>
            )}
            {(phase === 'STOPPED' || phase === 'RUNNING') && (
              <button type="button" className={styles.btnDanger} onClick={() => void reset()}>
                {t('classroom.shell.timerReset')}
              </button>
            )}
          </div>
        )}

        {!asTeacher && (
          <p className={styles.hint}>{t('classroom.shell.timerStudentHelp')}</p>
        )}
      </div>
    </aside>
  );
}
