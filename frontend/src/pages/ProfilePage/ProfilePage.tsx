import { type CSSProperties, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { DeckItem, LessonItem, StudySession } from '@/shared/api/types';
import { useApiQuery } from '@/shared/lib/query';
import { logout } from '@/shared/lib/storeActions';
import { useAppDispatch, useAppSelector } from '@/shared/lib/storeHooks';

const MODE_ICONS: Record<string, string> = {
  FLASHCARD: '⚡',
  LEARN: '🎯',
  MATCH: '🧩',
  SPELL: '✏️',
};
const LESSON_ICON = '📘';
const PRACTICE_LIMIT = 5;
const TEACHER_LESSONS_LIMIT = 10;

const STAT_COLORS = [
  'var(--brand-light)',
  'var(--accent)',
  'var(--success)',
  'var(--warning)',
];

const sessionRowClasses = tw`grid cursor-pointer items-center gap-4 grid-cols-[auto_1fr_auto_auto] rounded-[10px] border border-border bg-surface px-5 py-3.5 transition-colors duration-200 hover:border-border2`;

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const historyQuery = useApiQuery<StudySession[]>({
    queryKey: ['study', 'history'],
    url: '/study/history',
  });
  const decksQuery = useApiQuery<DeckItem[]>({
    queryKey: ['decks', 'my'],
    url: '/decks/my',
  });
  const lessonsQuery = useApiQuery<LessonItem[]>({
    queryKey: ['lessons', 'my-learning'],
    url: '/lessons/my-learning',
  });

  const loading =
    historyQuery.isLoading || decksQuery.isLoading || lessonsQuery.isLoading;
  const loadFailed =
    historyQuery.isError || decksQuery.isError || lessonsQuery.isError;
  useEffect(() => {
    if (loadFailed) toast.error(t('profile.loadFailed'));
  }, [loadFailed, t]);

  const history = historyQuery.data ?? [];
  const decks = decksQuery.data ?? [];
  const learningLessons = lessonsQuery.data ?? [];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
  const avgAccuracy =
    history.length > 0
      ? Math.round(
          history.reduce((s, h) => s + (h.accuracy || 0), 0) / history.length,
        )
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
    <div className='box-border w-full py-10'>
      <div className='mb-8 flex flex-wrap items-center gap-7 rounded-[28px] border border-[rgba(124,58,237,0.2)] bg-[linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.08))] p-9'>
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=''
            className='h-20 w-20 shrink-0 rounded-full border-2 border-[rgba(124,58,237,0.4)] object-cover'
          />
        ) : (
          <div className='from-brand to-accent flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[32px] font-bold text-white'>
            {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
          </div>
        )}

        <div className='min-w-[200px] flex-1'>
          <h1 className='font-display mb-1 text-[28px]'>
            {user?.displayName || user?.username}
          </h1>
          <div className='text-text3 text-sm'>@{user?.username}</div>
          <div className='text-text3 text-sm'>{user?.email}</div>
          <div className='mt-3'>
            <span className='badge badge-brand'>
              {t(`profile.accountRole.${user?.role || 'USER'}`)}
            </span>
            {user?.createdAt && (
              <span className='text-text3 ml-3 text-[13px]'>
                {t('profile.memberSince', {
                  date: new Date(user.createdAt).toLocaleDateString(locale, {
                    month: 'long',
                    year: 'numeric',
                  }),
                })}
              </span>
            )}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={() => navigate('/settings')}
          >
            ⚙ {t('profile.openSettings')}
          </button>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={() => navigate('/progress')}
          >
            🏆 {t('profile.openProgress')}
          </button>
          <button
            type='button'
            className='btn btn-secondary btn-sm border-danger text-danger'
            onClick={handleLogout}
          >
            {t('profile.logOut')}
          </button>
        </div>
      </div>

      <div className='mb-8 grid grid-cols-4 gap-4 max-[720px]:grid-cols-2'>
        {statItems.map(({ labelKey, value, icon }, i) => (
          <div
            key={labelKey}
            className='border-border bg-surface rounded-[20px] border p-5'
          >
            <div className='mb-2 flex items-start justify-between'>
              <div className='text-text3 text-xs font-medium'>
                {t(labelKey)}
              </div>
              <span className='text-lg'>{icon}</span>
            </div>
            <div
              className='font-display text-[28px] font-bold'
              style={{ color: STAT_COLORS[i] }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className='mb-8'>
        <h2 className='font-display mb-4 text-xl'>
          {t('profile.recentTeacherLessons')}
        </h2>
        {loading ? (
          <div className='flex flex-col gap-2.5'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='skeleton h-16 rounded-[10px]' />
            ))}
          </div>
        ) : teacherLessonsShown.length === 0 ? (
          <div className='border-border bg-surface rounded-[20px] border p-12 text-center'>
            <div className='mb-3 text-[40px]'>📖</div>
            <p className='text-text2'>{t('profile.noTeacherLessons')}</p>
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            {teacherLessonsShown.map((lesson) => {
              const teacherName =
                lesson.teacher?.displayName?.trim() ||
                lesson.teacher?.username ||
                '—';
              const when = lesson.updatedAt || lesson.createdAt;
              return (
                <div
                  key={lesson.id}
                  className={sessionRowClasses}
                  onClick={() => navigate(`/lessons/${lesson.id}`)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/lessons/${lesson.id}`);
                    }
                  }}
                >
                  <div className='text-2xl'>{LESSON_ICON}</div>
                  <div>
                    <div className='text-[15px] font-medium'>
                      {lesson.title}
                    </div>
                    <div className='text-text3 mt-0.5 text-xs'>
                      {teacherName}
                      {when ? (
                        <> • {new Date(when).toLocaleDateString(locale)}</>
                      ) : null}
                    </div>
                  </div>
                  <div className='text-text3 text-[15px] font-bold'>—</div>
                  <div className='text-text3 text-[13px] whitespace-nowrap'>
                    →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className='mb-8'>
        <h2 className='font-display mb-4 text-xl'>
          {t('profile.recentDeckPractice')}
        </h2>
        <p className='text-text3 -mt-2 mb-4 text-[13px] leading-[1.45]'>
          {t('profile.recentDeckPracticeSubtitle')}
        </p>
        {loading ? (
          <div className='flex flex-col gap-2.5'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='skeleton h-16 rounded-[10px]' />
            ))}
          </div>
        ) : practiceRuns.length === 0 ? (
          <div className='border-border bg-surface rounded-[20px] border p-12 text-center'>
            <div className='mb-3 text-[40px]'>⚡</div>
            <p className='text-text2'>{t('profile.noPracticeRuns')}</p>
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            {practiceRuns.map((session) => {
              const accuracy = session.accuracy || 0;
              const accuracyStyle: CSSProperties = {
                color: accuracyColor(accuracy),
              };
              return (
                <div
                  key={session.id}
                  className={sessionRowClasses}
                  onClick={() => navigate(`/decks/${session.deckId}`)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/decks/${session.deckId}`);
                    }
                  }}
                >
                  <div className='text-2xl'>
                    {MODE_ICONS[session.mode] || '📖'}
                  </div>
                  <div>
                    <div className='text-[15px] font-medium'>
                      {session.deckTitle}
                    </div>
                    <div className='text-text3 mt-0.5 text-xs'>
                      {studyModeLabel(session.mode)} • {session.totalCards}{' '}
                      {t('common.cards')} •{' '}
                      {session.startedAt
                        ? new Date(session.startedAt).toLocaleDateString(locale)
                        : ''}
                    </div>
                  </div>
                  <div className='text-[15px] font-bold' style={accuracyStyle}>
                    {Math.round(accuracy)}%
                  </div>
                  <div className='text-text3 text-[13px] whitespace-nowrap'>
                    ✓ {session.correctAnswers} /{' '}
                    {(session.correctAnswers || 0) +
                      (session.incorrectAnswers || 0)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='font-display m-0 text-xl'>
            {t('profile.myDecks', { count: decks.length })}
          </h2>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={() => navigate('/home')}
          >
            {t('profile.viewAll')}
          </button>
        </div>
        <div className='grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3'>
          {decks.slice(0, 6).map((deck: DeckItem) => {
            const tileStyle: CSSProperties = {
              borderLeftColor: deck.coverColor || 'var(--brand)',
            };
            return (
              <div
                key={deck.id}
                onClick={() => navigate(`/decks/${deck.id}`)}
                className='border-border border-l-brand bg-surface cursor-pointer rounded-[12px] border border-l-[3px] px-4 py-3.5 transition-colors duration-200'
                style={tileStyle}
              >
                <div className='mb-1.5 flex items-center gap-2'>
                  <span className='text-lg'>{deck.emoji || '📚'}</span>
                  <span className='overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap'>
                    {deck.title}
                  </span>
                </div>
                <div className='text-text3 text-xs'>
                  {t('profile.cardsCount', { count: deck.cardCount })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
