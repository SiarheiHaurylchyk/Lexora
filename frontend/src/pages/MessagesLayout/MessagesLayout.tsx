import { useTranslation } from 'react-i18next';
import { Outlet, useMatch } from 'react-router-dom';

import { ConversationList } from '@/widgets/ConversationList';

const inboxClasses = tw`flex min-h-0 flex-col border-r border-border bg-[color-mix(in_srgb,var(--color-bg2)_92%,var(--color-surface))] max-[960px]:border-r-0 max-[960px]:border-b max-[960px]:max-h-[38vh] max-[960px]:overflow-hidden`;

/**
 * "Messages" hub — conversation list + thread (italki-style split view on desktop).
 */
export function MessagesLayout() {
  const { t } = useTranslation();
  const threadOpen = Boolean(useMatch('/messages/:peerId'));

  return (
    <div className='box-border flex min-h-0 w-full flex-1 flex-col px-4 pt-3 pb-4 max-[960px]:px-3 max-[960px]:pt-2.5 max-[960px]:pb-3'>
      <div className='border-border bg-surface flex grid min-h-0 flex-1 grid-cols-[minmax(280px,340px)_minmax(0,1fr)] items-stretch overflow-hidden rounded-[20px] border max-[960px]:grid-cols-1'>
        <aside
          className={cn(inboxClasses, threadOpen && 'max-[960px]:hidden')}
          aria-label={t('messages.inboxAria')}
        >
          <div className='border-border border-b px-[18px] pt-5 pb-3'>
            <h1 className='font-display m-0 mb-1.5 text-[22px] tracking-[-0.02em]'>
              {t('messages.title')}
            </h1>
            <p className='text-text3 m-0 text-[13px] leading-[1.45]'>
              {t('messages.subtitle')}
            </p>
          </div>
          <ConversationList />
        </aside>
        <main className='bg-bg flex min-h-0 min-w-0 flex-col'>
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
    <div className='text-text3 flex min-h-0 flex-1 items-center justify-center px-6 py-12 text-center text-[15px]'>
      <p className='m-0 max-w-[320px]'>{t('messages.pickConversation')}</p>
    </div>
  );
}
