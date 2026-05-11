import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { classroomsApi } from '@/shared/api/api-legacy';
import type {
  ClassroomWorkspacePayload,
  StudentLink,
} from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useApiQuery } from '@/shared/lib/query';

interface Props {
  link: StudentLink;
}

export function RecordingConsentRow({ link }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const workspaceKey = ['classrooms', 'workspace', link.linkId] as const;

  const wsQuery = useApiQuery<ClassroomWorkspacePayload>({
    queryKey: workspaceKey,
    url: `/me/classrooms/${link.linkId}`,
  });
  const ws = wsQuery.data;
  const loading = wsQuery.isLoading;
  const busy = saving || loading;

  const peerLabel = link.user.displayName?.trim() || link.user.username;

  const toggleConsent = async () => {
    if (!ws) return;
    const next = !(ws.asTeacher
      ? ws.teacherRecordingConsent
      : ws.studentRecordingConsent);
    setSaving(true);
    try {
      await classroomsApi.patchRecordingConsent(link.linkId, {
        consent: Boolean(next),
      });
      toast.success(t('classroom.recordingSaved'));
      void queryClient.invalidateQueries({ queryKey: workspaceKey });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.recordingFailed'));
    } finally {
      setSaving(false);
    }
  };

  const mine = ws
    ? Boolean(
        ws.asTeacher ? ws.teacherRecordingConsent : ws.studentRecordingConsent,
      )
    : false;
  const peerAgreed = ws
    ? Boolean(
        ws.asTeacher ? ws.studentRecordingConsent : ws.teacherRecordingConsent,
      )
    : false;

  return (
    <div className='border-border bg-surface mb-4 rounded-[12px] border p-4'>
      <div className='mb-2 font-bold'>{peerLabel}</div>
      {!ws && !loading && (
        <p className='text-text3 m-0 text-[13px]'>
          {t('settings.recording.unavailable')}
        </p>
      )}
      {ws && (
        <>
          <label
            className={cn(
              'flex items-start gap-2.5 text-sm',
              busy ? 'cursor-default' : 'cursor-pointer',
            )}
          >
            <input
              type='checkbox'
              checked={mine}
              disabled={busy}
              className='accent-brand-light'
              onChange={() => void toggleConsent()}
            />
            <span>
              {ws.asTeacher
                ? t('settings.recording.checkboxTeacher')
                : t('settings.recording.checkboxStudent')}
            </span>
          </label>
          <p className='text-text3 my-2.5 text-[13px]'>
            {ws.asTeacher
              ? t('settings.recording.peerStatusStudent', {
                  agreed: peerAgreed ? t('common.yes') : t('common.no'),
                })
              : t('settings.recording.peerStatusTeacher', {
                  agreed: peerAgreed ? t('common.yes') : t('common.no'),
                })}
          </p>
          {ws.recordingAllowed && (
            <p className='text-brand-light mb-2.5 text-[13px]'>
              {t('classroom.recordingAllowed')}
            </p>
          )}
          <Link
            to={`/class/${link.linkId}`}
            className='btn btn-secondary btn-sm'
          >
            {t('settings.recording.openClass')}
          </Link>
        </>
      )}
    </div>
  );
}
