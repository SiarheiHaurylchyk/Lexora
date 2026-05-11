import { type CSSProperties, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useApiQuery } from '@/shared/lib/query';

interface HeatmapDay {
  date: string;
  count: number;
}
interface BadgeData {
  key: string;
  earned: boolean;
  progress: number;
  target: number;
}
interface ProgressDTO {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalCorrectAnswers: number;
  studiedDays: number;
  lastActivityDate: string | null;
  heatmap: HeatmapDay[];
  badges: BadgeData[];
}

const cellBase = tw`inline-block w-3 h-3 rounded-[3px]`;
const sectionClasses = tw`mb-[22px] rounded-[20px] border border-border bg-surface p-[22px]`;

const LEVEL_COLORS = [
  'bg-bg3',
  'bg-[rgba(124,58,237,0.30)]',
  'bg-[rgba(124,58,237,0.55)]',
  'bg-[rgba(124,58,237,0.80)]',
  'bg-brand',
] as const;

/**
 * Progress page — streak header, GitHub-style activity heatmap,
 * and a grid of achievement badges.
 */
export function ProgressPage() {
  const { t, i18n } = useTranslation();
  const progressQuery = useApiQuery<ProgressDTO>({
    queryKey: ['study', 'progress'],
    url: '/study/progress',
  });
  const data = progressQuery.data ?? null;
  const loading = progressQuery.isLoading;

  const heatmapWeeks = useMemo(() => buildWeeks(data?.heatmap || []), [data]);
  const monthLabels = useMemo(
    () => buildMonthLabels(heatmapWeeks, i18n.language),
    [heatmapWeeks, i18n.language],
  );

  const heatGridStyle: CSSProperties = {
    gridTemplateColumns: `auto repeat(${heatmapWeeks.length}, 14px)`,
  };

  return (
    <div className='box-border w-full py-10'>
      <header className='mb-7'>
        <h1 className='font-display mb-1.5 text-[32px]'>
          {t('progress.title')}
        </h1>
        <p className='text-text2'>{t('progress.subtitle')}</p>
      </header>

      {loading ? (
        <div className='text-text3 py-[60px] text-center'>
          {t('common.loading')}…
        </div>
      ) : !data ? (
        <div className='text-text3 py-[60px] text-center'>
          {t('common.error')}
        </div>
      ) : (
        <>
          <section className='mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5'>
            <StatCard
              icon='🔥'
              label={t('progress.streakCurrent')}
              value={data.currentStreak}
              hint={t('progress.daysSuffix', { count: data.currentStreak })}
              highlight
            />
            <StatCard
              icon='⭐'
              label={t('progress.streakLongest')}
              value={data.longestStreak}
              hint={t('progress.daysSuffix', { count: data.longestStreak })}
            />
            <StatCard
              icon='📚'
              label={t('progress.totalSessions')}
              value={data.totalSessions}
            />
            <StatCard
              icon='✅'
              label={t('progress.totalCorrect')}
              value={data.totalCorrectAnswers}
            />
            <StatCard
              icon='📅'
              label={t('progress.studiedDays')}
              value={data.studiedDays}
            />
          </section>

          <section className={sectionClasses}>
            <header className='mb-3.5 flex flex-wrap items-center justify-between gap-2.5'>
              <h2 className='font-display m-0 text-xl'>
                {t('progress.heatmapTitle')}
              </h2>
              <Legend />
            </header>

            <div className='overflow-x-auto'>
              <div className='text-text3 mb-1 grid grid-cols-[28px_repeat(auto-fill,14px)] gap-[3px] text-[11px]'>
                {monthLabels.map((m) => (
                  <span
                    key={`${m.weekIndex}-${m.label}`}
                    style={{ gridColumnStart: m.weekIndex + 2 }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              <div
                className='grid grid-rows-[repeat(7,12px)] items-start gap-[3px]'
                style={heatGridStyle}
              >
                <div className='text-text3 row-start-1 row-end-[span_7] grid w-7 grid-rows-[repeat(7,12px)] gap-[3px] pr-1 text-[10px]'>
                  <span className='row-start-2'>{t('progress.day.mon')}</span>
                  <span className='row-start-4'>{t('progress.day.wed')}</span>
                  <span className='row-start-6'>{t('progress.day.fri')}</span>
                </div>

                {heatmapWeeks.map((week, wi) => (
                  <div
                    key={wi}
                    className='grid grid-rows-[repeat(7,12px)] gap-[3px]'
                  >
                    {week.map((d, di) => (
                      <span
                        key={`${wi}-${di}`}
                        className={cn(
                          cellBase,
                          d ? LEVEL_COLORS[level(d.count)] : 'bg-transparent',
                        )}
                        title={d ? `${d.date}: ${d.count}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={sectionClasses}>
            <h2 className='font-display m-0 text-xl'>
              {t('progress.badgesTitle')}
            </h2>
            <p className='text-text2 -mt-2 mb-3.5 text-[13px]'>
              {t('progress.badgesSubtitle')}
            </p>

            <div className='grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5'>
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
    <div
      className={cn(
        'border-border bg-surface flex items-center gap-3.5 rounded-[20px] border px-[18px] py-[18px]',
        highlight &&
          'border-[rgba(245,158,11,0.35)] bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(124,58,237,0.12))]',
      )}
    >
      <div className='text-[26px]'>{icon}</div>
      <div className='min-w-0'>
        <div className='font-display text-[26px] leading-[1] font-bold'>
          {value}
        </div>
        <div className='text-text2 mt-1 text-xs'>{label}</div>
        {hint && <div className='text-text3 mt-0.5 text-[11px]'>{hint}</div>}
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

function BadgeCard({ badge }: { badge: BadgeData }) {
  const { t } = useTranslation();
  const pct = Math.min(
    100,
    Math.round((badge.progress / Math.max(1, badge.target)) * 100),
  );
  return (
    <div
      className={cn(
        'border-border bg-bg3 rounded-[20px] border p-4 text-center opacity-55 grayscale-[50%] transition-[opacity,filter] duration-200',
        badge.earned &&
          'border-[rgba(124,58,237,0.45)] bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(245,158,11,0.10))] opacity-100 grayscale-0',
      )}
    >
      <div className='mb-2 text-4xl leading-[1]'>
        {TROPHY[badge.key] || '🏅'}
      </div>
      <div className='font-display mb-1 text-sm font-semibold'>
        {t(`progress.badge.${badge.key}.name`)}
      </div>
      <div className='text-text2 mb-2.5 min-h-8 text-xs leading-[1.45]'>
        {t(`progress.badge.${badge.key}.desc`, { target: badge.target })}
      </div>
      {badge.earned ? (
        <div className='text-success inline-block rounded-full bg-[rgba(16,185,129,0.18)] px-2.5 py-1 text-[11px] tracking-[0.05em] uppercase'>
          {t('progress.badgeEarned')}
        </div>
      ) : (
        <>
          <div className='mb-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]'>
            <span
              className='from-brand to-accent block h-full bg-gradient-to-r transition-[width] duration-200'
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className='text-text3 text-[11px]'>
            {badge.progress}/{badge.target}
          </div>
        </>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div className='text-text3 inline-flex items-center gap-1.5 text-xs'>
      <span>{t('progress.less')}</span>
      {LEVEL_COLORS.map((cls, i) => (
        <span key={i} className={cn(cellBase, cls)} />
      ))}
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

function buildMonthLabels(
  weeks: (HeatmapDay | null)[][],
  lang: string,
): { label: string; weekIndex: number }[] {
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
