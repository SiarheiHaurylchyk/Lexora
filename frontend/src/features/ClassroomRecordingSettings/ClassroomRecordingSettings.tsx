import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { RecordingConsentRow } from './RecordingConsentRow';

import type { StudentLink } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useApiQuery } from '@/shared/lib/query';
import { useAuthStore } from '@/shared/lib/storeHooks';

const sectionClasses = tw`mb-5 rounded-[20px] border border-border bg-surface p-6`;
const sectionTitleClasses = tw`mb-1.5 font-display text-xl`;
const sectionHelpClasses = tw`mb-4 text-sm text-text2`;

/**
 * Per-class recording consent (teacher ↔ student). Shown under Settings → Account.
 */
export function ClassroomRecordingSettings() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canTeach = userCanTeach(user?.role);

  const linksQuery = useApiQuery<StudentLink[]>({
    queryKey: ['students', canTeach ? 'my-students' : 'my-teachers'],
    url: canTeach ? '/students/my-students' : '/students/my-teachers',
  });
  const rows = linksQuery.data ?? [];
  const listLoading = linksQuery.isLoading;

  useEffect(() => {
    if (linksQuery.isError)
      toast.error(
        getApiErrorMessage(linksQuery.error) ||
          t('settings.recording.loadFailed'),
      );
  }, [linksQuery.isError, linksQuery.error, t]);

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
        rows.map((link) => (
          <RecordingConsentRow key={link.linkId} link={link} />
        ))}
    </section>
  );
}
