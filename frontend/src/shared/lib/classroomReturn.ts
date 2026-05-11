const STORAGE_KEY = 'lexora.lastClassroomPath';

/** Remember active class so other pages can offer “return to class”. */
export function setLastClassroomPath(path: string): void {
  if (typeof sessionStorage === 'undefined') return;
  if (path.startsWith('/class/')) {
    sessionStorage.setItem(STORAGE_KEY, path);
  }
}

export function getLastClassroomPath(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const v = sessionStorage.getItem(STORAGE_KEY);
  return v && /^\/class\/\d+$/.test(v) ? v : null;
}

export function clearLastClassroomPath(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
