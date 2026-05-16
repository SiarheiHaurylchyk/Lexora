import { type FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { authApi } from '@/shared/api/api-legacy';
import { updateUser } from '@/shared/lib/storeActions';
import { useAuthStore } from '@/shared/lib/storeHooks';
import type { User } from '@/shared/types';

interface CertDraft {
  title: string;
  issuer: string;
  year: string;
  description: string;
  documentUrl: string;
}

const emptyCert = (): CertDraft => ({
  title: '',
  issuer: '',
  year: '',
  description: '',
  documentUrl: '',
});

const labelClasses = tw`mb-1.5 mt-3 block text-[13px] font-medium text-text2`;
const sectionTitleClasses = tw`mt-7 mb-1 font-display text-lg`;
const helpClasses = tw`mb-3 text-[13px] text-text3`;
const checkRowClasses = tw`mt-3 flex items-center gap-2 text-sm`;

/** Stable key when server-side teacher fields change (remount form drafts). */
function teacherProfileRemoteKey(user: User): string {
  return JSON.stringify({
    id: user.id,
    teacherHeadline: user.teacherHeadline ?? '',
    teacherBio: user.teacherBio ?? '',
    teacherResume: user.teacherResume ?? '',
    teacherIntroVideoUrl: user.teacherIntroVideoUrl ?? '',
    hourlyRate: user.hourlyRate ?? null,
    teachesLanguages: user.teachesLanguages ?? '',
    showInTeacherDirectory: user.showInTeacherDirectory ?? null,
    teacherCancellationPolicy: user.teacherCancellationPolicy ?? '',
    teacherPaymentInfo: user.teacherPaymentInfo ?? '',
    offersTrialLesson: user.offersTrialLesson ?? null,
    teacherCertificates: user.teacherCertificates ?? [],
  });
}

function certsFromUser(user: User): CertDraft[] {
  const loaded = user.teacherCertificates;
  if (loaded && loaded.length > 0) {
    return loaded.map((c) => ({
      title: c.title ?? '',
      issuer: c.issuer ?? '',
      year: c.year ?? '',
      description: c.description ?? '',
      documentUrl: c.documentUrl ?? '',
    }));
  }
  return [emptyCert()];
}

function TeacherProfileFormInner({ user }: { user: User }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState(() => user.teacherHeadline ?? '');
  const [bio, setBio] = useState(() => user.teacherBio ?? '');
  const [resume, setResume] = useState(() => user.teacherResume ?? '');
  const [videoUrl, setVideoUrl] = useState(
    () => user.teacherIntroVideoUrl ?? '',
  );
  const [rate, setRate] = useState(() =>
    user.hourlyRate != null ? String(user.hourlyRate) : '',
  );
  const [langs, setLangs] = useState(() => user.teachesLanguages ?? '');
  const [visible, setVisible] = useState(
    () => user.showInTeacherDirectory !== false,
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    () => user.teacherCancellationPolicy ?? '',
  );
  const [paymentInfo, setPaymentInfo] = useState(
    () => user.teacherPaymentInfo ?? '',
  );
  const [offersTrial, setOffersTrial] = useState(
    () => user.offersTrialLesson === true,
  );
  const [certs, setCerts] = useState<CertDraft[]>(() => certsFromUser(user));

  const updateCert = (index: number, patch: Partial<CertDraft>) => {
    setCerts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addCertRow = () => setCerts((prev) => [...prev, emptyCert()]);
  const removeCertRow = (index: number) =>
    setCerts((prev) =>
      prev.length <= 1 ? [emptyCert()] : prev.filter((_, i) => i !== index),
    );

  const handleSave = async (e: FormEvent) => {
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
      updateUser(data);
      toast.success(t('teachers.profileForm.saved'));
    } catch {
      toast.error(t('teachers.profileForm.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className='border-border bg-surface rounded-[20px] border p-6'
      onSubmit={(e) => void handleSave(e)}
    >
      <h2 className='font-display m-0 mb-2 text-xl'>
        {t('teachers.profileForm.title')}
      </h2>
      <p className='text-text2 mb-4 text-sm'>
        {t('teachers.profileForm.subtitle')}
      </p>

      <label className={labelClasses}>
        {t('teachers.profileForm.headline')}
      </label>
      <input
        className='input-field'
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder={t('teachers.profileForm.headlinePh')}
      />

      <label className={labelClasses}>{t('teachers.profileForm.bio')}</label>
      <textarea
        className='input-field min-h-[80px] resize-y'
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder={t('teachers.profileForm.bioPh')}
        rows={4}
      />

      <label className={labelClasses}>{t('teachers.profileForm.resume')}</label>
      <textarea
        className='input-field min-h-[100px] resize-y'
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        placeholder={t('teachers.profileForm.resumePh')}
        rows={5}
      />

      <h3 className={sectionTitleClasses}>
        {t('teachers.profileForm.certificatesTitle')}
      </h3>
      <p className={helpClasses}>
        {t('teachers.profileForm.certificatesHelp')}
      </p>

      {certs.map((row, index) => (
        <div
          key={index}
          className='border-border bg-bg3 mb-3 rounded-[14px] border p-4'
        >
          <div className='mb-2 flex items-center justify-between gap-2'>
            <span className='text-text2 text-sm font-semibold'>
              {t('teachers.profileForm.certificate')} {index + 1}
            </span>
            <button
              type='button'
              className='text-danger cursor-pointer border-0 bg-transparent text-xs hover:underline'
              onClick={() => removeCertRow(index)}
            >
              {t('teachers.profileForm.removeCert')}
            </button>
          </div>
          <label className={labelClasses}>
            {t('teachers.profileForm.certTitle')}
          </label>
          <input
            className='input-field'
            value={row.title}
            onChange={(e) => updateCert(index, { title: e.target.value })}
            placeholder={t('teachers.profileForm.certTitlePh')}
          />
          <label className={labelClasses}>
            {t('teachers.profileForm.certIssuer')}
          </label>
          <input
            className='input-field'
            value={row.issuer}
            onChange={(e) => updateCert(index, { issuer: e.target.value })}
          />
          <label className={labelClasses}>
            {t('teachers.profileForm.certYear')}
          </label>
          <input
            className='input-field'
            value={row.year}
            onChange={(e) => updateCert(index, { year: e.target.value })}
            placeholder='2024'
          />
          <label className={labelClasses}>
            {t('teachers.profileForm.certDesc')}
          </label>
          <textarea
            className='input-field min-h-[60px] resize-y'
            value={row.description}
            onChange={(e) => updateCert(index, { description: e.target.value })}
            rows={3}
          />
          <label className={labelClasses}>
            {t('teachers.profileForm.certUrl')}
          </label>
          <input
            className='input-field'
            value={row.documentUrl}
            onChange={(e) => updateCert(index, { documentUrl: e.target.value })}
            placeholder={t('teachers.profileForm.certUrlPh')}
          />
        </div>
      ))}

      <button
        type='button'
        className='btn btn-secondary btn-sm mt-1 mb-3'
        onClick={addCertRow}
      >
        {t('teachers.profileForm.addCert')}
      </button>

      <label className={labelClasses}>{t('teachers.profileForm.video')}</label>
      <input
        className='input-field'
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder={t('teachers.profileForm.videoPh')}
      />

      <label className={labelClasses}>{t('teachers.profileForm.rate')}</label>
      <input
        className='input-field'
        type='number'
        min={0}
        step={0.5}
        value={rate}
        onChange={(e) => setRate(e.target.value)}
      />

      <label className={labelClasses}>
        {t('teachers.profileForm.languages')}
      </label>
      <input
        className='input-field'
        value={langs}
        onChange={(e) => setLangs(e.target.value)}
        placeholder={t('teachers.profileForm.languagesPh')}
      />

      <h3 className={sectionTitleClasses}>
        {t('teachers.profileForm.bookingSectionTitle')}
      </h3>
      <p className={helpClasses}>
        {t('teachers.profileForm.bookingSectionHelp')}
      </p>

      <label className={labelClasses}>
        {t('teachers.profileForm.cancellationPolicy')}
      </label>
      <textarea
        className='input-field min-h-[60px] resize-y'
        value={cancellationPolicy}
        onChange={(e) => setCancellationPolicy(e.target.value)}
        placeholder={t('teachers.profileForm.cancellationPolicyPh')}
        rows={3}
      />

      <label className={labelClasses}>
        {t('teachers.profileForm.paymentInfo')}
      </label>
      <textarea
        className='input-field min-h-[60px] resize-y'
        value={paymentInfo}
        onChange={(e) => setPaymentInfo(e.target.value)}
        placeholder={t('teachers.profileForm.paymentInfoPh')}
        rows={3}
      />

      <label className={checkRowClasses}>
        <input
          type='checkbox'
          className='accent-brand-light'
          checked={offersTrial}
          onChange={(e) => setOffersTrial(e.target.checked)}
        />
        <span>{t('teachers.profileForm.offersTrial')}</span>
      </label>

      <label className={checkRowClasses}>
        <input
          type='checkbox'
          className='accent-brand-light'
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        <span>{t('teachers.profileForm.visible')}</span>
      </label>

      <div className='mt-5'>
        <button type='submit' className='btn btn-primary' disabled={saving}>
          {saving ? t('common.loading') : t('teachers.profileForm.save')}
        </button>
      </div>
    </form>
  );
}

export function TeacherProfileForm() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return (
    <TeacherProfileFormInner key={teacherProfileRemoteKey(user)} user={user} />
  );
}
