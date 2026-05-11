import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

import type { StudentLink } from '@/shared/api/types';

interface Props {
  link: StudentLink;
  /** Teacher card shows student as peer; learner shows teacher. */
  peerRole: 'student' | 'teacher';
}

const cardClasses = tw`block w-full text-left cursor-pointer overflow-hidden rounded-[20px] border border-border bg-surface transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[rgba(124,58,237,0.35)] hover:shadow-[var(--shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light`;
const badgeBase = tw`absolute max-w-[calc(100%-20px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2.5 py-1.5`;
const pillClasses = tw`rounded-full border border-border bg-bg4 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-text2`;

export function ClassCard({ link, peerRole }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const u = link.user;
  const display = u.displayName?.trim() || u.username;
  const initial = display.slice(0, 1).toUpperCase();

  const subtitle =
    peerRole === 'student'
      ? t('classes.peerSubtitleStudent')
      : t('classes.peerSubtitleTeacher');

  const since =
    link.createdAt &&
    t('classes.since', {
      date: new Date(link.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    });

  return (
    <button
      type='button'
      className={cardClasses}
      onClick={() => navigate(`/class/${link.linkId}`)}
    >
      <div className='relative aspect-[16/10] bg-[linear-gradient(135deg,#06b6d4_0%,#0891b2_45%,#0e7490_100%)]'>
        {u.avatarUrl ? (
          <img
            src={u.avatarUrl}
            alt=''
            className='block h-full w-full object-cover'
            loading='lazy'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(6,182,212,0.55),rgba(14,116,144,0.35))]'>
            <GraduationCap
              className='text-[rgba(255,255,255,0.92)] drop-shadow-[0_4px_14px_rgba(0,0,0,0.28)]'
              size={52}
              strokeWidth={2}
              aria-hidden
            />
          </div>
        )}
        <div
          className={cn(
            badgeBase,
            'top-2.5 right-2.5 border border-[rgba(255,255,255,0.22)] bg-[rgba(185,28,28,0.92)] text-[10px] font-extrabold tracking-[0.06em] text-white uppercase',
          )}
        >
          {t('classes.sharedClassBadge')}
        </div>
        {since && (
          <div
            className={cn(
              badgeBase,
              'border-border2 text-text2 right-2.5 bottom-2.5 border bg-[rgba(15,15,19,0.82)] text-[11px] font-semibold',
            )}
          >
            {since}
          </div>
        )}
      </div>

      <div className='px-[18px] pt-4 pb-[18px]'>
        <div className='text-text3 mb-1.5 text-[11px] font-bold tracking-[0.06em] uppercase'>
          {t('hub.classesKicker')}
        </div>
        <div className='mb-1 flex items-center justify-between gap-2'>
          <span className='font-display text-text text-[17px] font-bold'>
            {display}
          </span>
          <span className='text-text3 text-[22px] leading-none' aria-hidden>
            ›
          </span>
        </div>
        <div className='text-accent mb-2.5 text-[13px]'>{subtitle}</div>

        <div className='mb-2.5 flex flex-wrap gap-1.5'>
          <span className={pillClasses}>{initial}</span>
          <span className={pillClasses}>{u.username}</span>
        </div>

        {u.email && (
          <p className='text-text3 mb-3 line-clamp-2 text-[13px] leading-[1.45]'>
            {u.email}
          </p>
        )}

        <div className='border-border flex flex-wrap items-center justify-between gap-2 border-t pt-1'>
          <span className='text-brand-light text-sm font-bold'>
            {t('classes.openClass')} →
          </span>
          <span className='text-text3 text-xs'>#{link.linkId}</span>
        </div>
      </div>
    </button>
  );
}
