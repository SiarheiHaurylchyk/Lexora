import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { favoritesApi, studentsApi, teachersApi } from '../services/api';
import type { TeacherDetail } from '../services/types';
import { Button } from '../components/ui';
import { getYouTubeEmbedUrl } from '../lib/youtube';
import AvailabilityViewer, { type AvailabilityViewerHandle } from '../components/teachers/AvailabilityViewer';
import { useAppSelector } from '../store/hooks';
import styles from './TeacherDetailPage.module.css';

type ProfileTab = 'about' | 'resume' | 'certs';

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

/**
 * Teacher profile — two columns on desktop:
 *   left: bio tabs, availability, sample decks;
 *   right: sticky intro video + rate + primary actions (like marketplace tutor pages).
 */
export default function TeacherDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileTab, setProfileTab] = useState<ProfileTab>('about');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const availabilityAnchorRef = useRef<HTMLDivElement>(null);
  const availabilityViewerRef = useRef<AvailabilityViewerHandle>(null);

  const reloadTeacher = async () => {
    const { data } = await teachersApi.getTeacher(Number(id));
    setTeacher(normalizeTeacherDetail(data));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await teachersApi.getTeacher(Number(id));
        if (!cancelled) setTeacher(normalizeTeacherDetail(data));
      } catch {
        if (!cancelled) {
          toast.error(t('teachers.detail.notFound'));
          navigate('/teachers');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, t]);

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
    availabilityAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
          </div>
          <div className={styles.stickyAside}>
            <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) return null;

  const embed = teacher.introVideoUrl ? getYouTubeEmbedUrl(teacher.introVideoUrl) : null;
  const headline =
    teacher.headline?.trim() || t('teachers.card.defaultHeadline');
  const langs = teacher.languages ?? [];

  const rateLabel =
    teacher.hourlyRate != null && teacher.hourlyRate > 0
      ? t('teachers.detail.rateHighlight', { amount: teacher.hourlyRate.toFixed(2) })
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

  const submitReview = async (e: React.FormEvent) => {
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
        return <p className={styles.bio}>{teacher.bio}</p>;
      }
      return <p className={styles.emptyHint}>{t('teachers.detail.emptyAbout')}</p>;
    }
    if (profileTab === 'resume') {
      if (teacher.resume?.trim()) {
        return <p className={styles.bio}>{teacher.resume}</p>;
      }
      return <p className={styles.emptyHint}>{t('teachers.detail.emptyResume')}</p>;
    }
    const certs = teacher.certificates;
    if (!certs.length) {
      return <p className={styles.emptyHint}>{t('teachers.detail.emptyCertificates')}</p>;
    }
    return (
      <ul className={styles.certList}>
        {certs.map((c) => (
          <li key={c.id} className={styles.certItem}>
            <div className={styles.certTitle}>{c.title}</div>
            {(c.issuer || c.year) && (
              <div className={styles.certMeta}>
                {[c.issuer, c.year].filter(Boolean).join(' · ')}
              </div>
            )}
            {c.description?.trim() && <p className={styles.certDesc}>{c.description}</p>}
            {c.documentUrl?.trim() && (
              <a
                className={styles.certLink}
                href={c.documentUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
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
    <div className={styles.page}>
      <Button kind="ghost" onClick={() => navigate('/teachers')} style={{ marginBottom: 24 }}>
        {t('common.back')}
      </Button>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <div className={styles.profileCard}>
            <div className={styles.identity}>
              {teacher.avatarUrl ? (
                <img src={teacher.avatarUrl} alt="" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatar}>
                  {(teacher.displayName || teacher.username)[0].toUpperCase()}
                </div>
              )}
              <div className={styles.titleBlock}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 className={styles.name}>{teacher.displayName}</h1>
                  {teacher.offersTrialLesson && (
                    <span className="badge badge-brand">{t('teachers.detail.trialBadge')}</span>
                  )}
                  {!isSelf && isAuthenticated && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
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
                <div className={styles.headline}>{headline}</div>
              </div>
            </div>

            <div className={styles.statsBar}>
              <div className={styles.statCell}>
                <span className={styles.statValue}>
                  {ratingDisplay}
                  {teacher.averageRating != null ? (
                    <span className={styles.statStar} aria-hidden>
                      {' '}
                      ★
                    </span>
                  ) : null}
                </span>
                <span className={styles.statLabel}>{t('teachers.detail.statRating')}</span>
                <span className={styles.statSub}>
                  {t('teachers.detail.statReviewsCount', { count: teacher.reviewCount })}
                </span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{teacher.studentCount}</span>
                <span className={styles.statLabel}>{t('teachers.detail.statStudents')}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{teacher.conductedSessionsCount}</span>
                <span className={styles.statLabel}>{t('teachers.detail.statConducted')}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{teacher.lessonCount}</span>
                <span className={styles.statLabel}>{t('teachers.detail.statLessons')}</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statValue}>{teacher.publicDeckCount}</span>
                <span className={styles.statLabel}>{t('teachers.detail.statDecks')}</span>
              </div>
            </div>

            {langs.length > 0 && (
              <div className={styles.langBlock}>
                <p className={styles.langLabel}>{t('teachers.detail.teaches')}</p>
                <p className={styles.langList}>
                  {langs.map((code) => t(`languages.${code}`, { defaultValue: code })).join(' · ')}
                </p>
              </div>
            )}
          </div>

          <section className={styles.contentCard}>
            <div className={styles.profileTabs} role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={profileTab === tab.id}
                  className={`${styles.profileTab} ${profileTab === tab.id ? styles.profileTabActive : ''}`}
                  onClick={() => setProfileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={styles.tabPanel} role="tabpanel">
              {renderTabBody()}
            </div>
          </section>

          {!isSelf && isAuthenticated && (
            <section className={styles.contentCard}>
              <h2 className={styles.sectionTitle}>{t('teachers.detail.yourReview')}</h2>
              <form className={styles.reviewForm} onSubmit={(e) => void submitReview(e)}>
                <p className={styles.reviewLead}>{t('teachers.detail.reviewLead')}</p>
                <div className={styles.starRow} aria-label={t('teachers.detail.ratingLabel')}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.starBtn} ${n <= reviewRating ? styles.starOn : ''}`}
                      onClick={() => setReviewRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <label className={styles.reviewLabel} htmlFor="teacher-review-comment">
                  {t('teachers.detail.reviewComment')}
                </label>
                <textarea
                  id="teacher-review-comment"
                  className={`input-field ${styles.reviewTextarea}`}
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t('teachers.detail.reviewPlaceholder')}
                />
                <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                  {submittingReview ? t('common.loading') : t('teachers.detail.reviewSubmit')}
                </button>
              </form>
            </section>
          )}

          {!isSelf && !isAuthenticated && (
            <p className={styles.loginHint}>{t('teachers.detail.reviewLoginHint')}</p>
          )}

          {teacher.recentReviews.length > 0 && (
            <section className={styles.contentCard}>
              <h2 className={styles.sectionTitle}>{t('teachers.detail.reviewsTitle')}</h2>
              <ul className={styles.reviewList}>
                {teacher.recentReviews.map((r) => (
                  <li key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewHead}>
                      {r.authorAvatarUrl ? (
                        <img src={r.authorAvatarUrl} alt="" className={styles.reviewAvatar} />
                      ) : (
                        <div className={styles.reviewAvatarFallback}>
                          {r.authorDisplayName[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <div className={styles.reviewAuthor}>{r.authorDisplayName}</div>
                        <div className={styles.reviewStars}>★ {r.rating}/5</div>
                      </div>
                    </div>
                    {r.comment?.trim() && <p className={styles.reviewBody}>{r.comment}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div ref={availabilityAnchorRef} id="teacher-availability" className={styles.anchorSection}>
            <AvailabilityViewer
              ref={availabilityViewerRef}
              teacherId={teacher.id}
              isAuthenticated={isAuthenticated}
              isSelf={isSelf}
              flushTop
            />
          </div>

          {teacher.sampleDecks.length > 0 && (
            <section className={styles.contentCard}>
              <h2 className={styles.sectionTitle}>{t('teachers.detail.publicDecks')}</h2>
              <div className={styles.deckGrid}>
                {teacher.sampleDecks.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={styles.deckTile}
                    onClick={() => navigate(`/decks/${d.id}`)}
                  >
                    <div className={styles.deckEmoji}>{d.emoji || '📚'}</div>
                    <div className={styles.deckTitle}>{d.title}</div>
                    <div className={styles.deckMeta}>
                      {d.sourceLanguage} → {d.targetLanguage} · {d.cardCount} {t('common.cards')}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className={styles.stickyAside} aria-label={t('teachers.detail.sidebarAria')}>
          <div className={styles.stickyInner}>
            <div className={styles.videoShell}>
              {embed ? (
                <iframe
                  title={t('teachers.detail.videoTitle')}
                  src={embed}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className={styles.videoPlaceholder}>{t('teachers.detail.noVideo')}</div>
              )}
            </div>

            <div className={styles.actionCard}>
              <div className={styles.rateRow}>
                <span className={styles.rateCaption}>{t('teachers.detail.lessonsAndRate')}</span>
                <span className={styles.rateValue}>{rateLabel}</span>
              </div>

              {!isSelf && (teacher.cancellationPolicy?.trim() || teacher.paymentInfo?.trim()) && (
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 12 }}>
                  {teacher.cancellationPolicy?.trim() && (
                    <p style={{ margin: '0 0 8px' }}>
                      <strong>{t('teachers.detail.cancellationHeading')}</strong>
                      <br />
                      {teacher.cancellationPolicy.trim()}
                    </p>
                  )}
                  {teacher.paymentInfo?.trim() && (
                    <p style={{ margin: 0 }}>
                      <strong>{t('teachers.detail.paymentHeading')}</strong>
                      <br />
                      {teacher.paymentInfo.trim()}
                    </p>
                  )}
                </div>
              )}

              <div className={styles.ctaStack}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (isSelf) scrollToAvailability();
                    else availabilityViewerRef.current?.openModal();
                  }}
                >
                  {primaryScheduleLabel}
                </button>
                {!isSelf && (
                  <button type="button" className="btn btn-secondary" onClick={() => void openChatWithTeacher()}>
                    {t('teachers.detail.contactTeacher')}
                  </button>
                )}
              </div>

              <p className={styles.sidebarHint}>
                {isSelf
                  ? t('teachers.detail.sidebarHintSelf')
                  : t('teachers.detail.sidebarHint')}
              </p>

              <div className={styles.linkRow}>
                <button type="button" className={styles.linkMuted} onClick={() => navigate('/classes')}>
                  {t('teachers.detail.goMyTeachers')}
                </button>
                <button type="button" className={styles.linkMuted} onClick={() => navigate('/explore')}>
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
