import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { classroomsApi } from '@/shared/api/api-legacy';
import type { ClassroomTimerPayload } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';

type Props = {
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
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ClassroomTimerPanel({ linkId, asTeacher, onClose }: Props) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<ClassroomTimerPayload | null>(null);
  const [anchor, setAnchor] = useState<{
    startedAtMs: number;
    serverNowMs: number;
    clientMs: number;
  } | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await classroomsApi.timer(linkId);
      setSnap(data);
      if (
        data.phase === 'RUNNING' &&
        data.startedAtMs != null &&
        data.serverNowMs != null
      ) {
        setAnchor({
          startedAtMs: data.startedAtMs,
          serverNowMs: data.serverNowMs,
          clientMs: Date.now(),
        });
      } else {
        setAnchor(null);
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('classroom.shell.timerLoadFailed'),
      );
    }
  }, [linkId, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    return Math.max(
      0,
      // eslint-disable-next-line react-hooks/purity
      anchor.serverNowMs - anchor.startedAtMs + (Date.now() - anchor.clientMs),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, snap?.phase, asTeacher, tick]);

  const start = async () => {
    try {
      const { data } = await classroomsApi.timerStart(linkId);
      setSnap(data);
      if (
        data.phase === 'RUNNING' &&
        data.startedAtMs != null &&
        data.serverNowMs != null
      ) {
        setAnchor({
          startedAtMs: data.startedAtMs,
          serverNowMs: data.serverNowMs,
          clientMs: Date.now(),
        });
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('classroom.shell.timerStartFailed'),
      );
    }
  };

  const stop = async () => {
    try {
      const { data } = await classroomsApi.timerStop(linkId);
      setSnap(data);
      setAnchor(null);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('classroom.shell.timerStopFailed'),
      );
    }
  };

  const reset = async () => {
    try {
      const { data } = await classroomsApi.timerReset(linkId);
      setSnap(data);
      setAnchor(null);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('classroom.shell.timerResetFailed'),
      );
    }
  };

  const phase = snap?.phase ?? 'IDLE';

  let mainDisplay: React.ReactNode;
  if (phase === 'IDLE') {
    mainDisplay = (
      <div className='text-sm text-[var(--text3)]'>
        {asTeacher
          ? t('classroom.shell.timerTeacherIdle')
          : t('classroom.shell.timerStudentIdle')}
      </div>
    );
  } else if (phase === 'RUNNING') {
    mainDisplay = asTeacher ? (
      <div className='font-mono text-4xl font-bold'>
        {formatElapsed(teacherLiveMs)}
      </div>
    ) : (
      <div className='text-sm text-[var(--text3)]'>
        {t('classroom.shell.timerStudentRunning')}
      </div>
    );
  } else {
    mainDisplay = (
      <div className='font-mono text-4xl font-bold'>
        {formatElapsed(snap?.elapsedMs ?? 0)}
      </div>
    );
  }

  return (
    <aside
      className='flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface)] p-4'
      aria-label={t('classroom.shell.timerTitle')}
    >
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-sm font-bold'>{t('classroom.shell.timerTitle')}</h2>
        <button
          type='button'
          className='rounded-lg p-1 text-[var(--text3)] hover:bg-[var(--bg2)]'
          onClick={onClose}
          aria-label={t('classroom.shell.timerPanelClose')}
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className='flex flex-1 flex-col items-center justify-center gap-4 text-center'>
        {mainDisplay}
        {!asTeacher && phase === 'STOPPED' && (
          <p className='text-sm text-[var(--text2)]'>
            {t('classroom.shell.timerStudentStoppedHint')}
          </p>
        )}
        {asTeacher && phase === 'RUNNING' && (
          <p className='text-sm text-[var(--text2)]'>
            {t('classroom.shell.timerTeacherRunningHint')}
          </p>
        )}

        {asTeacher && (
          <div className='flex flex-col gap-2'>
            {(phase === 'IDLE' || phase === 'STOPPED') && (
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={() => void start()}
              >
                {t('classroom.shell.timerStart')}
              </button>
            )}
            {phase === 'RUNNING' && (
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={() => void stop()}
              >
                {t('classroom.shell.timerStop')}
              </button>
            )}
            {(phase === 'STOPPED' || phase === 'RUNNING') && (
              <button
                type='button'
                className='btn btn-secondary btn-sm text-[var(--danger)]'
                onClick={() => void reset()}
              >
                {t('classroom.shell.timerReset')}
              </button>
            )}
          </div>
        )}

        {!asTeacher && (
          <p className='text-sm text-[var(--text2)]'>
            {t('classroom.shell.timerStudentHelp')}
          </p>
        )}
      </div>
    </aside>
  );
}
