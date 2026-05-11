import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, GraduationCap, Layers } from 'lucide-react';

import type { NextBookingPayload } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useApiQuery } from '@/shared/lib/query';
import { useAppSelector } from '@/shared/lib/storeHooks';

const choiceCardClasses = tw`block overflow-hidden rounded-[18px] border border-border bg-surface text-inherit cursor-pointer transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.22)] hover:border-[rgba(124,58,237,0.35)] no-underline`;
const choiceTopClasses = tw`relative flex h-[108px] items-center justify-center`;
const iconStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.95)',
  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
};

/**
 * Post-login hub: choose "classes" (people, classroom, schedule) or "flashcards" (decks).
 */
export function HomeHubPage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const canTeach = userCanTeach(user?.role);
  const nextBookingQuery = useApiQuery<NextBookingPayload>({
    queryKey: ['bookings', 'next'],
    url: '/me/next-booking',
  });
  const nextBooking = nextBookingQuery.data ?? null;

  const nextBookingWhen =
    nextBooking?.hasBooking && nextBooking.startTime && nextBooking.endTime
      ? (() => {
          const start = new Date(nextBooking.startTime);
          const end = new Date(nextBooking.endTime);
          const d = start.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const t1 = start.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });
          const t2 = end.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });
          return `${d} · ${t1} – ${t2}`;
        })()
      : '';

  return (
    <div className='mx-auto box-border w-full max-w-[880px] pt-10 pb-14'>
      <h1 className='font-display m-0 mb-2 text-[32px] font-bold tracking-[-0.02em]'>
        {t('hub.title')}
      </h1>
      <p className='text-text2 m-0 mb-7 max-w-[42ch] text-base'>
        {t('hub.subtitle')}
      </p>

      {nextBooking?.hasBooking && nextBookingWhen && (
        <div className='border-border bg-surface mb-7 flex flex-wrap items-center gap-3 rounded-[14px] border px-[18px] py-4'>
          <CalendarClock
            size={22}
            strokeWidth={2.25}
            className='text-brand-light shrink-0'
            aria-hidden
          />
          <div className='min-w-0 flex-[1_1_200px]'>
            <div className='mb-1 font-bold'>
              {t('dashboard.nextLesson.title')}
            </div>
            <div className='text-text2 text-sm'>
              {nextBooking.asTeacher
                ? t('dashboard.nextLesson.withStudent', {
                    name: nextBooking.counterpartName || '—',
                  })
                : t('dashboard.nextLesson.withTeacher', {
                    name: nextBooking.counterpartName || '—',
                  })}
            </div>
            <div className='text-text3 mt-1.5 text-[13px]'>
              {nextBookingWhen}
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {nextBooking.classroomLinkId != null && (
              <Link
                to={`/class/${nextBooking.classroomLinkId}`}
                className='btn btn-primary btn-sm'
              >
                {t('dashboard.nextLesson.openClassroom')}
              </Link>
            )}
            {nextBooking.meetingUrl?.trim() && (
              <a
                href={nextBooking.meetingUrl.trim()}
                target='_blank'
                rel='noopener noreferrer'
                className='btn btn-secondary btn-sm'
              >
                {t('dashboard.nextLesson.join')}
              </a>
            )}
            {!nextBooking.asTeacher && (
              <Link to='/bookings' className='btn btn-secondary btn-sm'>
                {t('dashboard.nextLesson.allBookings')}
              </Link>
            )}
            {nextBooking.asTeacher && (
              <Link to='/schedule' className='btn btn-secondary btn-sm'>
                {t('dashboard.nextLesson.openSchedule')}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className='grid grid-cols-2 gap-5 max-[720px]:grid-cols-1'>
        <Link to='/classes' className={choiceCardClasses}>
          <div
            className={cn(
              choiceTopClasses,
              'bg-[linear-gradient(135deg,#06b6d4_0%,#0891b2_45%,#0e7490_100%)]',
            )}
          >
            <GraduationCap
              size={48}
              strokeWidth={2}
              style={iconStyle}
              aria-hidden
            />
          </div>
          <div className='px-[22px] pt-5 pb-[22px]'>
            <div className='text-text3 mb-1.5 text-xs font-bold tracking-[0.06em] uppercase'>
              {t('hub.classesKicker')}
            </div>
            <h2 className='font-display m-0 mb-2.5 text-[22px] font-bold'>
              {t('hub.classesTitle')}
            </h2>
            <p className='text-text2 m-0 text-sm leading-[1.45]'>
              {t(
                canTeach ? 'hub.classesDescTeacher' : 'hub.classesDescLearner',
              )}
            </p>
            <span className='text-brand-light mt-4 inline-flex items-center gap-1.5 text-sm font-semibold'>
              {t('hub.go')}{' '}
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </span>
          </div>
        </Link>

        <Link to='/decks' className={choiceCardClasses}>
          <div
            className={cn(
              choiceTopClasses,
              'bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_50%,#5b21b6_100%)]',
            )}
          >
            <Layers size={48} strokeWidth={2} style={iconStyle} aria-hidden />
          </div>
          <div className='px-[22px] pt-5 pb-[22px]'>
            <div className='text-text3 mb-1.5 text-xs font-bold tracking-[0.06em] uppercase'>
              {t('hub.cardsKicker')}
            </div>
            <h2 className='font-display m-0 mb-2.5 text-[22px] font-bold'>
              {t('hub.cardsTitle')}
            </h2>
            <p className='text-text2 m-0 text-sm leading-[1.45]'>
              {t('hub.cardsDesc')}
            </p>
            <span className='text-brand-light mt-4 inline-flex items-center gap-1.5 text-sm font-semibold'>
              {t('hub.go')}{' '}
              <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
