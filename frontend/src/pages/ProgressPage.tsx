import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { progressApi } from '../services/api';
import styles from './ProgressPage.module.css';

interface HeatmapDay { date: string; count: number; }
interface Badge { key: string; earned: boolean; progress: number; target: number; }
interface ProgressDTO {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalCorrectAnswers: number;
  studiedDays: number;
  lastActivityDate: string | null;
  heatmap: HeatmapDay[];
  badges: Badge[];
}

/**
 * Progress page — streak header, GitHub-style activity heatmap,
 * and a grid of achievement badges.
 *
 * Heatmap layout:
 *   - 7 rows (one per weekday), N columns (weeks).
 *   - First column may have empty leading cells if the first day is not Sunday.
 *   - Cell color is mapped from `count` to one of 5 levels.
 */
export default function ProgressPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<ProgressDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    progressApi.get()
      .then(({ data }) => { if (alive) setData(data as ProgressDTO); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const heatmapWeeks = useMemo(() => buildWeeks(data?.heatmap || []), [data]);
  const monthLabels = useMemo(() => buildMonthLabels(heatmapWeeks, i18n.language), [heatmapWeeks, i18n.language]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('progress.title')}</h1>
        <p className={styles.subtitle}>{t('progress.subtitle')}</p>
      </header>

      {loading ? (
        <div className={styles.loading}>{t('common.loading')}…</div>
      ) : !data ? (
        <div className={styles.loading}>{t('common.error')}</div>
      ) : (
        <>
          <section className={styles.statRow}>
            <StatCard
              icon="🔥"
              label={t('progress.streakCurrent')}
              value={data.currentStreak}
              hint={t('progress.daysSuffix', { count: data.currentStreak })}
              highlight
            />
            <StatCard
              icon="⭐"
              label={t('progress.streakLongest')}
              value={data.longestStreak}
              hint={t('progress.daysSuffix', { count: data.longestStreak })}
            />
            <StatCard
              icon="📚"
              label={t('progress.totalSessions')}
              value={data.totalSessions}
            />
            <StatCard
              icon="✅"
              label={t('progress.totalCorrect')}
              value={data.totalCorrectAnswers}
            />
            <StatCard
              icon="📅"
              label={t('progress.studiedDays')}
              value={data.studiedDays}
            />
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t('progress.heatmapTitle')}</h2>
              <Legend />
            </header>

            <div className={styles.heatWrap}>
              <div className={styles.monthRow}>
                {monthLabels.map((m) => (
                  <span key={`${m.weekIndex}-${m.label}`} style={{ gridColumnStart: m.weekIndex + 2 }}>
                    {m.label}
                  </span>
                ))}
              </div>

              <div className={styles.heatGrid} style={{ gridTemplateColumns: `auto repeat(${heatmapWeeks.length}, 14px)` }}>
                <div className={styles.dayLabels}>
                  <span style={{ gridRowStart: 2 }}>{t('progress.day.mon')}</span>
                  <span style={{ gridRowStart: 4 }}>{t('progress.day.wed')}</span>
                  <span style={{ gridRowStart: 6 }}>{t('progress.day.fri')}</span>
                </div>

                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className={styles.weekColumn}>
                    {week.map((d, di) => (
                      <span
                        key={`${wi}-${di}`}
                        className={`${styles.cell} ${d ? styles[`level${level(d.count)}`] : styles.cellEmpty}`}
                        title={d ? `${d.date}: ${d.count}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('progress.badgesTitle')}</h2>
            <p className={styles.sectionHelp}>{t('progress.badgesSubtitle')}</p>

            <div className={styles.badgeGrid}>
              {data.badges.map((b) => (
                <BadgeCard key={b.key} badge={b} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}
function StatCard({ icon, label, value, hint, highlight }: StatCardProps) {
  return (
    <div className={`${styles.stat} ${highlight ? styles.statHi : ''}`}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statBody}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        {hint && <div className={styles.statHint}>{hint}</div>}
      </div>
    </div>
  );
}

const TROPHY: Record<string, string> = {
  first_step: '🎯',
  ten_sessions: '🥉',
  fifty_sessions: '🥈',
  hundred_sessions: '🥇',
  week_streak: '🔥',
  month_streak: '🚀',
  quarter_streak: '🏆',
  fifty_correct: '✨',
  five_hundred_correct: '💎',
  five_thousand_correct: '👑',
  ten_mastered: '📘',
  hundred_mastered: '📚',
};

function BadgeCard({ badge }: { badge: Badge }) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((badge.progress / Math.max(1, badge.target)) * 100));
  return (
    <div className={`${styles.badge} ${badge.earned ? styles.badgeEarned : ''}`}>
      <div className={styles.badgeIcon}>{TROPHY[badge.key] || '🏅'}</div>
      <div className={styles.badgeName}>{t(`progress.badge.${badge.key}.name`)}</div>
      <div className={styles.badgeDesc}>
        {t(`progress.badge.${badge.key}.desc`, { target: badge.target })}
      </div>
      {badge.earned ? (
        <div className={styles.badgeEarnedTag}>{t('progress.badgeEarned')}</div>
      ) : (
        <>
          <div className={styles.badgeBar}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.badgeProg}>{badge.progress}/{badge.target}</div>
        </>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div className={styles.legend}>
      <span>{t('progress.less')}</span>
      <span className={`${styles.cell} ${styles.level0}`} />
      <span className={`${styles.cell} ${styles.level1}`} />
      <span className={`${styles.cell} ${styles.level2}`} />
      <span className={`${styles.cell} ${styles.level3}`} />
      <span className={`${styles.cell} ${styles.level4}`} />
      <span>{t('progress.more')}</span>
    </div>
  );
}

function level(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * Group an ordered list of days into 7×N weeks (column = week, row = weekday).
 * Empty cells appear before the first day if that day is not Sunday.
 */
function buildWeeks(days: HeatmapDay[]): (HeatmapDay | null)[][] {
  if (!days.length) return [];
  const out: (HeatmapDay | null)[][] = [];
  let week: (HeatmapDay | null)[] = [];
  const firstDay = new Date(days[0].date + 'T00:00:00');
  const firstDow = firstDay.getDay();
  for (let i = 0; i < firstDow; i++) week.push(null);

  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      out.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    out.push(week);
  }
  return out;
}

function buildMonthLabels(weeks: (HeatmapDay | null)[][], lang: string): { label: string; weekIndex: number }[] {
  const fmt = new Intl.DateTimeFormat(lang || 'en', { month: 'short' });
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find((d) => d) as HeatmapDay | undefined;
    if (!firstReal) return;
    const date = new Date(firstReal.date + 'T00:00:00');
    if (date.getMonth() !== lastMonth && date.getDate() <= 7) {
      labels.push({ label: fmt.format(date), weekIndex: wi });
      lastMonth = date.getMonth();
    }
  });
  return labels;
}
