/**
 * Validates in-app lesson call URLs before iframe navigation (open-redirect guard).
 * Defaults allow public Jitsi Meet; set VITE_JITSI_EXTRA_HOSTS=comma,separated for self-hosted.
 * Local dev: VITE_JITSI_ALLOW_LOCALHOST=true (never in production builds).
 * Note: Jitsi External API loads over HTTPS and builds https://{host}/… — self-signed local TLS often
 * blocks the script from an http:// Lexora page. For http://… meeting URLs we embed a plain iframe instead.
 */
const DEFAULT_ALLOWED = ['meet.jit.si'];

function localhostHosts(): string[] {
  const allow =
    import.meta.env.VITE_JITSI_ALLOW_LOCALHOST === '1' ||
    import.meta.env.VITE_JITSI_ALLOW_LOCALHOST === 'true';
  return allow ? ['localhost', '127.0.0.1', '[::1]'] : [];
}

function allowedHosts(): string[] {
  const extra = (import.meta.env.VITE_JITSI_EXTRA_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED, ...extra, ...localhostHosts()];
}

/** Meeting links with http:// use plain iframe embed (avoids External API + TLS issues on localhost). */
export function isHttpMeetingUrl(url: string): boolean {
  try {
    return new URL(url.trim()).protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeLessonCallUrl(raw: string | null | undefined): string | null {
  if (raw == null || !raw.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    const u = new URL(decoded);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.toLowerCase();
    const ok = allowedHosts().some((h) => host === h || host.endsWith('.jit.si'));
    if (!ok) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Host + room path for Jitsi Meet External API.
 * Uses host (not hostname) so non-default ports survive — API builds https://{domain}/…
 */
export function parseJitsiMeetConnection(url: string): { domain: string; roomName: string } | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    return { domain: u.host, roomName: segments[0] };
  } catch {
    return null;
  }
}

const jitsiScriptPromises = new Map<string, Promise<void>>();

/** Loads external_api.js from the same origin as the meeting URL (once per origin). */
export function ensureJitsiExternalApiScript(meetingUrl: string): Promise<void> {
  const w = window as unknown as { JitsiMeetExternalAPI?: unknown };
  if (w.JitsiMeetExternalAPI) return Promise.resolve();

  let scriptUrl: string;
  try {
    scriptUrl = `${new URL(meetingUrl).origin}/external_api.js`;
  } catch {
    return Promise.reject(new Error('Invalid meeting URL'));
  }

  const existing = jitsiScriptPromises.get(scriptUrl);
  if (existing) return existing;

  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = scriptUrl;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      jitsiScriptPromises.delete(scriptUrl);
      reject(new Error('Jitsi script failed'));
    };
    document.body.appendChild(s);
  });

  jitsiScriptPromises.set(scriptUrl, p);
  return p;
}
