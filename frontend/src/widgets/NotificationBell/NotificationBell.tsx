import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, Info, Settings } from 'lucide-react';

import { notificationsApi } from '@/shared/api/api-legacy';
import type { AppNotificationItem } from '@/shared/api/types';
import {
  notificationActionLabel,
  type NotificationFilter,
  notificationMatchesFilter,
  resolveNotificationText,
} from '@/shared/lib/notificationCopy';

const POLL_MS = 30_000;

interface Props {
  placement?: 'header';
}

const FILTERS: { key: NotificationFilter; labelKey: string }[] = [
  { key: 'ALL', labelKey: 'notifications.filterAll' },
  { key: 'BOOKING', labelKey: 'notifications.filterLessons' },
  { key: 'ASSIGNMENT', labelKey: 'notifications.filterAssignments' },
  { key: 'OTHER', labelKey: 'notifications.filterOther' },
];

const triggerBase = tw`flex w-full cursor-pointer items-center gap-2.5 mb-2 rounded-[10px] border border-transparent bg-transparent px-3.5 py-2.5 text-text2 transition-[background,color] duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-text font-inherit`;
const triggerHeader = tw`!w-auto !m-0 !p-2.5 !rounded-[12px] !justify-center hover:!bg-[rgba(255,255,255,0.06)]`;
const filterChipBase = tw`shrink-0 cursor-pointer rounded-full border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-text2 transition-colors duration-150 hover:text-text hover:border-[rgba(255,255,255,0.12)] font-inherit`;
const filterChipActive = tw`!bg-[rgba(6,182,212,0.18)] !border-[rgba(6,182,212,0.45)] !text-[#22d3ee]`;
const rowBase = tw`cursor-pointer rounded-[12px] border border-transparent p-0 outline-none focus-visible:shadow-[0_0_0_2px_var(--color-brand-light)] hover:bg-[rgba(255,255,255,0.04)]`;
const rowUnread = tw`bg-[rgba(124,58,237,0.10)] border-[rgba(124,58,237,0.20)]`;

export function NotificationBell({ placement }: Props) {
  const isHeader = placement === 'header';
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await notificationsApi.unreadCount();
      setUnread(typeof data.count === 'number' ? data.count : 0);
    } catch {
      /* offline */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('notifications.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshUnread]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshUnread();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshUnread]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void refreshUnread();
      void loadList();
    }
  }, [open, loadList, refreshUnread]);

  const filteredItems = useMemo(
    () => items.filter((n) => notificationMatchesFilter(n, filter)),
    [items, filter],
  );

  const hasUnread = items.some((x) => !x.read);

  const openNotification = async (n: AppNotificationItem) => {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        );
        void refreshUnread();
      } catch {
        toast.error(t('notifications.markReadFailed'));
      }
    }
    setOpen(false);
    if (n.href?.trim()) {
      navigate(n.href.trim());
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch {
      toast.error(t('notifications.markAllFailed'));
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  };

  const badge = unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null;

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type='button'
          className={cn(triggerBase, isHeader && triggerHeader)}
          aria-label={t('notifications.aria')}
        >
          <span
            className={cn(
              'relative inline-flex items-center justify-center',
              isHeader ? 'h-[26px] w-[26px]' : 'h-[22px] w-[22px]',
            )}
          >
            <Bell size={isHeader ? 22 : 18} strokeWidth={2.25} aria-hidden />
            {badge && (
              <span className='absolute -top-1.5 -right-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#dc2626] px-1.5 text-[10px] font-bold text-white shadow-[0_0_0_2px_var(--color-bg2)]'>
                {badge}
              </span>
            )}
          </span>
          {!isHeader && (
            <span className='text-sm font-medium'>
              {t('notifications.title')}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className='border-border bg-surface z-[5200] flex max-h-[min(520px,78vh)] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-[14px] border shadow-[0_16px_48px_rgba(0,0,0,0.45)]'
          side={isHeader ? 'bottom' : 'top'}
          align='end'
          sideOffset={8}
        >
          <div className='border-border flex flex-col gap-2 border-b px-3.5 pt-3 pb-2.5'>
            <div className='flex items-center justify-between gap-2.5'>
              <span className='text-[15px] font-bold'>
                {t('notifications.title')}
              </span>
              <button
                type='button'
                className='border-border text-text2 hover:text-text inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border bg-[rgba(255,255,255,0.03)] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.07)]'
                aria-label={t('notifications.settingsAria')}
                onClick={() => {
                  setOpen(false);
                  navigate('/settings');
                }}
              >
                <Settings size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
            {hasUnread && (
              <button
                type='button'
                className='font-inherit text-text3 hover:text-brand-light cursor-pointer self-start border-0 bg-transparent px-0 py-0.5 text-xs hover:underline'
                onClick={() => void markAll()}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
            <div
              className='flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]'
              role='tablist'
              aria-label={t('notifications.filtersAria')}
            >
              {FILTERS.map(({ key, labelKey }) => (
                <button
                  key={key}
                  type='button'
                  role='tab'
                  aria-selected={filter === key}
                  className={cn(
                    filterChipBase,
                    filter === key && filterChipActive,
                  )}
                  onClick={() => setFilter(key)}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto p-2'>
            {loading && (
              <div className='text-text3 px-4 py-5 text-center text-[13px]'>
                {t('common.loading')}
              </div>
            )}
            {!loading && filteredItems.length === 0 && (
              <div className='text-text3 px-4 py-5 text-center text-[13px]'>
                {t('notifications.empty')}
              </div>
            )}
            {!loading &&
              filteredItems.map((n) => {
                const { title, body } = resolveNotificationText(
                  n,
                  t,
                  i18n.language,
                );
                const cta = n.href?.trim()
                  ? notificationActionLabel(n.category, t)
                  : null;
                return (
                  <DropdownMenu.Item
                    key={n.id}
                    className={cn(rowBase, !n.read && rowUnread)}
                    onSelect={(e) => {
                      e.preventDefault();
                      void openNotification(n);
                    }}
                  >
                    <div className='flex items-start gap-3 px-2.5 py-3'>
                      <div
                        className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(6,182,212,0.15)] text-[#22d3ee]'
                        aria-hidden
                      >
                        <Info size={18} strokeWidth={2.25} />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='mb-1.5 text-[13px] leading-[1.3] font-bold'>
                          {title}
                        </div>
                        {body.trim() && (
                          <div className='text-text2 mb-2.5 text-xs leading-[1.45]'>
                            {body}
                          </div>
                        )}
                        {cta && (
                          <span
                            className='pointer-events-none mb-2 inline-flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#06b6d4] to-[#0891b2] px-3.5 py-2 text-xs font-bold text-[#0f172a]'
                            data-disabled={!n.href}
                          >
                            {cta}
                          </span>
                        )}
                        <div className='text-text3 text-[11px]'>
                          {formatTime(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  </DropdownMenu.Item>
                );
              })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
