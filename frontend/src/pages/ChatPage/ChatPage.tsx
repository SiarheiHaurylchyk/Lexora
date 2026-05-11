import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, IconButton } from '@ui';
import { ArrowLeft, Paperclip, Smile } from 'lucide-react';

import { chatApi } from '@/shared/api/api-legacy';
import type { ChatMessage, ChatThread } from '@/shared/api/types';
import { useAuthenticatedBlobUrl } from '@/shared/hooks/useAuthenticatedBlobUrl';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useApiQuery } from '@/shared/lib/query';
import { useAppSelector } from '@/shared/lib/storeHooks';

const POLL_MS = 5000;

const QUICK_EMOJIS = [
  '😀',
  '😊',
  '🙂',
  '😉',
  '😍',
  '🤝',
  '👍',
  '🙏',
  '❤️',
  '🔥',
  '✨',
  '📚',
  '✅',
  '❓',
  '🎉',
  '👋',
];

interface PendingAttachment {
  url: string;
  mime: string;
  previewLocal: string;
}

const bubbleBase = tw`whitespace-pre-wrap break-words rounded-[18px] px-4 py-3 text-[15px] leading-[1.5] shadow-[0_2px_12px_rgba(0,0,0,0.12)]`;
const bubblePeer = tw`rounded-bl-[6px] border border-border bg-surface text-text`;
const bubbleMine = tw`rounded-br-[6px] border border-[rgba(124,58,237,0.45)] bg-[linear-gradient(145deg,rgba(124,58,237,0.42),rgba(6,182,212,0.22))] text-text`;
const toolBtnClasses = tw`!flex h-10 w-10 items-center justify-center rounded-[10px] !border !border-border !bg-surface !p-0 transition-colors duration-200 hover:!border-[rgba(124,58,237,0.45)]`;

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
  const fileLabel = m.attachmentMime?.includes('pdf')
    ? t('chat.openPdf')
    : t('chat.openFile');

  return (
    <div className={cn('flex', mine && 'justify-end')}>
      <div className='max-w-[min(100%,440px)]'>
        <div className={cn(bubbleBase, mine ? bubbleMine : bubblePeer)}>
          {m.body?.trim() ? m.body : null}
          {isImg && m.attachmentUrl && blobUrl && (
            <img
              src={blobUrl}
              alt=''
              className='mt-2 block max-h-[240px] max-w-[min(100%,320px)] cursor-zoom-in rounded-[12px] object-cover'
            />
          )}
          {isImg && m.attachmentUrl && !blobUrl && (
            <div className='skeleton mt-2.5 h-[140px] rounded-[12px]' />
          )}
          {!isImg && m.attachmentUrl && blobUrl && (
            <a
              className='text-accent mt-2.5 inline-flex items-center text-sm font-semibold'
              href={blobUrl}
              target='_blank'
              rel='noreferrer'
            >
              <Paperclip
                size={15}
                strokeWidth={2.25}
                className='text-accent mr-1.5 shrink-0'
                aria-hidden
              />
              {fileLabel}
            </a>
          )}
        </div>
        <div className='text-text3 mt-1.5 px-1.5 text-[11px]'>{timeLabel}</div>
      </div>
    </div>
  );
}

/**
 * DM thread — works inside /messages/:peerId (split hub) or standalone /chat/:peerId.
 */
export function ChatPage() {
  const { t, i18n } = useTranslation();
  const { peerId: peerIdParam } = useParams<{ peerId: string }>();
  const navigate = useNavigate();
  const inHub = Boolean(useMatch('/messages/:peerId'));
  const myId = useAppSelector((s) => s.auth.user?.id);

  const peerId = Number(peerIdParam);
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const threadQuery = useApiQuery<ChatThread>({
    queryKey: ['chat', 'thread', peerId],
    url: `/chat/${peerId}/thread`,
    enabled: Number.isFinite(peerId),
    refetchInterval: POLL_MS,
  });
  const peer = threadQuery.data?.peer ?? null;
  const messages = threadQuery.data?.messages ?? [];
  const loading = threadQuery.isLoading;

  useEffect(() => {
    if (!Number.isFinite(peerId)) {
      toast.error(t('chat.loadFailed'));
      navigate('/messages', { replace: true });
    }
  }, [peerId, navigate, t]);

  useEffect(() => {
    if (!threadQuery.isLoadingError) return;
    toast.error(getApiErrorMessage(threadQuery.error) || t('chat.loadFailed'));
    if (inHub) navigate('/messages');
    else navigate(-1);
  }, [threadQuery.isLoadingError, threadQuery.error, inHub, navigate, t]);

  useEffect(() => {
    if (!threadQuery.data || !Number.isFinite(peerId)) return;
    void chatApi.markRead(peerId).catch(() => {});
    void queryClient.invalidateQueries({ queryKey: ['chat', 'unread-total'] });
    void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  }, [threadQuery.data, peerId, queryClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  useEffect(
    () => () => {
      if (pending?.previewLocal) URL.revokeObjectURL(pending.previewLocal);
    },
    [pending],
  );

  const send = async () => {
    const text = draft.trim();
    const hasAtt = Boolean(pending);
    if ((!text && !hasAtt) || !Number.isFinite(peerId)) return;
    setSending(true);
    try {
      const payload: {
        body?: string;
        attachmentUrl?: string;
        attachmentMime?: string;
      } = {};
      if (text) payload.body = text;
      if (pending) {
        payload.attachmentUrl = pending.url;
        payload.attachmentMime = pending.mime;
      }
      const { data } = await chatApi.sendMessage(peerId, payload);
      setDraft('');
      if (pending?.previewLocal) URL.revokeObjectURL(pending.previewLocal);
      setPending(null);
      queryClient.setQueryData<ChatThread | undefined>(
        ['chat', 'thread', peerId],
        (prev) =>
          prev ? { ...prev, messages: [...prev.messages, data] } : prev,
      );
      void queryClient.invalidateQueries({
        queryKey: ['chat', 'thread', peerId],
      });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('chat.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const peerName =
    peer?.displayName || peer?.username || (loading ? '…' : `#${peerId}`);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-surface)_70%,var(--color-bg)),var(--color-bg))]',
        inHub
          ? 'h-full p-0'
          : 'box-border min-h-[calc(100vh-48px)] w-full px-12 pt-8 pb-12',
      )}
    >
      <input
        ref={fileRef}
        type='file'
        accept='image/jpeg,image/png,image/gif,image/webp,application/pdf'
        className='pointer-events-none absolute h-0 w-0 opacity-0'
        onChange={(e) => void onPickFile(e)}
      />

      <header className='border-border flex shrink-0 items-start gap-3.5 border-b bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-5 py-4'>
        {inHub && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => navigate('/messages')}
          >
            <ArrowLeft
              size={17}
              strokeWidth={2.25}
              className='mr-1 shrink-0'
              aria-hidden
            />
            {t('messages.backToList')}
          </Button>
        )}
        <Avatar name={peerName} src={peer?.avatarUrl} size={48} />
        <div className='min-w-0 flex-1'>
          <h1 className='font-display m-0 mb-1 text-xl tracking-[-0.02em]'>
            {peerName}
          </h1>
          <p className='text-text3 m-0 text-[13px] leading-[1.4]'>
            {t('chat.headerHint')}
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap gap-2'>
          {peer?.role === 'TEACHER' && (
            <Button
              variant='secondary'
              size='sm'
              onClick={() => navigate(`/teachers/${peer.id}`)}
            >
              {t('messages.viewTeacherProfile')}
            </Button>
          )}
          {!inHub && (
            <Button variant='ghost' size='sm' onClick={() => navigate(-1)}>
              {t('common.back')}
            </Button>
          )}
        </div>
      </header>

      <div
        className='flex flex-1 flex-col gap-3.5 overflow-y-auto p-5'
        aria-live='polite'
      >
        {loading ? (
          <p className='text-text3 m-auto px-5 py-10 text-center text-sm'>
            {t('common.loading')}
          </p>
        ) : messages.length === 0 ? (
          <p className='text-text3 m-auto px-5 py-10 text-center text-sm'>
            {t('chat.empty')}
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              mine={m.senderId === myId}
              timeLabel={timeFmt(m.createdAt)}
            />
          ))
        )}
        <p className='text-text3 m-0 mt-2 text-center text-[11px] italic'>
          {t('chat.historyHint')}
        </p>
        <div ref={bottomRef} />
      </div>

      <div className='border-border shrink-0 border-t bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-bg))] px-[18px] pt-3.5 pb-[18px]'>
        {pending && (
          <div className='border-border bg-bg3 mb-2.5 flex items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[13px]'>
            {pending.mime.startsWith('image/') ? (
              <img
                src={pending.previewLocal}
                alt=''
                className='h-11 w-11 rounded-lg object-cover'
              />
            ) : (
              <Paperclip
                size={26}
                strokeWidth={2.25}
                className='text-accent shrink-0'
                aria-hidden
              />
            )}
            <span className='flex-1'>{t('chat.pendingAttachment')}</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                if (pending.previewLocal)
                  URL.revokeObjectURL(pending.previewLocal);
                setPending(null);
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        )}

        <div className='mb-2.5 flex flex-wrap items-center gap-1.5'>
          <IconButton
            label={t('chat.attachFile')}
            className={toolBtnClasses}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip
              size={20}
              strokeWidth={2.35}
              className='text-accent'
              aria-hidden
            />
          </IconButton>
          <IconButton
            label={t('chat.emoji')}
            className={toolBtnClasses}
            onClick={() => setShowEmoji((v) => !v)}
          >
            <Smile
              size={20}
              strokeWidth={2.35}
              className='text-[#fbbf24]'
              aria-hidden
            />
          </IconButton>
        </div>

        {showEmoji && (
          <div className='border-border bg-surface mb-2.5 flex flex-wrap gap-1 rounded-[12px] border p-2'>
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type='button'
                className='hover:bg-bg3 h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent text-xl leading-none'
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
          className='flex items-end gap-3'
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            className='input-field font-inherit min-h-[48px] flex-1 resize-none !rounded-[14px]'
            rows={2}
            maxLength={4000}
            placeholder={t('chat.placeholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={loading || sending}
            aria-label={t('chat.placeholder')}
          />
          <Button
            type='submit'
            className='min-w-[108px] shrink-0'
            disabled={loading || sending || (!draft.trim() && !pending)}
          >
            {sending ? t('common.loading') : t('chat.send')}
          </Button>
        </form>
      </div>
    </div>
  );
}
