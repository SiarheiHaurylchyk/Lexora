import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { classroomsApi, studentsApi } from '../../services/api';
import type { ClassroomWorkspacePayload, StudentLink } from '../../services/types';
import { userCanTeach } from '../../lib/accountRole';
import { useAppSelector } from '../../store/hooks';
import { getApiErrorMessage } from '../../lib/apiError';
import { toast } from 'react-hot-toast';
import styles from '../../pages/SettingsPage.module.css';

type RowState = {
  link: StudentLink;
  ws: ClassroomWorkspacePayload | null;
  loading: boolean;
};

/**
 * Per-class recording consent (teacher ↔ student). Shown under Settings → Account.
 */
export default function ClassroomRecordingSettings() {
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
      toast.error(getApiErrorMessage(err) || t('settings.recording.loadFailed'));
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
    const next = !(row.ws.asTeacher ? row.ws.teacherRecordingConsent : row.ws.studentRecordingConsent);
    setSavingId(linkId);
    try {
      const { data } = await classroomsApi.patchRecordingConsent(linkId, { consent: Boolean(next) });
      setRows((prev) => prev.map((r) => (r.link.linkId === linkId ? { ...r, ws: data } : r)));
      toast.success(t('classroom.recordingSaved'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.recordingFailed'));
    } finally {
      setSavingId(null);
    }
  };

  const peerLabel = (u: StudentLink['user']) => u.displayName?.trim() || u.username;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('settings.recording.title')}</h2>
      <p className={styles.sectionHelp}>{t('settings.recording.help')}</p>

      {listLoading && <p className={styles.sectionHelp}>{t('common.loading')}</p>}

      {!listLoading && rows.length === 0 && (
        <p className={styles.sectionHelp}>{t('settings.recording.empty')}</p>
      )}

      {!listLoading &&
        rows.length > 0 &&
        rows.map(({ link, ws, loading }) => {
          const busy = savingId === link.linkId || loading;
          const mine = ws
            ? Boolean(ws.asTeacher ? ws.teacherRecordingConsent : ws.studentRecordingConsent)
            : false;
          const peerAgreed = ws
            ? Boolean(ws.asTeacher ? ws.studentRecordingConsent : ws.teacherRecordingConsent)
            : false;

          return (
            <div
              key={link.linkId}
              style={{
                marginBottom: 16,
                padding: 16,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{peerLabel(link.user)}</div>
              {!ws && !loading && (
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>{t('settings.recording.unavailable')}</p>
              )}
              {ws && (
                <>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: busy ? 'default' : 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={mine}
                      disabled={busy}
                      onChange={() => void toggleConsent(link.linkId, { link, ws, loading: false })}
                    />
                    <span>
                      {ws.asTeacher
                        ? t('settings.recording.checkboxTeacher')
                        : t('settings.recording.checkboxStudent')}
                    </span>
                  </label>
                  <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10, marginBottom: 10 }}>
                    {ws.asTeacher
                      ? t('settings.recording.peerStatusStudent', {
                          agreed: peerAgreed ? t('common.yes') : t('common.no'),
                        })
                      : t('settings.recording.peerStatusTeacher', {
                          agreed: peerAgreed ? t('common.yes') : t('common.no'),
                        })}
                  </p>
                  {ws.recordingAllowed && (
                    <p style={{ fontSize: 13, color: 'var(--brand-light)', marginBottom: 10 }}>
                      {t('classroom.recordingAllowed')}
                    </p>
                  )}
                  <Link to={`/class/${link.linkId}`} className="btn btn-secondary btn-sm">
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
