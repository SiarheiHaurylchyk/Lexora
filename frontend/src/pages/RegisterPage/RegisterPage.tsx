import { type FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@ui';

import { LanguageSwitcher } from '@/widgets/LanguageSwitcher';

import { LearningLanguageSelect } from '@/entities/LearningLanguage';

import { authApi } from '@/shared/api/api-legacy';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { setCredentials } from '@/shared/lib/storeActions';
import { useAppDispatch } from '@/shared/lib/storeHooks';

type AccountType = 'LEARNER' | 'TEACHER';

const labelClasses = tw`mb-1.5 block text-[13px] font-medium text-text2`;
const accountCardBase = tw`flex flex-col gap-1 text-left px-3.5 py-3 rounded-[12px] border border-border bg-surface text-text cursor-pointer transition-[border-color,box-shadow,background] duration-150 hover:border-[rgba(124,58,237,0.35)]`;
const accountCardActive = tw`border-brand bg-[rgba(124,58,237,0.08)] shadow-[0_0_0_1px_var(--color-brand)]`;

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    accountType: 'LEARNER' as AccountType,
    learningLanguage: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error(t('auth.passwordMin'));
      return;
    }
    if (form.accountType === 'LEARNER' && !form.learningLanguage.trim()) {
      toast.error(t('auth.learningLanguageRequired'));
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
        displayName: form.displayName || undefined,
        accountType: form.accountType,
        learningLanguage: form.learningLanguage.trim() || undefined,
      });
      dispatch(
        setCredentials({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }),
      );
      toast.success(t('auth.accountCreated'));
      navigate('/home');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      headerSlot={<LanguageSwitcher />}
    >
      <form onSubmit={handleSubmit}>
        <div className='mb-5'>
          <span className={labelClasses}>{t('auth.accountTypeLabel')}</span>
          <div className='mt-2 grid grid-cols-2 gap-2.5'>
            <button
              type='button'
              className={cn(
                accountCardBase,
                form.accountType === 'LEARNER' && accountCardActive,
              )}
              onClick={() => setForm({ ...form, accountType: 'LEARNER' })}
              aria-pressed={form.accountType === 'LEARNER'}
            >
              <span className='text-sm font-semibold'>
                {t('auth.accountLearner')}
              </span>
              <span className='text-text3 text-xs leading-[1.35]'>
                {t('auth.accountLearnerHint')}
              </span>
            </button>
            <button
              type='button'
              className={cn(
                accountCardBase,
                form.accountType === 'TEACHER' && accountCardActive,
              )}
              onClick={() => setForm({ ...form, accountType: 'TEACHER' })}
              aria-pressed={form.accountType === 'TEACHER'}
            >
              <span className='text-sm font-semibold'>
                {t('auth.accountTeacher')}
              </span>
              <span className='text-text3 text-xs leading-[1.35]'>
                {t('auth.accountTeacherHint')}
              </span>
            </button>
          </div>
        </div>

        <div className='mb-4'>
          <label className={labelClasses} htmlFor='reg-learning-lang'>
            {t('auth.learningLanguageLabel')}
          </label>
          <LearningLanguageSelect
            id='reg-learning-lang'
            value={form.learningLanguage}
            onChange={(learningLanguage) =>
              setForm({ ...form, learningLanguage })
            }
            required={form.accountType === 'LEARNER'}
          />
          <p className='text-text3 mt-2 text-xs leading-[1.4]'>
            {form.accountType === 'LEARNER'
              ? t('auth.learningLanguageHint')
              : t('auth.learningLanguageTeacherHint')}
          </p>
        </div>

        <div className='mb-4 grid grid-cols-2 gap-3'>
          <div>
            <label className={labelClasses}>{t('auth.username')}</label>
            <input
              className='input-field'
              type='text'
              placeholder='coollearner'
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
            />
          </div>
          <div>
            <label className={labelClasses}>{t('auth.displayName')}</label>
            <input
              className='input-field'
              type='text'
              placeholder='Alex'
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
            />
          </div>
        </div>
        <div className='mb-4'>
          <label className={labelClasses}>{t('auth.email')}</label>
          <input
            className='input-field'
            type='email'
            placeholder='your@email.com'
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className='mb-7'>
          <label className={labelClasses}>{t('auth.passwordReq')}</label>
          <input
            className='input-field'
            type='password'
            placeholder={t('auth.passwordMinPh')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <button
          type='submit'
          className='btn btn-primary w-full justify-center py-[13px] text-[15px]'
          disabled={loading}
        >
          {loading ? t('auth.creating') : t('auth.createAccount')}
        </button>
      </form>
      <p className='text-text3 mt-5 text-center text-sm'>
        {t('auth.hasAccount')}{' '}
        <Link to='/login' className='text-brand-light font-semibold'>
          {t('auth.signInLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
