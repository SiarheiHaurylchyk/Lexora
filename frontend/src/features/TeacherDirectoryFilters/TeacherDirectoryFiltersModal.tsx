import { useTranslation } from 'react-i18next';
import { Modal } from '@ui';

import {
  DEFAULT_TEACHER_DIRECTORY_FILTERS,
  TEACHER_DIRECTORY_LANG_CODES,
  TEACHER_SPECIALTY_IDS,
  type TeacherDirectoryAppliedFilters,
} from '@/shared/lib/teacherDirectory';

interface Props {
  open: boolean;
  onClose: () => void;
  draft: TeacherDirectoryAppliedFilters;
  onDraftChange: (next: TeacherDirectoryAppliedFilters) => void;
  onApply: () => void;
}

const cardClasses = tw`rounded-[14px] border border-border bg-bg3 p-4`;
const cardTitleClasses = tw`mb-1 font-display text-base`;
const cardHintClasses = tw`mb-3 text-xs text-text3`;
const chipBase = tw`btn btn-sm`;
const checkRowClasses = tw`mb-2 flex items-center gap-2 text-sm`;

export function TeacherDirectoryFiltersModal({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
}: Props) {
  const { t } = useTranslation();

  if (!open) return null;

  const set = (patch: Partial<TeacherDirectoryAppliedFilters>) =>
    onDraftChange({ ...draft, ...patch });

  const toggleSpecialty = (id: string) => {
    const has = draft.specialties.includes(id);
    set({
      specialties: has
        ? draft.specialties.filter((x) => x !== id)
        : [...draft.specialties, id],
    });
  };

  const langLabel = (code: string) => t(`languages.${code}`);

  const applyPreset = (min: string, max: string) =>
    set({ minRate: min, maxRate: max });

  return (
    <Modal
      title={t('teachers.directory.filters.title')}
      onClose={onClose}
      extraWide
    >
      <div>
        <p className='text-text2 mb-5 text-sm leading-[1.5]'>
          {t('teachers.directory.filters.lead')}
        </p>

        <div className='grid grid-cols-2 gap-4 max-[720px]:grid-cols-1'>
          <section className={cardClasses}>
            <h3 className={cardTitleClasses}>
              {t('teachers.directory.filters.teachLang')}
            </h3>
            <p className={cardHintClasses}>
              {t('teachers.directory.filters.teachLangHint')}
            </p>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                className={cn(
                  chipBase,
                  !draft.lang ? 'btn-primary' : 'btn-secondary',
                )}
                onClick={() => set({ lang: '' })}
              >
                {t('teachers.directory.allLangs')}
              </button>
              {TEACHER_DIRECTORY_LANG_CODES.map((code) => (
                <button
                  key={code}
                  type='button'
                  className={cn(
                    chipBase,
                    draft.lang === code ? 'btn-primary' : 'btn-secondary',
                  )}
                  onClick={() => set({ lang: code })}
                >
                  {langLabel(code)}
                </button>
              ))}
            </div>
          </section>

          <section className={cardClasses}>
            <h3 className={cardTitleClasses}>
              {t('teachers.directory.filters.alsoSpeaks')}
            </h3>
            <p className={cardHintClasses}>
              {t('teachers.directory.filters.alsoSpeaksHint')}
            </p>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                className={cn(
                  chipBase,
                  !draft.speaks ? 'btn-primary' : 'btn-secondary',
                )}
                onClick={() => set({ speaks: '' })}
              >
                {t('teachers.directory.filters.speaksAny')}
              </button>
              {TEACHER_DIRECTORY_LANG_CODES.map((code) => (
                <button
                  key={code}
                  type='button'
                  className={cn(
                    chipBase,
                    draft.speaks === code ? 'btn-primary' : 'btn-secondary',
                  )}
                  onClick={() => set({ speaks: code })}
                >
                  {langLabel(code)}
                </button>
              ))}
            </div>
          </section>

          <section className={cardClasses}>
            <h3 className={cardTitleClasses}>
              {t('teachers.directory.filters.price')}
            </h3>
            <p className={cardHintClasses}>
              {t('teachers.directory.filters.priceHint')}
            </p>
            <div className='mb-3 flex gap-3'>
              <label className='text-text3 flex-1 text-xs'>
                <span className='mb-1 block'>
                  {t('teachers.directory.filters.min')}
                </span>
                <input
                  type='number'
                  min={0}
                  step={0.5}
                  className='input-field'
                  value={draft.minRate}
                  onChange={(e) => set({ minRate: e.target.value })}
                  placeholder='—'
                />
              </label>
              <label className='text-text3 flex-1 text-xs'>
                <span className='mb-1 block'>
                  {t('teachers.directory.filters.max')}
                </span>
                <input
                  type='number'
                  min={0}
                  step={0.5}
                  className='input-field'
                  value={draft.maxRate}
                  onChange={(e) => set({ maxRate: e.target.value })}
                  placeholder='—'
                />
              </label>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => applyPreset('', '')}
              >
                {t('teachers.directory.filters.presetAny')}
              </button>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => applyPreset('', '15')}
              >
                {t('teachers.directory.filters.presetUnder15')}
              </button>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => applyPreset('15', '30')}
              >
                {t('teachers.directory.filters.preset15_30')}
              </button>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => applyPreset('30', '50')}
              >
                {t('teachers.directory.filters.preset30_50')}
              </button>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => applyPreset('50', '')}
              >
                {t('teachers.directory.filters.preset50plus')}
              </button>
            </div>
          </section>

          <section className={cardClasses}>
            <h3 className={cardTitleClasses}>
              {t('teachers.directory.filters.focus')}
            </h3>
            <p className={cardHintClasses}>
              {t('teachers.directory.filters.focusHint')}
            </p>
            <div className='flex flex-wrap gap-2'>
              {TEACHER_SPECIALTY_IDS.map((id) => (
                <button
                  key={id}
                  type='button'
                  className={cn(
                    chipBase,
                    draft.specialties.includes(id)
                      ? 'btn-primary'
                      : 'btn-secondary',
                  )}
                  onClick={() => toggleSpecialty(id)}
                >
                  {t(`teachers.directory.filters.specialty.${id}`)}
                </button>
              ))}
            </div>
          </section>

          <section className={cn(cardClasses, 'col-span-full')}>
            <h3 className={cardTitleClasses}>
              {t('teachers.directory.filters.presentation')}
            </h3>
            <label className={checkRowClasses}>
              <input
                type='checkbox'
                checked={draft.hasVideo}
                className='accent-brand-light'
                onChange={(e) => set({ hasVideo: e.target.checked })}
              />
              <span>{t('teachers.directory.filters.hasVideo')}</span>
            </label>
            <label className={checkRowClasses}>
              <input
                type='checkbox'
                checked={draft.trialLessonOnly}
                className='accent-brand-light'
                onChange={(e) => set({ trialLessonOnly: e.target.checked })}
              />
              <span>{t('teachers.directory.filters.trialLesson')}</span>
            </label>
          </section>

          <section className={cn(cardClasses, 'col-span-full')}>
            <h3 className={cardTitleClasses}>
              {t('teachers.directory.sortLabel')}
            </h3>
            <select
              className='input-field max-w-[300px]'
              value={draft.sort}
              onChange={(e) =>
                set({
                  sort: e.target
                    .value as TeacherDirectoryAppliedFilters['sort'],
                })
              }
              aria-label={t('teachers.directory.sortLabel')}
            >
              <option value='new'>{t('teachers.directory.sortNew')}</option>
              <option value='rate'>{t('teachers.directory.sortRate')}</option>
              <option value='rate_desc'>
                {t('teachers.directory.sortRateDesc')}
              </option>
            </select>
          </section>
        </div>

        <div className='mt-5 flex justify-between gap-3'>
          <button
            type='button'
            className='btn btn-ghost'
            onClick={() =>
              onDraftChange({ ...DEFAULT_TEACHER_DIRECTORY_FILTERS })
            }
          >
            {t('teachers.directory.filters.resetAll')}
          </button>
          <button type='button' className='btn btn-primary' onClick={onApply}>
            {t('teachers.directory.filters.apply')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
