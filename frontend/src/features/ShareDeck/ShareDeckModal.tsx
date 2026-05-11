import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, Modal, Skeleton, TextInput } from '@ui';

import { PersonRow } from '@/entities/User';

import { shareApi, studentsApi } from '@/shared/api/api-legacy';
import type { DeckShare, StudentLink } from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useConfirm } from '@/shared/lib/confirm';

interface Props {
  deckId: number;
  deckTitle: string;
  onClose: () => void;
}

export function ShareDeckModal({ deckId, deckTitle, onClose }: Props) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [shares, setShares] = useState<DeckShare[]>([]);
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sharesRes, studentsRes] = await Promise.all([
          shareApi.listDeckShares(deckId),
          studentsApi.getMyStudents(),
        ]);
        if (cancelled) return;
        setShares(sharesRes.data);
        setStudents(studentsRes.data);
      } catch {
        if (!cancelled) toast.error(t('share.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, t]);

  const shareWith = async (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    setAdding(true);
    try {
      const { data } = await shareApi.shareDeckByEmail(
        deckId,
        targetEmail.trim(),
      );
      setShares((prev) => [data, ...prev]);
      setEmail('');
      toast.success(
        t('share.added', { name: data.user.displayName || data.user.username }),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('share.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  const revoke = async (share: DeckShare) => {
    const name = share.user.displayName || share.user.username;
    const ok = await confirm({
      message: t('share.revokeConfirm', { name }),
      variant: 'danger',
      confirmText: t('share.revoke'),
    });
    if (!ok) return;
    try {
      await shareApi.removeDeckShare(deckId, share.shareId);
      setShares((prev) => prev.filter((x) => x.shareId !== share.shareId));
      toast.success(t('share.revoked'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('share.revokeFailed'));
    }
  };

  const sharedEmails = new Set(shares.map((s) => s.user.email).filter(Boolean));
  const quickStudents = students.filter(
    (s) => s.user.email && !sharedEmails.has(s.user.email),
  );

  const sectionLabelClasses = tw`mb-2 text-xs font-semibold uppercase text-text3`;

  return (
    <Modal title={t('share.title', { title: deckTitle })} onClose={onClose}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void shareWith(email);
        }}
        className='mb-5 flex items-end gap-2'
      >
        <div className='flex-1'>
          <TextInput
            label={t('share.emailLabel')}
            type='email'
            placeholder='student@example.com'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={adding}
          />
        </div>
        <Button type='submit' disabled={adding || !email.trim()}>
          {adding ? t('share.sharing') : t('share.shareBtn')}
        </Button>
      </form>

      {quickStudents.length > 0 && (
        <div className='mb-5'>
          <div className={sectionLabelClasses}>{t('share.quickAddLabel')}</div>
          <div className='flex flex-wrap gap-2'>
            {quickStudents.map((link) => (
              <Button
                key={link.linkId}
                variant='secondary'
                size='sm'
                onClick={() => void shareWith(link.user.email!)}
                disabled={adding}
              >
                + {link.user.displayName || link.user.username}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className={sectionLabelClasses}>
        {t('share.currentLabel', { count: shares.length })}
      </div>

      {loading ? (
        <Skeleton height={64} />
      ) : shares.length === 0 ? (
        <p className='text-text3 px-0 py-5 text-center'>{t('share.empty')}</p>
      ) : (
        shares.map((share) => (
          <PersonRow
            key={share.shareId}
            name={share.user.displayName || share.user.username}
            email={share.user.email}
            avatarUrl={share.user.avatarUrl}
            action={
              <IconButton
                label={t('share.revoke')}
                onClick={() => void revoke(share)}
              >
                ✕
              </IconButton>
            }
          />
        ))
      )}
    </Modal>
  );
}
