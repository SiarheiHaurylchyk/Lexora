import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Paperclip, Smile } from 'lucide-react';
import { Button } from '../components/ui';
import IconButton from '../components/ui/IconButton';
import Avatar from '../components/ui/Avatar';
import { chatApi } from '../services/api';
import type { ChatMessage, UserSummary } from '../services/types';
import { getApiErrorMessage } from '../lib/apiError';
import { classNames } from '../lib/classNames';
import { useAppSelector } from '../store/hooks';
import { useAuthenticatedBlobUrl } from '../hooks/useAuthenticatedBlobUrl';
import styles from './ChatPage.module.css';

const POLL_MS = 5000;

const QUICK_EMOJIS = ['😀', '😊', '🙂', '😉', '😍', '🤝', '👍', '🙏', '❤️', '🔥', '✨', '📚', '✅', '❓', '🎉', '👋'];

interface PendingAttachment {
  url: string;
  mime: string;
  previewLocal: string;
}

function MessageBubble({
  m,
  mine,
  timeLabel,
}: {
  m: ChatMessage;
  mine: boolean;
  timeLabel: string;
}) {
  const { t } = useTranslation();
  const blobUrl = useAuthenticatedBlobUrl(m.attachmentUrl || null);
  const isImg = Boolean(m.attachmentMime?.startsWith('image/'));
  const fileLabel =
    m.attachmentMime?.includes('pdf') ? t('chat.openPdf') : t('chat.openFile');

  return (
    <div className={classNames(styles.bubbleRow, mine && styles.bubbleRowMine)}>
      <div className={styles.bubbleStack}>
        <div className={classNames(styles.bubble, mine ? styles.bubbleMine : styles.bubblePeer)}>
          {m.body?.trim() ? m.body : null}
          {isImg && m.attachmentUrl && blobUrl && (
            <img src={blobUrl} alt="" className={styles.attachImg} />
          )}
          {isImg && m.attachmentUrl && !blobUrl && (
            <div className="skeleton" style={{ height: 140, borderRadius: 12, marginTop: 10 }} />
          )}
          {!isImg && m.attachmentUrl && blobUrl && (
            <a className={styles.attachLink} href={blobUrl} target="_blank" rel="noreferrer">
              <Paperclip size={15} strokeWidth={2.25} className={styles.attachGlyph} aria-hidden />
              {fileLabel}
            </a>
          )}
        </div>
        <div className={styles.meta}>{timeLabel}</div>
      </div>
    </div>
  );
}

/**
 * DM thread — works inside /messages/:peerId (split hub) or standalone /chat/:peerId.
 */
export default function ChatPage() {
  const { t, i18n } = useTranslation();
  const { peerId: peerIdParam } = useParams<{ peerId: string }>();
  const navigate = useNavigate();
  const inHub = Boolean(useMatch('/messages/:peerId'));
  const myId = useAppSelector((s) => s.auth.user?.id);

  const peerId = Number(peerIdParam);
  const [peer, setPeer] = useState<UserSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThread = useCallback(
    async (fromPoll = false) => {
      if (!Number.isFinite(peerId)) {
        if (!fromPoll) {
          setLoading(false);
          toast.error(t('chat.loadFailed'));
          navigate('/messages', { replace: true });
        }
        return;
      }
      try {
        const { data } = await chatApi.loadThread(peerId);
        setPeer(data.peer);
        setMessages(data.messages ?? []);
        void chatApi.markRead(peerId).catch(() => {});
      } catch (err) {
        if (!fromPoll) {
          const msg = getApiErrorMessage(err);
          toast.error(msg || t('chat.loadFailed'));
          if (inHub) navigate('/messages');
          else navigate(-1);
        }
      } finally {
        if (!fromPoll) setLoading(false);
      }
    },
    [peerId, navigate, t, inHub],
  );

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!Number.isFinite(peerId) || loading) return undefined;
    const id = window.setInterval(() => {
      void loadThread(true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [peerId, loading, loadThread]);

  useEffect(() => {
    return () => {
      if (pending?.previewLocal) URL.revokeObjectURL(pending.previewLocal);
    };
  }, [pending]);

  const send = async () => {
    const text = draft.trim();
    const hasAtt = Boolean(pending);
    if ((!text && !hasAtt) || !Number.isFinite(peerId)) return;
    setSending(true);
    try {
      const payload: { body?: string; attachmentUrl?: string; attachmentMime?: string } = {};
      if (text) payload.body = text;
      if (pending) {
        payload.attachmentUrl = pending.url;
        payload.attachmentMime = pending.mime;
      }
      const { data } = await chatApi.sendMessage(peerId, payload);
      setDraft('');
      if (pending?.previewLocal) URL.revokeObjectURL(pending.previewLocal);
      setPending(null);
      setMessages((prev) => [...prev, data]);
      void chatApi.markRead(peerId).catch(() => {});
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('chat.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { data } = await chatApi.uploadAttachment(f);
      const previewLocal = URL.createObjectURL(f);
      setPending((prev) => {
        if (prev?.previewLocal) URL.revokeObjectURL(prev.previewLocal);
        return { url: data.url, mime: data.mime, previewLocal };
      });
      toast.success(t('chat.attachmentReady'));
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('chat.uploadFailed'));
    }
  };

  const timeFmt = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));

  if (!Number.isFinite(peerId)) {
    return null;
  }

  const peerName = peer?.displayName || peer?.username || (loading ? '…' : `#${peerId}`);

  return (
    <div
      className={classNames(
        styles.root,
        inHub ? styles.rootInHub : styles.rootStandalone,
      )}
    >
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className={styles.hiddenInput} onChange={(e) => void onPickFile(e)} />

      <header className={styles.topBar}>
        {inHub && (
          <Button kind="ghost" size="sm" onClick={() => navigate('/messages')}>
            <ArrowLeft size={17} strokeWidth={2.25} className={styles.headerIcon} aria-hidden />
            {t('messages.backToList')}
          </Button>
        )}
        <Avatar name={peerName} src={peer?.avatarUrl} size={48} />
        <div className={styles.topMeta}>
          <h1 className={styles.peerTitle}>{peerName}</h1>
          <p className={styles.peerSub}>{t('chat.headerHint')}</p>
        </div>
        <div className={styles.topActions}>
          {peer?.role === 'TEACHER' && (
            <Button kind="secondary" size="sm" onClick={() => navigate(`/teachers/${peer.id}`)}>
              {t('messages.viewTeacherProfile')}
            </Button>
          )}
          {!inHub && (
            <Button kind="ghost" size="sm" onClick={() => navigate(-1)}>
              {t('common.back')}
            </Button>
          )}
        </div>
      </header>

      <div className={styles.thread} aria-live="polite">
        {loading ? (
          <p className={styles.emptyHint}>{t('common.loading')}</p>
        ) : messages.length === 0 ? (
          <p className={styles.emptyHint}>{t('chat.empty')}</p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} m={m} mine={m.senderId === myId} timeLabel={timeFmt(m.createdAt)} />
          ))
        )}
        <p className={styles.threadFootnote}>{t('chat.historyHint')}</p>
        <div ref={bottomRef} />
      </div>

      <div className={styles.composer}>
        {pending && (
          <div className={styles.pendingChip}>
            {pending.mime.startsWith('image/') ? (
              <img src={pending.previewLocal} alt="" className={styles.pendingThumb} />
            ) : (
              <Paperclip size={26} strokeWidth={2.25} className={styles.pendingDocIcon} aria-hidden />
            )}
            <span style={{ flex: 1 }}>{t('chat.pendingAttachment')}</span>
            <Button kind="ghost" size="sm" onClick={() => {
              if (pending.previewLocal) URL.revokeObjectURL(pending.previewLocal);
              setPending(null);
            }}>
              {t('common.cancel')}
            </Button>
          </div>
        )}

        <div className={styles.toolbar}>
          <IconButton
            label={t('chat.attachFile')}
            className={styles.toolBtn}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={20} strokeWidth={2.35} className={styles.toolGlyph} aria-hidden />
          </IconButton>
          <IconButton
            label={t('chat.emoji')}
            className={styles.toolBtn}
            onClick={() => setShowEmoji((v) => !v)}
          >
            <Smile size={20} strokeWidth={2.35} className={styles.toolGlyphAccent} aria-hidden />
          </IconButton>
        </div>

        {showEmoji && (
          <div className={styles.emojiPop}>
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                className={styles.emojiBtn}
                onClick={() => {
                  setDraft((d) => d + em);
                  setShowEmoji(false);
                }}
              >
                {em}
              </button>
            ))}
          </div>
        )}

        <form
          className={styles.formRow}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            className={`input-field ${styles.input}`}
            rows={2}
            maxLength={4000}
            placeholder={t('chat.placeholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={loading || sending}
            aria-label={t('chat.placeholder')}
          />
          <Button type="submit" className={styles.sendBtn} disabled={loading || sending || (!draft.trim() && !pending)}>
            {sending ? t('common.loading') : t('chat.send')}
          </Button>
        </form>
      </div>
    </div>
  );
}
