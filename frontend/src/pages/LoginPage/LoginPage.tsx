import { type FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@ui';

import { LanguageSwitcher } from '@/widgets/LanguageSwitcher';

import { authApi } from '@/shared/api/api-legacy';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { setCredentials } from '@/shared/lib/storeActions';

const labelClasses = tw`mb-1.5 block text-[13px] font-medium text-text2`;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setCredentials({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      toast.success(
        t('auth.welcomeBack', {
          name: data.user.displayName || data.user.username,
        }),
      );
      navigate('/home');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err) || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      headerSlot={<LanguageSwitcher />}
    >
      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label className={labelClasses}>{t('auth.usernameOrEmail')}</label>
          <input
            className='input-field'
            type='text'
            placeholder='your@email.com'
            value={form.usernameOrEmail}
            onChange={(e) =>
              setForm({ ...form, usernameOrEmail: e.target.value })
            }
            required
          />
        </div>
        <div className='mb-6'>
          <label className={labelClasses}>{t('auth.password')}</label>
          <input
            className='input-field'
            type='password'
            placeholder='••••••••'
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button
          type='submit'
          className='btn btn-primary w-full justify-center py-[13px] text-[15px]'
          disabled={loading}
        >
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
      <p className='text-text3 mt-5 text-center text-sm'>
        {t('auth.noAccount')}{' '}
        <Link to='/register' className='text-brand-light font-semibold'>
          {t('auth.signUpFree')}
        </Link>
      </p>
    </AuthLayout>
  );
}
