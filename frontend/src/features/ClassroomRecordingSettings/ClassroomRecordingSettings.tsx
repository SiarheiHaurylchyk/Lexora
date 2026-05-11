import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { classroomsApi, studentsApi } from '@/shared/api/api-legacy';
import type {
  ClassroomWorkspacePayload,
  StudentLink,
} from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAppSelector } from '@/shared/lib/storeHooks';

interface RowState {
  link: StudentLink;
  ws: ClassroomWorkspacePayload | null;
  loading: boolean;
}

const sectionClasses = tw`mb-5 rounded-[20px] border border-border bg-surface p-6`;
const sectionTitleClasses = tw`mb-1.5 font-display text-xl`;
const sectionHelpClasses = tw`mb-4 text-sm text-text2`;

/**
 * Per-class recording consent (teacher ↔ student). Shown under Settings → Account.
 */
export function ClassroomRecordingSettings() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(user?.role);
  const [rows, setRows] = useState<RowState[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const { data: links } = canTeach
        ? await studentsApi.getMyStudents()
        : await studentsApi.getMyTeachers();
      const safe = Array.isArray(links) ? links : [];
      setRows(safe.map((link) => ({ link, ws: null, loading: true })));
      const workspaces = await Promise.all(
        safe.map((link) =>
          classroomsApi.workspace(link.linkId).then(
            (r) => r.data,
            () => null,
          ),
        ),
      );
      setRows(
        safe.map((link, i) => ({
          link,
          ws: workspaces[i],
          loading: false,
        })),
      );
    } catch (err) {
      toast.error(
        getApiErrorMessage(err) || t('settings.recording.loadFailed'),
      );
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [canTeach, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleConsent = async (linkId: number, row: RowState) => {
    if (!row.ws) return;
    const next = !(row.ws.asTeacher
      ? row.ws.teacherRecordingConsent
      : row.ws.studentRecordingConsent);
    setSavingId(linkId);
    try {
      const { data } = await classroomsApi.patchRecordingConsent(linkId, {
        consent: Boolean(next),
      });
      setRows((prev) =>
        prev.map((r) => (r.link.linkId === linkId ? { ...r, ws: data } : r)),
      );
      toast.success(t('classroom.recordingSaved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.recordingFailed'));
    } finally {
      setSavingId(null);
    }
  };

  const peerLabel = (u: StudentLink['user']) =>
    u.displayName?.trim() || u.username;

  return (
    <section className={sectionClasses}>
      <h2 className={sectionTitleClasses}>{t('settings.recording.title')}</h2>
      <p className={sectionHelpClasses}>{t('settings.recording.help')}</p>

      {listLoading && (
        <p className={sectionHelpClasses}>{t('common.loading')}</p>
      )}

      {!listLoading && rows.length === 0 && (
        <p className={sectionHelpClasses}>{t('settings.recording.empty')}</p>
      )}

      {!listLoading &&
        rows.length > 0 &&
        rows.map(({ link, ws, loading }) => {
          const busy = savingId === link.linkId || loading;
          const mine = ws
            ? Boolean(
                ws.asTeacher
                  ? ws.teacherRecordingConsent
                  : ws.studentRecordingConsent,
              )
            : false;
          const peerAgreed = ws
            ? Boolean(
                ws.asTeacher
                  ? ws.studentRecordingConsent
                  : ws.teacherRecordingConsent,
              )
            : false;

          return (
            <div
              key={link.linkId}
              className='border-border bg-surface mb-4 rounded-[12px] border p-4'
            >
              <div className='mb-2 font-bold'>{peerLabel(link.user)}</div>
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
                      onChange={() =>
                        void toggleConsent(link.linkId, {
                          link,
                          ws,
                          loading: false,
                        })
                      }
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
        })}
    </section>
  );
}
