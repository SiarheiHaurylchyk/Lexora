import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { JitsiMeetEmbed, type JitsiMeetEmbedHandle } from '@/shared/lib/jitsi';
import type { FloatingCallSession } from '@/shared/lib/lessonCall';

export type {
  FloatingCallSession,
  FloatingDockMode,
} from '@/shared/lib/lessonCall';

interface Props {
  session: FloatingCallSession;
  onConferenceLeft: () => void;
  onToggleDock: () => void;
}

const shellPipClasses = tw`fixed top-[72px] right-4 z-[4001] flex w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-[14px] bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)]`;
const shellMaxClasses = tw`fixed top-1/2 left-1/2 z-[4001] flex h-[min(720px,calc(100vh-48px))] w-[min(1120px,96vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[16px] bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)]`;
const chromeBtnClasses = tw`cursor-pointer rounded-lg border border-border bg-[rgba(255,255,255,0.06)] px-2.5 py-1.5 font-inherit text-xs text-text hover:bg-[rgba(255,255,255,0.10)]`;
const hangupBtnClasses = tw`!border-[rgba(239,68,68,0.45)] !text-[#fca5a5]`;

export function FloatingCallDock({
  session,
  onConferenceLeft,
  onToggleDock,
}: Props) {
  const { t } = useTranslation();
  const embedRef = useRef<JitsiMeetEmbedHandle>(null);
  const pip = session.dock === 'pip';

  const requestHangup = () => {
    embedRef.current?.hangup();
  };

  return (
    <>
      {!pip && (
        <div
          className='fixed inset-0 z-[3999] bg-[rgba(0,0,0,0.55)]'
          onClick={onToggleDock}
          aria-hidden
        />
      )}
      <div
        className={pip ? shellPipClasses : shellMaxClasses}
        role='dialog'
        aria-label={t('lessonCall.dockTitle')}
      >
        <div className='border-border text-text2 flex shrink-0 items-center justify-between gap-2 border-b px-2.5 py-2 text-[13px] font-semibold'>
          <span>{t('lessonCall.dockTitle')}</span>
          <div className='flex flex-wrap items-center gap-1.5'>
            <button
              type='button'
              className={chromeBtnClasses}
              onClick={onToggleDock}
            >
              {pip ? t('lessonCall.expand') : t('lessonCall.mini')}
            </button>
            <button
              type='button'
              className={cn(chromeBtnClasses, hangupBtnClasses)}
              onClick={requestHangup}
            >
              {t('lessonCall.hangup')}
            </button>
          </div>
        </div>
        <div
          className={cn(
            'relative flex-1',
            pip ? 'aspect-video min-h-0' : 'min-h-[180px]',
          )}
        >
          <JitsiMeetEmbed
            ref={embedRef}
            url={session.url}
            onConferenceLeft={onConferenceLeft}
          />
        </div>
      </div>
    </>
  );
}
