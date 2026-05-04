import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { studyApi, deckApi, lessonsApi } from '../services/api';
import type { LessonItem } from '../services/types';
import styles from './ProfilePage.module.css';

const MODE_ICONS: Record<string, string> = { FLASHCARD: '⚡', LEARN: '🎯', MATCH: '🧩', SPELL: '✏️' };
const LESSON_ICON = '📘';
const PRACTICE_LIMIT = 5;
const TEACHER_LESSONS_LIMIT = 10;

const STAT_COLORS = ['var(--brand-light)', 'var(--accent)', 'var(--success)', 'var(--warning)'];

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [learningLessons, setLearningLessons] = useState<LessonItem[]>([]);
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [historyRes, decksRes, lessonsRes] = await Promise.all([
          studyApi.getHistory(),
          deckApi.getMyDecks(),
          lessonsApi.getMyLearningLessons(),
        ]);
        if (cancelled) return;
        setHistory(historyRes.data || []);
        setDecks(decksRes.data || []);
        setLearningLessons(lessonsRes.data || []);
      } catch {
        if (!cancelled) toast.error(t('profile.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
  const avgAccuracy = history.length > 0
    ? Math.round(history.reduce((s, h) => s + (h.accuracy || 0), 0) / history.length)
    : 0;

  const teacherLessonsShown = learningLessons.slice(0, TEACHER_LESSONS_LIMIT);
  const practiceRuns = history.slice(0, PRACTICE_LIMIT);

  const locale = i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US';

  const studyModeLabel = (mode: string) => {
    const key = `study.modesHeader.${mode}`;
    const label = t(key);
    return label === key ? mode : label;
  };

  const statItems = [
    { labelKey: 'profile.decks', value: decks.length, icon: '⊞' },
    { labelKey: 'profile.totalCards', value: totalCards, icon: '🃏' },
    { labelKey: 'profile.sessionsLabel', value: history.length, icon: '▶' },
    { labelKey: 'profile.avgAccuracy', value: `${avgAccuracy}%`, icon: '🎯' },
  ];

  const accuracyColor = (a: number) =>
    a >= 70 ? 'var(--success)' : a >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className={styles.page}>
      <div className={styles.heroCard}>
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className={styles.heroAvatarImg} />
        ) : (
          <div className={styles.heroAvatar}>
            {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
          </div>
        )}

        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{user?.displayName || user?.username}</h1>
          <div className={styles.heroMuted}>@{user?.username}</div>
          <div className={styles.heroMuted}>{user?.email}</div>
          <div className={styles.heroMeta}>
            <span className="badge badge-brand">
              {t(`profile.accountRole.${user?.role || 'USER'}`)}
            </span>
            {user?.createdAt && (
              <span className={styles.heroMetaText}>
                {t('profile.memberSince', {
                  date: new Date(user.createdAt).toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
                })}
              </span>
            )}
          </div>
        </div>

        <div className={styles.heroActions}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/settings')}>
            ⚙ {t('profile.openSettings')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/progress')}>
            🏆 {t('profile.openProgress')}
          </button>
          <button type="button" className={`btn btn-secondary btn-sm ${styles.logoutBtn}`} onClick={handleLogout}>
            {t('profile.logOut')}
          </button>
        </div>
      </div>

      <div className={styles.statsRow}>
        {statItems.map(({ labelKey, value, icon }, i) => (
          <div key={labelKey} className={styles.statCard}>
            <div className={styles.statHead}>
              <div className={styles.statLabel}>{t(labelKey)}</div>
              <span className={styles.statIcon}>{icon}</span>
            </div>
            <div className={styles.statValue} style={{ color: STAT_COLORS[i] }}>{value}</div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('profile.recentTeacherLessons')}</h2>
        {loading ? (
          <div className={styles.skeletonStack}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonRow}`} />)}
          </div>
        ) : teacherLessonsShown.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📖</div>
            <p style={{ color: 'var(--text2)' }}>{t('profile.noTeacherLessons')}</p>
          </div>
        ) : (
          <div className={styles.sessionList}>
            {teacherLessonsShown.map((lesson) => {
              const teacherName =
                lesson.teacher?.displayName?.trim() ||
                lesson.teacher?.username ||
                '—';
              const when = lesson.updatedAt || lesson.createdAt;
              return (
                <div
                  key={lesson.id}
                  className={styles.sessionRow}
                  onClick={() => navigate(`/lessons/${lesson.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/lessons/${lesson.id}`);
                    }
                  }}
                >
                  <div className={styles.sessionIcon}>{LESSON_ICON}</div>
                  <div>
                    <div className={styles.sessionDeck}>{lesson.title}</div>
                    <div className={styles.sessionMeta}>
                      {teacherName}
                      {when ? (
                        <>
                          {' '}
                          • {new Date(when).toLocaleDateString(locale)}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.sessionAccuracy} style={{ color: 'var(--text3)' }}>
                    —
                  </div>
                  <div className={styles.sessionScore} style={{ color: 'var(--text3)' }}>
                    →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('profile.recentDeckPractice')}</h2>
        <p className={styles.sectionSubtitle}>{t('profile.recentDeckPracticeSubtitle')}</p>
        {loading ? (
          <div className={styles.skeletonStack}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`skeleton ${styles.skeletonRow}`} />)}
          </div>
        ) : practiceRuns.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚡</div>
            <p style={{ color: 'var(--text2)' }}>{t('profile.noPracticeRuns')}</p>
          </div>
        ) : (
          <div className={styles.sessionList}>
            {practiceRuns.map((session: any) => {
              const accuracy = session.accuracy || 0;
              return (
                <div
                  key={session.id}
                  className={styles.sessionRow}
                  onClick={() => navigate(`/decks/${session.deckId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/decks/${session.deckId}`);
                    }
                  }}
                >
                  <div className={styles.sessionIcon}>{MODE_ICONS[session.mode] || '📖'}</div>
                  <div>
                    <div className={styles.sessionDeck}>{session.deckTitle}</div>
                    <div className={styles.sessionMeta}>
                      {studyModeLabel(session.mode)} • {session.totalCards} {t('common.cards')} •{' '}
                      {session.startedAt ? new Date(session.startedAt).toLocaleDateString(locale) : ''}
                    </div>
                  </div>
                  <div className={styles.sessionAccuracy} style={{ color: accuracyColor(accuracy) }}>
                    {Math.round(accuracy)}%
                  </div>
                  <div className={styles.sessionScore}>
                    ✓ {session.correctAnswers} / {(session.correctAnswers || 0) + (session.incorrectAnswers || 0)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            {t('profile.myDecks', { count: decks.length })}
          </h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/home')}>
            {t('profile.viewAll')}
          </button>
        </div>
        <div className={styles.deckGrid}>
          {decks.slice(0, 6).map((deck: any) => (
            <div
              key={deck.id}
              onClick={() => navigate(`/decks/${deck.id}`)}
              className={styles.deckTile}
              style={{ borderLeftColor: deck.coverColor || 'var(--brand)' }}
            >
              <div className={styles.deckTileHead}>
                <span className={styles.deckTileEmoji}>{deck.emoji || '📚'}</span>
                <span className={styles.deckTileTitle}>{deck.title}</span>
              </div>
              <div className={styles.deckTileMeta}>{t('profile.cardsCount', { count: deck.cardCount })}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
