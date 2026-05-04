import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/authSlice';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LearningLanguageSelect from '../components/LearningLanguageSelect';
import styles from './AuthPages.module.css';

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.langCorner}>
        <LanguageSwitcher />
      </div>
      <div className={styles.bgGlow} />

      <div className={`${styles.inner} animate-scale`}>
        <div className={styles.logoRow}>
          <Link to="/" className={styles.logoLink}>
            <div className={styles.logoMark}>✦</div>
            <span className={styles.brand}>Lexora</span>
          </Link>
        </div>

        <div className={`card ${styles.box}`}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }));
      toast.success(t('auth.welcomeBack', { name: data.user.displayName || data.user.username }));
      navigate('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>{t('auth.usernameOrEmail')}</label>
          <input
            className="input-field"
            type="text"
            placeholder="your@email.com"
            value={form.usernameOrEmail}
            onChange={(e) => setForm({ ...form, usernameOrEmail: e.target.value })}
            required
          />
        </div>
        <div className={styles.fieldLg}>
          <label className={styles.label}>{t('auth.password')}</label>
          <input
            className="input-field"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
      <p className={styles.footer}>
        {t('auth.noAccount')}{' '}
        <Link to="/register" className={styles.footerLink}>{t('auth.signUpFree')}</Link>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    accountType: 'LEARNER' as 'LEARNER' | 'TEACHER',
    learningLanguage: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        learningLanguage:
          form.learningLanguage.trim() || undefined,
      });
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken }));
      toast.success(t('auth.accountCreated'));
      navigate('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={handleSubmit}>
        <div className={styles.accountType}>
          <span className={styles.label}>{t('auth.accountTypeLabel')}</span>
          <div className={styles.accountTypeGrid}>
            <button
              type="button"
              className={`${styles.accountTypeCard} ${form.accountType === 'LEARNER' ? styles.accountTypeCardActive : ''}`}
              onClick={() => setForm({ ...form, accountType: 'LEARNER' })}
              aria-pressed={form.accountType === 'LEARNER'}
            >
              <span className={styles.accountTypeTitle}>{t('auth.accountLearner')}</span>
              <span className={styles.accountTypeHint}>{t('auth.accountLearnerHint')}</span>
            </button>
            <button
              type="button"
              className={`${styles.accountTypeCard} ${form.accountType === 'TEACHER' ? styles.accountTypeCardActive : ''}`}
              onClick={() => setForm({ ...form, accountType: 'TEACHER' })}
              aria-pressed={form.accountType === 'TEACHER'}
            >
              <span className={styles.accountTypeTitle}>{t('auth.accountTeacher')}</span>
              <span className={styles.accountTypeHint}>{t('auth.accountTeacherHint')}</span>
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-learning-lang">
            {t('auth.learningLanguageLabel')}
          </label>
          <LearningLanguageSelect
            id="reg-learning-lang"
            value={form.learningLanguage}
            onChange={(learningLanguage) => setForm({ ...form, learningLanguage })}
            required={form.accountType === 'LEARNER'}
          />
          <p className={styles.fieldHint}>
            {form.accountType === 'LEARNER'
              ? t('auth.learningLanguageHint')
              : t('auth.learningLanguageTeacherHint')}
          </p>
        </div>

        <div className={styles.row2}>
          <div>
            <label className={styles.label}>{t('auth.username')}</label>
            <input
              className="input-field"
              type="text"
              placeholder="coollearner"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              minLength={3}
            />
          </div>
          <div>
            <label className={styles.label}>{t('auth.displayName')}</label>
            <input
              className="input-field"
              type="text"
              placeholder="Alex"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('auth.email')}</label>
          <input
            className="input-field"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className={styles.fieldXl}>
          <label className={styles.label}>{t('auth.passwordReq')}</label>
          <input
            className="input-field"
            type="password"
            placeholder={t('auth.passwordMinPh')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
          {loading ? t('auth.creating') : t('auth.createAccount')}
        </button>
      </form>
      <p className={styles.footer}>
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className={styles.footerLink}>{t('auth.signInLink')}</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
