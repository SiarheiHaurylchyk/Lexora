import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { chatApi } from '../../services/api';
import type { ChatConversation } from '../../services/types';
import Avatar from '../ui/Avatar';
import styles from './ConversationList.module.css';

/**
 * Left column of the Messages hub — one row per teacher/student link that has (or can have) DMs.
 */
export default function ConversationList() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [rows, setRows] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await chatApi.conversations();
      setRows(data ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, location.pathname]);

  const timeFmt = useCallback(
    (iso: string | null) => {
      if (!iso) return '';
      try {
        return new Intl.DateTimeFormat(i18n.language, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(iso));
      } catch {
        return '';
      }
    },
    [i18n.language],
  );

  if (loading) {
    return (
      <div className={styles.scroll}>
        <div className={styles.pad}>
          <div className="skeleton" style={{ height: 56, borderRadius: 12, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 56, borderRadius: 12, marginBottom: 8 }} />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={styles.scroll}>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t('messages.noConversations')}</p>
          <p className={styles.emptyHint}>{t('messages.noConversationsHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scroll}>
    <ul className={styles.list}>
      {rows.map((row) => {
        const name = row.peer.displayName || row.peer.username;
        return (
          <li key={row.peer.id}>
            <NavLink
              to={`/messages/${row.peer.id}`}
              className={({ isActive }) => `${styles.row} ${isActive ? styles.rowActive : ''}`}
            >
              <Avatar name={name} src={row.peer.avatarUrl} size={44} />
              <div className={styles.meta}>
                <div className={styles.top}>
                  <span className={styles.name}>{name}</span>
                  {row.lastMessageAt && (
                    <span className={styles.time}>{timeFmt(row.lastMessageAt)}</span>
                  )}
                </div>
                <div className={styles.preview}>
                  <span className={styles.snippet}>{row.lastMessagePreview || t('messages.noMessagesYet')}</span>
                  {row.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                      {row.unreadCount > 99 ? '99+' : row.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </NavLink>
          </li>
        );
      })}
    </ul>
    </div>
  );
}
