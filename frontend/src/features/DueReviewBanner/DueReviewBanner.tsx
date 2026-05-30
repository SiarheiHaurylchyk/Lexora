import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';

import type { DueSummary } from '@/shared/api/types';
import { useApiQuery } from '@/shared/lib/query';

/** Баннер «к повторению» на странице колод. */
export function DueReviewBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const summaryQuery = useApiQuery<DueSummary>({
    queryKey: ['srs', 'due-summary'],
    url: '/study/due-summary',
  });
  const summary = summaryQuery.data;
  const totalDue = summary?.totalDue ?? 0;

  if (summaryQuery.isLoading || totalDue === 0) return null;

  return (
    <div className='border-brand/30 from-brand/10 mb-8 flex flex-wrap items-center gap-4 rounded-[20px] border bg-gradient-to-r to-transparent px-6 py-5'>
      <div className='bg-brand/20 text-brand-light flex h-12 w-12 items-center justify-center rounded-2xl'>
        <Brain size={26} strokeWidth={2.25} aria-hidden />
      </div>
      <div className='min-w-0 flex-1'>
        <h2 className='font-display m-0 text-lg font-bold'>
          {t('srs.bannerTitle', { count: totalDue })}
        </h2>
        <p className='text-text2 m-0 mt-1 text-sm'>{t('srs.bannerHint')}</p>
      </div>
      <button
        type='button'
        className='btn btn-primary'
        onClick={() => navigate('/study/due-review')}
      >
        {t('srs.reviewNow')}
      </button>
    </div>
  );
}
