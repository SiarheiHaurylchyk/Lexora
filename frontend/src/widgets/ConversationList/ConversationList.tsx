import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '@ui';

import { chatApi } from '@/shared/api/api-legacy';
import type { ChatConversation } from '@/shared/api/types';

const rowBase = tw`flex items-center gap-3 border-b border-border px-4 py-3 no-underline transition-colors duration-200 hover:bg-[rgba(255,255,255,0.04)]`;
const rowActive = tw`bg-[rgba(124,58,237,0.10)] hover:bg-[rgba(124,58,237,0.15)]`;

export function ConversationList() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='p-3'>
          <div className='skeleton mb-2 h-14 rounded-[12px]' />
          <div className='skeleton mb-2 h-14 rounded-[12px]' />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='px-5 py-8 text-center'>
          <p className='text-text2 m-0 mb-1 text-sm font-semibold'>
            {t('messages.noConversations')}
          </p>
          <p className='text-text3 m-0 text-xs leading-[1.5]'>
            {t('messages.noConversationsHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-0 flex-1 overflow-y-auto'>
      <ul className='m-0 list-none p-0'>
        {rows.map((row) => {
          const name = row.peer.displayName || row.peer.username;
          return (
            <li key={row.peer.id}>
              <NavLink
                to={`/messages/${row.peer.id}`}
                className={({ isActive }) => cn(rowBase, isActive && rowActive)}
              >
                <Avatar name={name} src={row.peer.avatarUrl} size={44} />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-baseline justify-between gap-2'>
                    <span className='text-text truncate text-sm font-semibold'>
                      {name}
                    </span>
                    {row.lastMessageAt && (
                      <span className='text-text3 shrink-0 text-[11px]'>
                        {timeFmt(row.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className='mt-0.5 flex items-center gap-2'>
                    <span className='text-text3 min-w-0 flex-1 truncate text-xs'>
                      {row.lastMessagePreview || t('messages.noMessagesYet')}
                    </span>
                    {row.unreadCount > 0 && (
                      <span className='bg-brand inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white'>
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
