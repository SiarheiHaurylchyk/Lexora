import React from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { classNames } from '../lib/classNames';
import ConversationList from '../components/messages/ConversationList';
import styles from './MessagesLayout.module.css';

/**
 * “Messages” hub — conversation list + thread (italki-style split view on desktop).
 */
export default function MessagesLayout() {
  const { t } = useTranslation();
  const threadOpen = Boolean(useMatch('/messages/:peerId'));

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside
          className={classNames(styles.inbox, threadOpen && styles.hideInboxWhenThread)}
          aria-label={t('messages.inboxAria')}
        >
          <div className={styles.inboxHeader}>
            <h1 className={styles.title}>{t('messages.title')}</h1>
            <p className={styles.sub}>{t('messages.subtitle')}</p>
          </div>
          <ConversationList />
        </aside>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Shown at /messages before the learner picks someone from the list. */
export function MessagesIndexPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className={styles.placeholder}>
      <p style={{ margin: 0, maxWidth: 320 }}>{t('messages.pickConversation')}</p>
    </div>
  );
}
