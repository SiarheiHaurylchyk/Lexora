/**
 * Tiny calendar utilities used by both AvailabilityEditor (teacher view)
 * and AvailabilityViewer (student view) on the teacher detail page.
 */

export interface WeekRange {
  start: Date;
  endExclusive: Date;
}

/**
 * Return [start, end+1day) for a given Monday-aligned week start.
 */
export function buildWeekRange(weekStart: Date): WeekRange {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 7);
  return { start, endExclusive };
}

/** Add ±N weeks to a date keeping it normalised to midnight. */
export function shiftWeek(date: Date, weeks: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + weeks * 7);
  return out;
}

/**
 * Format a Date as "yyyy-MM-ddTHH:mm:00" in local time. The backend stores
 * raw LocalDateTime so we must NOT use UTC here.
 */
export function formatLocalIso(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  );
}

/** Parse a backend LocalDateTime string into a JS Date in the local zone. */
export function parseLocalIso(value: string): Date {
  // The string already represents local time; appending nothing keeps it local.
  return new Date(value);
}

/** Two ranges overlap iff a.start < b.end && a.end > b.start. */
export function rangeOverlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/** "Mon, 4 May – Sun, 10 May" styled label, locale-aware. */
export function weekRangeLabel(
  start: Date,
  endExclusive: Date,
  locale: string,
): string {
  const last = new Date(endExclusive);
  last.setDate(last.getDate() - 1);
  const fmt = new Intl.DateTimeFormat(locale || 'en', {
    day: 'numeric',
    month: 'short',
  });
  return `${fmt.format(start)} — ${fmt.format(last)}`;
}

/** "08:00" style label for a 24-hour slot. */
export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/** One row in the week grid (local time). */
export interface HalfHourRow {
  h: number;
  m: number;
}

/**
 * Rows for teacher editor and learner booking modal: 00:30, 01:00, … 23:30 (30-minute steps).
 */
export const WEEK_GRID_HALF_HOUR_ROWS: ReadonlyArray<HalfHourRow> = (() => {
  const rows: HalfHourRow[] = [{ h: 0, m: 30 }];
  for (let h = 1; h < 24; h += 1) {
    rows.push({ h, m: 0 });
    rows.push({ h, m: 30 });
  }
  return rows;
})();

/** "08:30" style label. */
export function formatHalfHourLabel(h: number, m: number): string {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Group slots by their local date-string (yyyy-mm-dd). */
export function groupByDate<T extends { startTime: string }>(
  items: T[],
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const date = parseLocalIso(item.startTime);
    const key = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}
