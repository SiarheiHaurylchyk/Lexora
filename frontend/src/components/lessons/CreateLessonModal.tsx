import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { lessonsApi, studentsApi } from '../../services/api';
import type { LessonItem, StudentLink } from '../../services/types';
import { Button, Modal, TextArea, TextInput } from '../ui';
import { getApiErrorMessage } from '../../lib/apiError';

/**
 * CreateLessonModal — quick form to create a new (empty) lesson.
 * The teacher picks an optional student and types a title and short summary.
 * After creating, the parent usually opens the lesson editor.
 */
interface Props {
  onClose: () => void;
  onCreated: (lesson: LessonItem) => void;
}

export default function CreateLessonModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [studentId, setStudentId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  // Load the teacher's student list so they can pick a target.
  useEffect(() => {
    studentsApi.getMyStudents()
      .then((res) => setStudents(res.data))
      .catch(() => { /* no-op: form still works without a student */ });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
            {t('lessons.studentLabel')}
          </span>
          <select
            className="input-field"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">{t('lessons.studentNone')}</option>
            {students.map((link) => (
              <option key={link.linkId} value={link.user.id}>
                {link.user.displayName || link.user.username} ({link.user.email})
              </option>
            ))}
          </select>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            {t('lessons.studentHint')}
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <Button kind="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? t('lessons.creating') : t('lessons.createBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
