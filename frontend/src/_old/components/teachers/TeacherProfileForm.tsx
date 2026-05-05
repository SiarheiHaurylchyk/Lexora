import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateUser } from '../../store/authSlice';
import styles from './TeacherProfileForm.module.css';

type CertDraft = {
  title: string;
  issuer: string;
  year: string;
  description: string;
  documentUrl: string;
};

const emptyCert = (): CertDraft => ({
  title: '',
  issuer: '',
  year: '',
  description: '',
  documentUrl: '',
});

/**
 * Lets teacher accounts edit directory fields (headline, bio, intro video, rate, languages),
 * extended résumé tab text, and certificate rows with optional document links.
 */
export default function TeacherProfileForm() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [resume, setResume] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [rate, setRate] = useState('');
  const [langs, setLangs] = useState('');
  const [visible, setVisible] = useState(true);
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [offersTrial, setOffersTrial] = useState(false);
  const [certs, setCerts] = useState<CertDraft[]>([emptyCert()]);

  useEffect(() => {
    if (!user) return;
    setHeadline(user.teacherHeadline ?? '');
    setBio(user.teacherBio ?? '');
    setResume(user.teacherResume ?? '');
    setVideoUrl(user.teacherIntroVideoUrl ?? '');
    setRate(user.hourlyRate != null ? String(user.hourlyRate) : '');
    setLangs(user.teachesLanguages ?? '');
    setVisible(user.showInTeacherDirectory !== false);
    setCancellationPolicy(user.teacherCancellationPolicy ?? '');
    setPaymentInfo(user.teacherPaymentInfo ?? '');
    setOffersTrial(user.offersTrialLesson === true);
    const loaded = user.teacherCertificates;
    if (loaded && loaded.length > 0) {
      setCerts(
        loaded.map((c) => ({
          title: c.title ?? '',
          issuer: c.issuer ?? '',
          year: c.year ?? '',
          description: c.description ?? '',
          documentUrl: c.documentUrl ?? '',
        })),
      );
    } else {
      setCerts([emptyCert()]);
    }
  }, [user]);

  if (!user) return null;

  const updateCert = (index: number, patch: Partial<CertDraft>) => {
    setCerts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addCertRow = () => setCerts((prev) => [...prev, emptyCert()]);
  const removeCertRow = (index: number) =>
    setCerts((prev) => (prev.length <= 1 ? [emptyCert()] : prev.filter((_, i) => i !== index)));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        teacherHeadline: headline.trim(),
        teacherBio: bio.trim(),
        teacherResume: resume.trim(),
        teacherIntroVideoUrl: videoUrl.trim(),
        teachesLanguages: langs.trim(),
        showInTeacherDirectory: visible,
        teacherCancellationPolicy: cancellationPolicy.trim(),
        teacherPaymentInfo: paymentInfo.trim(),
        offersTrialLesson: offersTrial,
        teacherCertificates: certs
          .map((c) => ({
            title: c.title.trim(),
            issuer: c.issuer.trim() || undefined,
            year: c.year.trim() || undefined,
            description: c.description.trim() || undefined,
            documentUrl: c.documentUrl.trim() || undefined,
          }))
          .filter((c) => c.title.length > 0),
      };
      if (rate.trim() === '') {
        payload.hourlyRate = 0;
      } else {
        const rateNum = parseFloat(rate.replace(',', '.'));
        if (!Number.isNaN(rateNum)) payload.hourlyRate = rateNum;
      }
      const { data } = await authApi.patchProfile(payload);
      dispatch(updateUser(data));
      toast.success(t('teachers.profileForm.saved'));
    } catch {
      toast.error(t('teachers.profileForm.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.wrap} onSubmit={(e) => void handleSave(e)}>
      <h2 className={styles.title}>{t('teachers.profileForm.title')}</h2>
      <p className={styles.sub}>{t('teachers.profileForm.subtitle')}</p>

      <label className={styles.label}>{t('teachers.profileForm.headline')}</label>
      <input
        className={`input-field ${styles.input}`}
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder={t('teachers.profileForm.headlinePh')}
      />

      <label className={styles.label}>{t('teachers.profileForm.bio')}</label>
      <textarea
        className={`input-field ${styles.textarea}`}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder={t('teachers.profileForm.bioPh')}
        rows={4}
      />

      <label className={styles.label}>{t('teachers.profileForm.resume')}</label>
      <textarea
        className={`input-field ${styles.textarea}`}
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        placeholder={t('teachers.profileForm.resumePh')}
        rows={5}
      />

      <h3 className={styles.certSectionTitle}>{t('teachers.profileForm.certificatesTitle')}</h3>
      <p className={styles.certHelp}>{t('teachers.profileForm.certificatesHelp')}</p>

      {certs.map((row, index) => (
        <div key={index} className={styles.certCard}>
          <div className={styles.certCardHead}>
            <span className={styles.certCardLabel}>
              {t('teachers.profileForm.certificate')} {index + 1}
            </span>
            <button type="button" className={styles.certRemove} onClick={() => removeCertRow(index)}>
              {t('teachers.profileForm.removeCert')}
            </button>
          </div>
          <label className={styles.label}>{t('teachers.profileForm.certTitle')}</label>
          <input
            className={`input-field ${styles.input}`}
            value={row.title}
            onChange={(e) => updateCert(index, { title: e.target.value })}
            placeholder={t('teachers.profileForm.certTitlePh')}
          />
          <label className={styles.label}>{t('teachers.profileForm.certIssuer')}</label>
          <input
            className={`input-field ${styles.input}`}
            value={row.issuer}
            onChange={(e) => updateCert(index, { issuer: e.target.value })}
          />
          <label className={styles.label}>{t('teachers.profileForm.certYear')}</label>
          <input
            className={`input-field ${styles.input}`}
            value={row.year}
            onChange={(e) => updateCert(index, { year: e.target.value })}
            placeholder="2024"
          />
          <label className={styles.label}>{t('teachers.profileForm.certDesc')}</label>
          <textarea
            className={`input-field ${styles.textarea}`}
            value={row.description}
            onChange={(e) => updateCert(index, { description: e.target.value })}
            rows={3}
          />
          <label className={styles.label}>{t('teachers.profileForm.certUrl')}</label>
          <input
            className={`input-field ${styles.input}`}
            value={row.documentUrl}
            onChange={(e) => updateCert(index, { documentUrl: e.target.value })}
            placeholder={t('teachers.profileForm.certUrlPh')}
          />
        </div>
      ))}

      <button type="button" className={`btn btn-secondary btn-sm ${styles.addCert}`} onClick={addCertRow}>
        {t('teachers.profileForm.addCert')}
      </button>

      <label className={styles.label}>{t('teachers.profileForm.video')}</label>
      <input
        className={`input-field ${styles.input}`}
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder={t('teachers.profileForm.videoPh')}
      />

      <label className={styles.label}>{t('teachers.profileForm.rate')}</label>
      <input
        className={`input-field ${styles.input}`}
        type="number"
        min={0}
        step={0.5}
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />

      <label className={styles.label}>{t('teachers.profileForm.languages')}</label>
      <input
        className={`input-field ${styles.input}`}
        value={langs}
        onChange={(e) => setLangs(e.target.value)}
        placeholder={t('teachers.profileForm.languagesPh')}
      />

      <h3 className={styles.certSectionTitle}>{t('teachers.profileForm.bookingSectionTitle')}</h3>
      <p className={styles.certHelp}>{t('teachers.profileForm.bookingSectionHelp')}</p>

      <label className={styles.label}>{t('teachers.profileForm.cancellationPolicy')}</label>
      <textarea
        className={`input-field ${styles.textarea}`}
        value={cancellationPolicy}
        onChange={(e) => setCancellationPolicy(e.target.value)}
        placeholder={t('teachers.profileForm.cancellationPolicyPh')}
        rows={3}
      />

      <label className={styles.label}>{t('teachers.profileForm.paymentInfo')}</label>
      <textarea
        className={`input-field ${styles.textarea}`}
        value={paymentInfo}
        onChange={(e) => setPaymentInfo(e.target.value)}
        placeholder={t('teachers.profileForm.paymentInfoPh')}
        rows={3}
      />

      <label className={styles.checkRow}>
        <input type="checkbox" checked={offersTrial} onChange={(e) => setOffersTrial(e.target.checked)} />
        <span>{t('teachers.profileForm.offersTrial')}</span>
      </label>

      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        <span>{t('teachers.profileForm.visible')}</span>
      </label>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? t('common.loading') : t('teachers.profileForm.save')}
      </button>
    </form>
  );
}
