import type { TFunction } from 'i18next';

import type { AppNotificationItem } from '../api/types';

export type NotificationFilter = 'ALL' | 'BOOKING' | 'ASSIGNMENT' | 'OTHER';

export function notificationMatchesFilter(
  n: AppNotificationItem,
  f: NotificationFilter,
): boolean {
  if (f === 'ALL') return true;
  const c = n.category || '';
  if (f === 'BOOKING') return c === 'BOOKING';
  if (f === 'ASSIGNMENT') return c === 'ASSIGNMENT';
  return c === 'SYSTEM' || c === '';
}

export function formatLessonWhen(
  startIso: unknown,
  endIso: unknown,
  locale: string,
): string {
  if (startIso == null || typeof startIso !== 'string') return '';
  try {
    const s = new Date(startIso);
    if (Number.isNaN(s.getTime())) return String(startIso);
    const datePart = s.toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    if (endIso != null && typeof endIso === 'string') {
      const e = new Date(endIso);
      if (!Number.isNaN(e.getTime())) {
        const endPart = e.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `${datePart} – ${endPart}`;
      }
    }
    return datePart;
  } catch {
    return String(startIso);
  }
}

/** Localized title/body using `kind` + context; falls back to API strings for legacy rows. */
export function resolveNotificationText(
  n: AppNotificationItem,
  t: TFunction,
  locale: string,
): { title: string; body: string } {
  const raw = n.context || {};
  const when = formatLessonWhen(raw.startIso, raw.endIso, locale);
  const interp: Record<string, string> = {
    when,
    peerName: raw.peerName != null ? String(raw.peerName) : '',
    teacherName: raw.teacherName != null ? String(raw.teacherName) : '',
    studentName: raw.studentName != null ? String(raw.studentName) : '',
    assignmentTitle:
      raw.assignmentTitle != null ? String(raw.assignmentTitle) : '',
  };
  if (n.kind) {
    const titleKey = `notifications.events.${n.kind}.title`;
    const bodyKey = `notifications.events.${n.kind}.body`;
    const title = t(titleKey, { ...interp, defaultValue: n.title });
    const body = t(bodyKey, { ...interp, defaultValue: n.body || '' });
    return { title, body };
  }
  return { title: n.title, body: n.body || '' };
}

export function notificationActionLabel(
  category: string | null | undefined,
  t: TFunction,
): string {
  if (category === 'BOOKING') return t('notifications.action.openLesson');
  if (category === 'ASSIGNMENT') return t('notifications.action.openTask');
  return t('notifications.action.open');
}
