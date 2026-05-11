import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { TeacherDirectoryEntry } from '@/shared/api/types';
import { getYouTubeThumbUrl } from '@/shared/lib/youtube';

interface Props {
  teacher: TeacherDirectoryEntry;
}

const cardClasses = tw`block w-full text-left cursor-pointer overflow-hidden rounded-[20px] border border-border bg-surface transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[rgba(124,58,237,0.35)] hover:shadow-[var(--shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light`;
const badgeClasses = tw`absolute max-w-[calc(100%-20px)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2.5 py-1.5`;
const pillClasses = tw`rounded-full border border-border bg-bg4 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-text2`;

export function TeacherCard({ teacher }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const thumb = teacher.introVideoUrl
    ? getYouTubeThumbUrl(teacher.introVideoUrl)
    : null;
  const langs = teacher.languages ?? [];
  const headline =
    teacher.headline?.trim() || t('teachers.card.defaultHeadline');

  const statsLine = t('teachers.card.statsShort', {
    students: teacher.studentCount,
    lessons: teacher.lessonCount,
  });

  const rateLabel =
    teacher.hourlyRate != null && teacher.hourlyRate > 0
      ? t('teachers.card.rateFrom', { amount: teacher.hourlyRate.toFixed(2) })
      : t('teachers.card.rateAsk');

  return (
    <button
      type='button'
      className={cardClasses}
      onClick={() => navigate(`/teachers/${teacher.id}`)}
    >
      <div className='relative aspect-[16/10] bg-[linear-gradient(135deg,#7c3aed_0%,#6d28d9_45%,#5b21b6_100%)]'>
        {thumb ? (
          <>
            <img
              src={thumb}
              alt=''
              className='block h-full w-full object-cover'
              loading='lazy'
            />
            <span
              className='absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(0,0,0,0.6)] text-xl text-white'
              aria-hidden
            >
              ▶
            </span>
          </>
        ) : teacher.avatarUrl ? (
          <img
            src={teacher.avatarUrl}
            alt=''
            className='block h-full w-full object-cover'
            loading='lazy'
          />
        ) : (
          <div className='font-display flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(124,58,237,0.55),rgba(91,33,182,0.35))] text-[64px] font-extrabold text-white'>
            {(teacher.displayName || teacher.username)[0].toUpperCase()}
          </div>
        )}
        <div
          className={cn(
            badgeClasses,
            'border-border2 text-text2 right-2.5 bottom-2.5 border bg-[rgba(15,15,19,0.82)] text-[11px] font-semibold',
          )}
        >
          {statsLine}
        </div>
        {teacher.offersTrialLesson && (
          <div
            className={cn(
              badgeClasses,
              'top-2.5 right-2.5 border border-[rgba(255,255,255,0.22)] bg-[rgba(16,185,129,0.92)] text-[10px] font-extrabold tracking-[0.06em] text-white uppercase',
            )}
          >
            {t('teachers.card.trial')}
          </div>
        )}
      </div>

      <div className='px-[18px] pt-4 pb-[18px]'>
        <div className='mb-1 flex items-center justify-between gap-2'>
          <span className='font-display text-text text-[17px] font-bold'>
            {teacher.displayName}
          </span>
          <span className='text-text3 text-[22px] leading-none' aria-hidden>
            ›
          </span>
        </div>
        <div className='text-accent mb-2.5 text-[13px]'>{headline}</div>

        {langs.length > 0 && (
          <div className='mb-2.5 flex flex-wrap gap-1.5'>
            {langs.slice(0, 6).map((code) => (
              <span key={code} className={pillClasses}>
                {t(`languages.${code}`, { defaultValue: code })}
              </span>
            ))}
          </div>
        )}

        {teacher.bioPreview && (
          <p className='text-text3 mb-3 line-clamp-2 text-[13px] leading-[1.45]'>
            {teacher.bioPreview}
          </p>
        )}

        <div className='border-border flex flex-wrap items-center justify-between gap-2 border-t pt-2'>
          <span className='text-brand-light text-sm font-bold'>
            {rateLabel}
          </span>
          <span className='text-text3 text-xs'>
            {t('teachers.card.decksPublic', { count: teacher.publicDeckCount })}
          </span>
        </div>
      </div>
    </button>
  );
}
