import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button, Modal, TextArea, TextInput } from '@ui';

import { lessonsApi, studentsApi } from '@/shared/api/api-legacy';
import type { LessonItem, StudentLink } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';

interface Props {
  onClose: () => void;
  onCreated: (lesson: LessonItem) => void;
}

export function CreateLessonModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [studentId, setStudentId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    studentsApi
      .getMyStudents()
      .then((res) => setStudents(res.data))
      .catch(() => {
        /* no-op */
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { data } = await lessonsApi.createLesson({
        title: title.trim(),
        summary: summary.trim() || undefined,
        studentId: studentId === '' ? null : studentId,
      });
      onCreated(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('lessons.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={t('lessons.createTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className='flex flex-col gap-3.5'>
        <TextInput
          label={t('lessons.titleLabel')}
          required
          autoFocus
          placeholder={t('lessons.titlePh')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextArea
          label={t('lessons.summaryLabel')}
          placeholder={t('lessons.summaryPh')}
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <label className='block'>
          <span className='text-text2 mb-1.5 block text-[13px] font-medium'>
            {t('lessons.studentLabel')}
          </span>
          <select
            className='input-field'
            value={studentId}
            onChange={(e) =>
              setStudentId(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <option value=''>{t('lessons.studentNone')}</option>
            {students.map((link) => (
              <option key={link.linkId} value={link.user.id}>
                {link.user.displayName || link.user.username} ({link.user.email}
                )
              </option>
            ))}
          </select>
          <span className='text-text3 mt-1 block text-xs'>
            {t('lessons.studentHint')}
          </span>
        </label>

        <div className='mt-1.5 flex justify-end gap-2.5'>
          <Button variant='secondary' onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type='submit' disabled={loading || !title.trim()}>
            {loading ? t('lessons.creating') : t('lessons.createBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
