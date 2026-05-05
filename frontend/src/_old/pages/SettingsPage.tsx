import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUser } from '../store/authSlice';
import VoiceSettings from '../components/VoiceSettings';
import TeacherProfileForm from '../components/teachers/TeacherProfileForm';
import ClassroomRecordingSettings from '../components/settings/ClassroomRecordingSettings';
import AvatarUpload from '../components/AvatarUpload';
import LearningLanguageSelect from '../components/LearningLanguageSelect';
import { userCanTeach } from '../lib/accountRole';
import { GraduationCap } from 'lucide-react';
import styles from './SettingsPage.module.css';

type TabId = 'account' | 'voice' | 'teacher';

/**
 * Settings page — account, voice, and (for teachers) public listing.
 * Weekly availability lives only under /schedule (“My schedule” in the sidebar).
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const canTeach = userCanTeach(user?.role);

  const rawTab = searchParams.get('tab') || 'account';
  const fromUrl: TabId = useMemo(() => {
    const t0 = rawTab === 'availability' ? 'account' : rawTab;
    if (t0 === 'teacher' && !canTeach) return 'account';
    if (t0 === 'account' || t0 === 'voice' || t0 === 'teacher') return t0;
    return 'account';
  }, [rawTab, canTeach]);

  const [tab, setTab] = useState<TabId>(fromUrl);

  useEffect(() => {
    setTab(fromUrl);
  }, [fromUrl]);

  useEffect(() => {
    if (tab !== fromUrl) {
      setSearchParams({ tab }, { replace: true });
    }
  }, [tab, fromUrl, setSearchParams]);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  useEffect(() => setDisplayName(user?.displayName || ''), [user?.displayName]);
  const [savingName, setSavingName] = useState(false);

  const [learningLanguage, setLearningLanguage] = useState(user?.learningLanguage || '');
  useEffect(() => setLearningLanguage(user?.learningLanguage || ''), [user?.learningLanguage]);
  const [savingLang, setSavingLang] = useState(false);

  const [cefrLevel, setCefrLevel] = useState(user?.cefrLevel || '');
  const [goalType, setGoalType] = useState(user?.learningGoalType || '');
  const [goalWeeks, setGoalWeeks] = useState(
    user?.learningGoalWeeks != null ? String(user.learningGoalWeeks) : '',
  );
  const [goalNotes, setGoalNotes] = useState(user?.learningGoalNotes || '');
  const [savingGoals, setSavingGoals] = useState(false);

  useEffect(() => {
    setCefrLevel(user?.cefrLevel || '');
    setGoalType(user?.learningGoalType || '');
    setGoalWeeks(user?.learningGoalWeeks != null ? String(user.learningGoalWeeks) : '');
    setGoalNotes(user?.learningGoalNotes || '');
  }, [user?.cefrLevel, user?.learningGoalType, user?.learningGoalWeeks, user?.learningGoalNotes]);

  if (!user) return null;

  if (rawTab === 'availability' && canTeach) {
    return <Navigate to="/schedule" replace />;
  }

  const saveDisplayName = async () => {
    setSavingName(true);
    try {
      const { data } = await authApi.patchProfile({ displayName });
      dispatch(updateUser(data));
      toast.success(t('settings.account.savedName'));
    } catch {
      toast.error(t('settings.account.saveFailed'));
    } finally {
      setSavingName(false);
    }
  };

  const saveLearningLanguage = async () => {
    setSavingLang(true);
    try {
      const { data } = await authApi.patchProfile({
        learningLanguage: learningLanguage.trim(),
      });
      dispatch(updateUser(data));
      toast.success(t('settings.account.savedLearningLanguage'));
    } catch {
      toast.error(t('settings.account.saveFailed'));
    } finally {
      setSavingLang(false);
    }
  };

  const saveLearningGoals = async () => {
    setSavingGoals(true);
    let weeksPayload: number | undefined;
    if (goalWeeks.trim() !== '') {
      const n = parseInt(goalWeeks.trim(), 10);
      if (Number.isNaN(n)) {
        toast.error(t('settings.account.goalWeeksInvalid'));
        setSavingGoals(false);
        return;
      }
      weeksPayload = n;
    }
    try {
      const { data } = await authApi.patchProfile({
        cefrLevel: cefrLevel.trim(),
        learningGoalType: goalType.trim(),
        ...(weeksPayload !== undefined ? { learningGoalWeeks: weeksPayload } : {}),
        learningGoalNotes: goalNotes.trim(),
      });
      dispatch(updateUser(data));
      toast.success(t('settings.account.savedGoals'));
    } catch {
      toast.error(t('settings.account.saveFailed'));
    } finally {
      setSavingGoals(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'account', label: t('settings.tabs.account') },
    { id: 'voice', label: t('settings.tabs.voice') },
    ...(canTeach ? [{ id: 'teacher' as TabId, label: t('settings.tabs.teacher') }] : []),
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('settings.title')}</h1>
      <p className={styles.subtitle}>{t('settings.subtitle')}</p>

      <div className={styles.tabBar} role="tablist">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            role="tab"
            aria-selected={tab === tabItem.id}
            className={`${styles.tab} ${tab === tabItem.id ? styles.tabActive : ''}`}
            onClick={() => setTab(tabItem.id)}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('settings.account.photoTitle')}</h2>
            <p className={styles.sectionHelp}>{t('settings.account.photoHelp')}</p>
            <AvatarUpload />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('settings.account.displayTitle')}</h2>
            <div className={styles.field}>
              <label className={styles.label}>{t('settings.account.displayLabel')}</label>
              <input
                className="input-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user.username}
              />
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void saveDisplayName()}
                disabled={savingName}
              >
                {savingName ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('settings.account.learningLanguageTitle')}</h2>
            <p className={styles.sectionHelp}>{t('settings.account.learningLanguageHelp')}</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-learning-lang">
                {t('settings.account.learningLanguageLabel')}
              </label>
              <LearningLanguageSelect
                id="settings-learning-lang"
                value={learningLanguage}
                onChange={setLearningLanguage}
              />
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void saveLearningLanguage()}
                disabled={savingLang}
              >
                {savingLang ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('settings.account.goalsTitle')}</h2>
            <p className={styles.sectionHelp}>{t('settings.account.goalsHelp')}</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-cefr">
                {t('settings.account.cefrLabel')}
              </label>
              <input
                id="settings-cefr"
                className="input-field"
                value={cefrLevel}
                onChange={(e) => setCefrLevel(e.target.value)}
                placeholder={t('settings.account.cefrPlaceholder')}
                maxLength={8}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-goal-type">
                {t('settings.account.goalTypeLabel')}
              </label>
              <input
                id="settings-goal-type"
                className="input-field"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                placeholder={t('settings.account.goalTypePlaceholder')}
                maxLength={32}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-goal-weeks">
                {t('settings.account.goalWeeksLabel')}
              </label>
              <input
                id="settings-goal-weeks"
                className="input-field"
                type="number"
                min={1}
                max={520}
                value={goalWeeks}
                onChange={(e) => setGoalWeeks(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="settings-goal-notes">
                {t('settings.account.goalNotesLabel')}
              </label>
              <textarea
                id="settings-goal-notes"
                className="input-field"
                rows={3}
                value={goalNotes}
                onChange={(e) => setGoalNotes(e.target.value)}
                placeholder={t('settings.account.goalNotesPlaceholder')}
              />
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void saveLearningGoals()}
                disabled={savingGoals}
              >
                {savingGoals ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </section>

          <ClassroomRecordingSettings />

          {!canTeach && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('settings.account.becomeTitle')}</h2>
              <p className={styles.sectionHelp}>{t('settings.account.becomeHelp')}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/become-teacher')}
              >
                <span className={styles.inlineIcon} aria-hidden>
                  <GraduationCap size={18} strokeWidth={2.25} />
                </span>{' '}
                {t('userMenu.becomeTeacher')}
              </button>
            </section>
          )}
        </>
      )}

      {tab === 'voice' && (
        <section>
          <VoiceSettings />
        </section>
      )}

      {tab === 'teacher' && canTeach && <TeacherProfileForm />}
    </div>
  );
}
