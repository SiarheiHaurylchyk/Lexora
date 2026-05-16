import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { authApi } from '@/shared/api/api-legacy';
import { updateUser } from '@/shared/lib/storeActions';
import { useAuthStore } from '@/shared/lib/storeHooks';

const FEATURES = [
  {
    icon: '👥',
    titleKey: 'become.feature1Title',
    textKey: 'become.feature1Text',
  },
  {
    icon: '📘',
    titleKey: 'become.feature2Title',
    textKey: 'become.feature2Text',
  },
  {
    icon: '📅',
    titleKey: 'become.feature3Title',
    textKey: 'become.feature3Text',
  },
  {
    icon: '🎯',
    titleKey: 'become.feature4Title',
    textKey: 'become.feature4Text',
  },
] as const;

const faqItemBase = tw`border-b border-border px-1 py-3 last:border-b-0 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:py-1 [&_summary]:text-[15px] [&_summary]:font-semibold [&_summary]:after:float-right [&_summary]:after:content-['＋'] [&_summary]:after:text-text3 [&_summary]:after:transition [&[open]_summary]:after:content-['−'] [&_p]:mt-2.5 [&_p]:text-sm [&_p]:leading-[1.6] [&_p]:text-text2`;

/**
 * Page that converts a learner account to a teacher account in one click.
 * After upgrading the user lands on the teacher listing form to fill in details.
 */
export function BecomeTeacherPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const isTeacher = user.role === 'TEACHER' || user.role === 'ADMIN';

  const handleUpgrade = async () => {
    setBusy(true);
    try {
      const { data } = await authApi.upgradeToTeacher();
      updateUser(data);
      toast.success(t('become.success'));
      navigate('/settings?tab=teacher');
    } catch {
      toast.error(t('become.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='box-border w-full py-10'>
      <div className='border-border mb-8 rounded-[28px] border bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(6,182,212,0.10))] px-8 py-12 text-center'>
        <span className='text-brand-light mb-4 inline-block rounded-full bg-[rgba(124,58,237,0.18)] px-3.5 py-1.5 text-xs font-semibold tracking-[0.04em] uppercase'>
          {t('become.badge')}
        </span>
        <h1 className='font-display mb-3 text-[clamp(28px,4.4vw,42px)] tracking-[-0.02em]'>
          {t('become.title')}
        </h1>
        <p className='text-text2 mx-auto mb-6 max-w-[560px] text-base leading-[1.55]'>
          {t('become.subtitle')}
        </p>

        {isTeacher ? (
          <div className='border-border2 bg-surface inline-block max-w-[420px] rounded-[20px] border px-5 py-4 text-left'>
            <strong>{t('become.alreadyTitle')}</strong>
            <p className='text-text2 mt-1.5 mb-3.5 text-sm leading-[1.55]'>
              {t('become.alreadyHelp')}
            </p>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => navigate('/settings?tab=teacher')}
            >
              {t('become.openListing')} →
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-primary btn-lg'
            disabled={busy}
            onClick={() => void handleUpgrade()}
          >
            {busy ? t('common.loading') : t('become.cta')} →
          </button>
        )}
      </div>

      <div className='mb-9 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4'>
        {FEATURES.map((f) => (
          <div
            key={f.titleKey}
            className='border-border bg-surface rounded-[20px] border p-5'
          >
            <span className='mb-2.5 inline-block text-3xl'>{f.icon}</span>
            <h3 className='font-display mb-1.5 text-[17px]'>{t(f.titleKey)}</h3>
            <p className='text-text2 text-[13px] leading-[1.55]'>
              {t(f.textKey)}
            </p>
          </div>
        ))}
      </div>

      <div className='border-border bg-surface rounded-[20px] border p-6'>
        <h2 className='font-display mb-3.5 text-[22px]'>
          {t('become.faqTitle')}
        </h2>
        <details className={faqItemBase}>
          <summary>{t('become.q1')}</summary>
          <p>{t('become.a1')}</p>
        </details>
        <details className={faqItemBase}>
          <summary>{t('become.q2')}</summary>
          <p>{t('become.a2')}</p>
        </details>
        <details className={faqItemBase}>
          <summary>{t('become.q3')}</summary>
          <p>{t('become.a3')}</p>
        </details>
      </div>
    </div>
  );
}
