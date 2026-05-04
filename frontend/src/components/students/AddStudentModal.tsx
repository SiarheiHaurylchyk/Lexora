import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button, Modal, TextInput } from '../ui';
import { studentsApi } from '../../services/api';
import type { StudentLink } from '../../services/types';
import { getApiErrorMessage } from '../../lib/apiError';

/**
 * AddStudentModal — small popup where the teacher types a student's email and
 * invites them. The student must already be registered. On success we call
 * `onAdded` so the parent page can update its list.
 */
interface Props {
  onClose: () => void;
  onAdded: (link: StudentLink) => void;
}

export default function AddStudentModal({ onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await studentsApi.addStudent(email.trim());
      toast.success(t('students.addedToast', { name: data.user.displayName || data.user.username }));
      onAdded(data);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('students.addFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={t('students.addTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.5 }}>
          {t('students.addHelp')}
        </p>
        <TextInput
          label={t('students.emailLabel')}
          type="email"
          required
          autoFocus
          placeholder="student@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button kind="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" kind="primary" disabled={loading || !email.trim()}>
            {loading ? t('students.adding') : t('students.addBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
