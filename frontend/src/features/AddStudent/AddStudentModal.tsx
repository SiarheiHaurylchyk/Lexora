import { type FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button, Modal, TextInput } from '@ui';

import { studentsApi } from '@/shared/api/api-legacy';
import type { StudentLink } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';

interface Props {
  onClose: () => void;
  onAdded: (link: StudentLink) => void;
}

export function AddStudentModal({ onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await studentsApi.addStudent(email.trim());
      toast.success(
        t('students.addedToast', {
          name: data.user.displayName || data.user.username,
        }),
      );
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
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <p className='text-text2 text-sm leading-[1.5]'>
          {t('students.addHelp')}
        </p>
        <TextInput
          label={t('students.emailLabel')}
          type='email'
          required
          autoFocus
          placeholder='student@example.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <div className='mt-1.5 flex justify-end gap-2.5'>
          <Button variant='secondary' onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            type='submit'
            variant='primary'
            disabled={loading || !email.trim()}
          >
            {loading ? t('students.adding') : t('students.addBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
