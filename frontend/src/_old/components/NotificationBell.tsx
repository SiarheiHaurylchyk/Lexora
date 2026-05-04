import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Info, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { notificationsApi } from '../services/api';
import type { AppNotificationItem } from '../services/types';
import {
  notificationActionLabel,
  notificationMatchesFilter,
  resolveNotificationText,
  type NotificationFilter,
} from '../lib/notificationCopy';
import { classNames } from '../lib/classNames';
import styles from './NotificationBell.module.css';

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

export default function NotificationBell({ placement }: Props) {
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
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
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
      return new Date(iso).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '';
    }
  };

  const badge = unread > 0 ? (unread > 99 ? '99+' : String(unread)) : null;

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={classNames(styles.trigger, isHeader && styles.triggerHeader)}
          aria-label={t('notifications.aria')}
        >
          <span className={classNames(styles.iconWrap, isHeader && styles.iconWrapHeader)}>
            <Bell size={isHeader ? 22 : 18} strokeWidth={2.25} aria-hidden />
            {badge && (
              <span className={classNames(styles.badge, isHeader && styles.badgeHeader)}>{badge}</span>
            )}
          </span>
          {!isHeader && <span className={styles.triggerLabel}>{t('notifications.title')}</span>}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menu}
          side={isHeader ? 'bottom' : 'top'}
          align="end"
          sideOffset={8}
        >
          <div className={styles.menuHead}>
            <div className={styles.menuHeadTop}>
              <span className={styles.menuTitle}>{t('notifications.title')}</span>
              <button
                type="button"
                className={styles.iconBtn}
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
              <button type="button" className={styles.linkBtn} onClick={() => void markAll()}>
                {t('notifications.markAllRead')}
              </button>
            )}
            <div className={styles.filterRow} role="tablist" aria-label={t('notifications.filtersAria')}>
              {FILTERS.map(({ key, labelKey }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={classNames(styles.filterChip, filter === key && styles.filterChipActive)}
                  onClick={() => setFilter(key)}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.list}>
            {loading && <div className={styles.muted}>{t('common.loading')}</div>}
            {!loading && filteredItems.length === 0 && (
              <div className={styles.muted}>{t('notifications.empty')}</div>
            )}
            {!loading &&
              filteredItems.map((n) => {
                const { title, body } = resolveNotificationText(n, t, i18n.language);
                const cta = n.href?.trim() ? notificationActionLabel(n.category, t) : null;
                return (
                  <DropdownMenu.Item
                    key={n.id}
                    className={classNames(styles.row, !n.read && styles.rowUnread)}
                    onSelect={(e) => {
                      e.preventDefault();
                      void openNotification(n);
                    }}
                  >
                    <div className={styles.rowLayout}>
                      <div className={styles.rowIconCircle} aria-hidden>
                        <Info size={18} strokeWidth={2.25} />
                      </div>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>{title}</div>
                        {body.trim() && <div className={styles.rowBody}>{body}</div>}
                        {cta && (
                          <span className={styles.ctaBtn} data-disabled={!n.href}>
                            {cta}
                          </span>
                        )}
                        <div className={styles.rowTime}>{formatTime(n.createdAt)}</div>
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
