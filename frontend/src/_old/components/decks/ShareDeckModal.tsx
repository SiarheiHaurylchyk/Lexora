import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { shareApi, studentsApi } from '../../services/api';
import type { DeckShare, StudentLink } from '../../services/types';
import { Button, IconButton, Modal, Skeleton, TextInput, useConfirm } from '../ui';
import PersonRow from '../students/PersonRow';
import { getApiErrorMessage } from '../../lib/apiError';

/**
 * ShareDeckModal — popup where the deck owner can:
 *   - see who already has access to this deck
 *   - share the deck with someone new by typing their email
 *   - quickly add anyone from the teacher's "my students" list
 *   - revoke access
 */
interface Props {
  deckId: number;
  deckTitle: string;
  onClose: () => void;
}

export default function ShareDeckModal({ deckId, deckTitle, onClose }: Props) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [shares, setShares] = useState<DeckShare[]>([]);
  const [students, setStudents] = useState<StudentLink[]>([]);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load both: who has access right now, and the teacher's student list (for quick "+").
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
    return () => { cancelled = true; };
  }, [deckId, t]);

  /** Share the deck with the given email and update the list. */
  const shareWith = async (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    setAdding(true);
    try {
      const { data } = await shareApi.shareDeckByEmail(deckId, targetEmail.trim());
      setShares((prev) => [data, ...prev]);
      setEmail('');
      toast.success(t('share.added', { name: data.user.displayName || data.user.username }));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('share.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  /** Stop sharing with one user. */
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

  /** Helper: students that are not yet shared with — used for the "quick add" list. */
  const sharedEmails = new Set(shares.map((s) => s.user.email).filter(Boolean));
  const quickStudents = students.filter((s) => s.user.email && !sharedEmails.has(s.user.email));

  return (
    <Modal title={t('share.title', { title: deckTitle })} onClose={onClose}>
      {/* Form: share by email */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void shareWith(email);
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 18 }}
      >
        <div style={{ flex: 1 }}>
          <TextInput
            label={t('share.emailLabel')}
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={adding}
          />
        </div>
        <Button type="submit" disabled={adding || !email.trim()}>
          {adding ? t('share.sharing') : t('share.shareBtn')}
        </Button>
      </form>

      {/* Quick add: existing students */}
      {quickStudents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {t('share.quickAddLabel')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {quickStudents.map((link) => (
              <Button
                key={link.linkId}
                kind="secondary"
                size="sm"
                onClick={() => void shareWith(link.user.email!)}
                disabled={adding}
              >
                + {link.user.displayName || link.user.username}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Current shares */}
      <div
        style={{
          fontSize: 12,
          color: 'var(--text3)',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {t('share.currentLabel', { count: shares.length })}
      </div>

      {loading ? (
        <Skeleton height={64} />
      ) : shares.length === 0 ? (
        <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
          {t('share.empty')}
        </p>
      ) : (
        shares.map((share) => (
          <PersonRow
            key={share.shareId}
            name={share.user.displayName || share.user.username}
            email={share.user.email}
            avatarUrl={share.user.avatarUrl}
            action={
              <IconButton label={t('share.revoke')} onClick={() => void revoke(share)}>
                ✕
              </IconButton>
            }
          />
        ))
      )}
    </Modal>
  );
}
