import { type FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui';
import { Heart } from 'lucide-react';

import {
  AvailabilityViewer,
  type AvailabilityViewerHandle,
} from '@/widgets/AvailabilityViewer';

import { favoritesApi, studentsApi, teachersApi } from '@/shared/api/api-legacy';
import type { TeacherDetail } from '@/shared/api/types';
import { useApiQuery } from '@/shared/lib/query';
import { useAppSelector } from '@/shared/lib/storeHooks';
import { getYouTubeEmbedUrl } from '@/shared/lib/youtube';

type ProfileTab = 'about' | 'resume' | 'certs';

const contentCardClasses = tw`rounded-[20px] border border-border bg-surface p-6`;
const sectionTitleClasses = tw`mb-4 font-display text-lg`;
const tabBaseClasses = tw`cursor-pointer rounded-[10px] border-0 bg-transparent px-3.5 py-2 font-inherit text-[13px] font-medium text-text2`;
const tabActiveClasses = tw`bg-bg3 text-text shadow-[0_0_0_1px_var(--color-border2)]`;
const starBtnBase = tw`cursor-pointer border-0 bg-transparent text-2xl text-text3`;

function normalizeTeacherDetail(raw: TeacherDetail): TeacherDetail {
  return {
    ...raw,
    certificates: raw.certificates ?? [],
    recentReviews: raw.recentReviews ?? [],
    reviewCount: raw.reviewCount ?? 0,
    conductedSessionsCount: raw.conductedSessionsCount ?? 0,
    offersTrialLesson: raw.offersTrialLesson ?? false,
    favoritedByMe: raw.favoritedByMe ?? false,
  };
}

export function TeacherDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const queryClient = useQueryClient();
  const [profileTab, setProfileTab] = useState<ProfileTab>('about');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const availabilityAnchorRef = useRef<HTMLDivElement>(null);
  const availabilityViewerRef = useRef<AvailabilityViewerHandle>(null);

  const teacherId = Number(id);
  const teacherQuery = useApiQuery<TeacherDetail>({
    queryKey: ['teacher', teacherId],
    url: `/teachers/${teacherId}`,
    enabled: Number.isFinite(teacherId),
    select: (data) => normalizeTeacherDetail(data),
  });
  const teacher = teacherQuery.data ?? null;
  const loading = teacherQuery.isLoading;

  const reloadTeacher = () =>
    queryClient.invalidateQueries({ queryKey: ['teacher', teacherId] });

  useEffect(() => {
    if (teacherQuery.isError) {
      toast.error(t('teachers.detail.notFound'));
      navigate('/teachers');
    }
  }, [teacherQuery.isError, navigate, t]);

  useEffect(() => {
    if (!teacher) return;
    const vr = teacher.viewerReview;
    if (vr) {
      setReviewRating(vr.rating);
      setReviewComment(vr.comment ?? '');
    } else {
      setReviewRating(5);
      setReviewComment('');
    }
  }, [teacher]);

  const scrollToAvailability = () => {
    availabilityAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  if (loading) {
    return (
      <div className='box-border w-full py-10'>
        <div className='grid grid-cols-[minmax(0,1fr)_minmax(280px,380px)] items-start gap-8'>
          <div className='flex min-w-0 flex-col gap-6'>
            <div className='skeleton h-[200px] rounded-[16px]' />
            <div className='skeleton h-[280px] rounded-[16px]' />
          </div>
          <div className='min-w-0'>
            <div className='sticky top-5 flex flex-col gap-4'>
              <div className='skeleton h-[220px] rounded-[16px]' />
              <div className='skeleton h-[160px] rounded-[16px]' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) return null;

  const embed = teacher.introVideoUrl
    ? getYouTubeEmbedUrl(teacher.introVideoUrl)
    : null;
  const headline =
    teacher.headline?.trim() || t('teachers.card.defaultHeadline');
  const langs = teacher.languages ?? [];

  const rateLabel =
    teacher.hourlyRate != null && teacher.hourlyRate > 0
      ? t('teachers.detail.rateHighlight', {
          amount: teacher.hourlyRate.toFixed(2),
        })
      : t('teachers.card.rateAsk');

  const isSelf = user?.id === teacher.id;
  const ratingDisplay =
    teacher.averageRating != null ? teacher.averageRating.toFixed(1) : '—';

  const openChatWithTeacher = async () => {
    if (!isAuthenticated) {
      toast.error(t('chat.loginRequired'));
      navigate('/login');
      return;
    }
    if (isSelf) return;
    try {
      await studentsApi.connectTeacher(teacher.id);
    } catch {
      // Link may already exist.
    }
    navigate(`/messages/${teacher.id}`);
  };

  const primaryScheduleLabel = isSelf
    ? t('teachers.detail.jumpToSchedule')
    : t('teachers.detail.bookLesson');

  const toggleFavorite = async () => {
    if (!isAuthenticated || isSelf || !teacher) return;
    setFavoriteBusy(true);
    try {
      if (teacher.favoritedByMe) await favoritesApi.remove(teacher.id);
      else await favoritesApi.add(teacher.id);
      await reloadTeacher();
    } catch {
      toast.error(t('teachers.detail.favoriteFailed'));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || isSelf) return;
    setSubmittingReview(true);
    try {
      await teachersApi.postReview(teacher.id, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      toast.success(t('teachers.detail.reviewSaved'));
      await reloadTeacher();
    } catch {
      toast.error(t('teachers.detail.reviewFailed'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'about', label: t('teachers.detail.tabAbout') },
    { id: 'resume', label: t('teachers.detail.tabResume') },
    { id: 'certs', label: t('teachers.detail.tabCertificates') },
  ];

  const renderTabBody = () => {
    if (profileTab === 'about') {
      if (teacher.bio?.trim()) {
        return (
          <p className='text-text m-0 leading-[1.6] whitespace-pre-wrap'>
            {teacher.bio}
          </p>
        );
      }
      return (
        <p className='text-text3 m-0 text-sm'>
          {t('teachers.detail.emptyAbout')}
        </p>
      );
    }
    if (profileTab === 'resume') {
      if (teacher.resume?.trim()) {
        return (
          <p className='text-text m-0 leading-[1.6] whitespace-pre-wrap'>
            {teacher.resume}
          </p>
        );
      }
      return (
        <p className='text-text3 m-0 text-sm'>
          {t('teachers.detail.emptyResume')}
        </p>
      );
    }
    const certs = teacher.certificates;
    if (!certs.length) {
      return (
        <p className='text-text3 m-0 text-sm'>
          {t('teachers.detail.emptyCertificates')}
        </p>
      );
    }
    return (
      <ul className='m-0 flex list-none flex-col gap-3 p-0'>
        {certs.map((c) => (
          <li
            key={c.id}
            className='border-border bg-bg3 rounded-[12px] border px-4 py-3'
          >
            <div className='font-semibold'>{c.title}</div>
            {(c.issuer || c.year) && (
              <div className='text-text3 mt-0.5 text-xs'>
                {[c.issuer, c.year].filter(Boolean).join(' · ')}
              </div>
            )}
            {c.description?.trim() && (
              <p className='text-text2 mt-2 text-sm'>{c.description}</p>
            )}
            {c.documentUrl?.trim() && (
              <a
                className='text-brand-light mt-2 inline-block text-sm underline'
                href={c.documentUrl.trim()}
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('teachers.detail.certificateLink')}
              </a>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className='box-border w-full py-10'>
      <Button
        variant='ghost'
        onClick={() => navigate('/teachers')}
        className='mb-6'
      >
        {t('common.back')}
      </Button>

      <div className='grid grid-cols-[minmax(0,1fr)_minmax(280px,380px)] items-start gap-8 max-[900px]:grid-cols-1'>
        <div className='flex min-w-0 flex-col gap-6'>
          <div className='border-border bg-surface rounded-[20px] border p-6'>
            <div className='flex items-start gap-5'>
              {teacher.avatarUrl ? (
                <img
                  src={teacher.avatarUrl}
                  alt=''
                  className='border-border2 h-24 w-24 shrink-0 rounded-full border-[3px] object-cover'
                />
              ) : (
                <div className='border-border2 from-brand to-accent font-display flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] bg-gradient-to-br text-[40px] font-extrabold text-white'>
                  {(teacher.displayName || teacher.username)[0].toUpperCase()}
                </div>
              )}
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <h1 className='font-display m-0 mb-1.5 text-[clamp(26px,4vw,34px)] tracking-[-0.02em]'>
                    {teacher.displayName}
                  </h1>
                  {teacher.offersTrialLesson && (
                    <span className='badge badge-brand'>
                      {t('teachers.detail.trialBadge')}
                    </span>
                  )}
                  {!isSelf && isAuthenticated && (
                    <button
                      type='button'
                      className='btn btn-ghost btn-sm'
                      onClick={() => void toggleFavorite()}
                      disabled={favoriteBusy}
                      aria-pressed={teacher.favoritedByMe === true}
                      aria-label={t('teachers.detail.favoriteAria')}
                    >
                      <Heart
                        size={18}
                        strokeWidth={2.25}
                        fill={teacher.favoritedByMe ? 'currentColor' : 'none'}
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
                <div className='text-accent mb-3.5 text-[15px] font-semibold'>
                  {headline}
                </div>
              </div>
            </div>

            <div className='border-border mt-5 grid grid-cols-5 gap-3 border-t pt-5 max-[900px]:grid-cols-3 max-[520px]:grid-cols-2'>
              <Stat
                value={
                  <>
                    {ratingDisplay}
                    {teacher.averageRating != null && (
                      <span className='text-[#fbbf24]' aria-hidden>
                        {' '}
                        ★
                      </span>
                    )}
                  </>
                }
                label={t('teachers.detail.statRating')}
                sub={t('teachers.detail.statReviewsCount', {
                  count: teacher.reviewCount,
                })}
              />
              <Stat
                value={teacher.studentCount}
                label={t('teachers.detail.statStudents')}
              />
              <Stat
                value={teacher.conductedSessionsCount}
                label={t('teachers.detail.statConducted')}
              />
              <Stat
                value={teacher.lessonCount}
                label={t('teachers.detail.statLessons')}
              />
              <Stat
                value={teacher.publicDeckCount}
                label={t('teachers.detail.statDecks')}
              />
            </div>

            {langs.length > 0 && (
              <div className='border-border mt-5 border-t pt-4'>
                <p className='text-text3 m-0 mb-1 text-xs tracking-[0.06em] uppercase'>
                  {t('teachers.detail.teaches')}
                </p>
                <p className='m-0 text-[15px]'>
                  {langs
                    .map((code) =>
                      t(`languages.${code}`, { defaultValue: code }),
                    )
                    .join(' · ')}
                </p>
              </div>
            )}
          </div>

          <section className={contentCardClasses}>
            <div
              className='border-border bg-surface mb-4 flex gap-1.5 overflow-x-auto rounded-[14px] border p-1'
              role='tablist'
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  aria-selected={profileTab === tab.id}
                  className={cn(
                    tabBaseClasses,
                    profileTab === tab.id && tabActiveClasses,
                  )}
                  onClick={() => setProfileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div role='tabpanel'>{renderTabBody()}</div>
          </section>

          {!isSelf && isAuthenticated && (
            <section className={contentCardClasses}>
              <h2 className={sectionTitleClasses}>
                {t('teachers.detail.yourReview')}
              </h2>
              <form onSubmit={(e) => void submitReview(e)}>
                <p className='text-text2 mb-3 text-sm'>
                  {t('teachers.detail.reviewLead')}
                </p>
                <div
                  className='mb-3 flex gap-1'
                  aria-label={t('teachers.detail.ratingLabel')}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type='button'
                      className={cn(
                        starBtnBase,
                        n <= reviewRating && '!text-[#fbbf24]',
                      )}
                      onClick={() => setReviewRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <label
                  className='text-text2 mb-1.5 block text-[13px]'
                  htmlFor='teacher-review-comment'
                >
                  {t('teachers.detail.reviewComment')}
                </label>
                <textarea
                  id='teacher-review-comment'
                  className='input-field mb-3'
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t('teachers.detail.reviewPlaceholder')}
                />
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={submittingReview}
                >
                  {submittingReview
                    ? t('common.loading')
                    : t('teachers.detail.reviewSubmit')}
                </button>
              </form>
            </section>
          )}

          {!isSelf && !isAuthenticated && (
            <p className='text-text3 text-center text-sm'>
              {t('teachers.detail.reviewLoginHint')}
            </p>
          )}

          {teacher.recentReviews.length > 0 && (
            <section className={contentCardClasses}>
              <h2 className={sectionTitleClasses}>
                {t('teachers.detail.reviewsTitle')}
              </h2>
              <ul className='m-0 flex list-none flex-col gap-3 p-0'>
                {teacher.recentReviews.map((r) => (
                  <li
                    key={r.id}
                    className='border-border bg-bg3 rounded-[12px] border p-3.5'
                  >
                    <div className='mb-2 flex items-center gap-3'>
                      {r.authorAvatarUrl ? (
                        <img
                          src={r.authorAvatarUrl}
                          alt=''
                          className='h-9 w-9 rounded-full object-cover'
                        />
                      ) : (
                        <div className='from-brand to-accent flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white'>
                          {r.authorDisplayName[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <div className='text-sm font-semibold'>
                          {r.authorDisplayName}
                        </div>
                        <div className='text-xs text-[#fbbf24]'>
                          ★ {r.rating}/5
                        </div>
                      </div>
                    </div>
                    {r.comment?.trim() && (
                      <p className='text-text2 m-0 text-sm leading-[1.5] whitespace-pre-wrap'>
                        {r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div ref={availabilityAnchorRef} id='teacher-availability'>
            <AvailabilityViewer
              ref={availabilityViewerRef}
              teacherId={teacher.id}
              isAuthenticated={isAuthenticated}
              isSelf={isSelf}
              flushTop
            />
          </div>

          {teacher.sampleDecks.length > 0 && (
            <section className={contentCardClasses}>
              <h2 className={sectionTitleClasses}>
                {t('teachers.detail.publicDecks')}
              </h2>
              <div className='grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3'>
                {teacher.sampleDecks.map((d) => (
                  <button
                    key={d.id}
                    type='button'
                    className='border-border bg-bg3 hover:border-border2 cursor-pointer rounded-[14px] border p-4 text-left transition-colors duration-200'
                    onClick={() => navigate(`/decks/${d.id}`)}
                  >
                    <div className='mb-1 text-2xl'>{d.emoji || '📚'}</div>
                    <div className='text-sm font-semibold'>{d.title}</div>
                    <div className='text-text3 mt-1 text-xs'>
                      {d.sourceLanguage} → {d.targetLanguage} · {d.cardCount}{' '}
                      {t('common.cards')}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside
          className='min-w-0'
          aria-label={t('teachers.detail.sidebarAria')}
        >
          <div className='sticky top-5 flex flex-col gap-4'>
            <div className='border-border bg-bg3 aspect-video overflow-hidden rounded-[20px] border [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0'>
              {embed ? (
                <iframe
                  title={t('teachers.detail.videoTitle')}
                  src={embed}
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  allowFullScreen
                />
              ) : (
                <div className='text-text3 flex h-full items-center justify-center text-sm'>
                  {t('teachers.detail.noVideo')}
                </div>
              )}
            </div>

            <div className='border-border bg-surface rounded-[20px] border p-5'>
              <div className='mb-3 flex items-baseline justify-between gap-3'>
                <span className='text-text3 text-[13px]'>
                  {t('teachers.detail.lessonsAndRate')}
                </span>
                <span className='font-display text-xl font-bold'>
                  {rateLabel}
                </span>
              </div>

              {!isSelf &&
                (teacher.cancellationPolicy?.trim() ||
                  teacher.paymentInfo?.trim()) && (
                  <div className='text-text2 mb-3 text-[13px] leading-[1.5]'>
                    {teacher.cancellationPolicy?.trim() && (
                      <p className='m-0 mb-2'>
                        <strong>
                          {t('teachers.detail.cancellationHeading')}
                        </strong>
                        <br />
                        {teacher.cancellationPolicy.trim()}
                      </p>
                    )}
                    {teacher.paymentInfo?.trim() && (
                      <p className='m-0'>
                        <strong>{t('teachers.detail.paymentHeading')}</strong>
                        <br />
                        {teacher.paymentInfo.trim()}
                      </p>
                    )}
                  </div>
                )}

              <div className='mb-3 flex flex-col gap-2'>
                <button
                  type='button'
                  className='btn btn-primary justify-center'
                  onClick={() => {
                    if (isSelf) scrollToAvailability();
                    else availabilityViewerRef.current?.openModal();
                  }}
                >
                  {primaryScheduleLabel}
                </button>
                {!isSelf && (
                  <button
                    type='button'
                    className='btn btn-secondary justify-center'
                    onClick={() => void openChatWithTeacher()}
                  >
                    {t('teachers.detail.contactTeacher')}
                  </button>
                )}
              </div>

              <p className='text-text3 m-0 mb-3 text-xs leading-[1.5]'>
                {isSelf
                  ? t('teachers.detail.sidebarHintSelf')
                  : t('teachers.detail.sidebarHint')}
              </p>

              <div className='flex flex-wrap gap-3'>
                <button
                  type='button'
                  className='text-text3 cursor-pointer border-0 bg-transparent text-xs underline'
                  onClick={() => navigate('/classes')}
                >
                  {t('teachers.detail.goMyTeachers')}
                </button>
                <button
                  type='button'
                  className='text-text3 cursor-pointer border-0 bg-transparent text-xs underline'
                  onClick={() => navigate('/explore')}
                >
                  {t('teachers.directory.browseDecks')}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface StatProps {
  value: React.ReactNode;
  label: string;
  sub?: string;
}

function Stat({ value, label, sub }: StatProps) {
  return (
    <div className='text-center'>
      <div className='font-display text-xl leading-[1.1] font-bold'>
        {value}
      </div>
      <div className='text-text3 mt-1 text-xs tracking-[0.05em] uppercase'>
        {label}
      </div>
      {sub && <div className='text-text3 mt-0.5 text-[11px]'>{sub}</div>}
    </div>
  );
}
