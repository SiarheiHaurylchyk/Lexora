/** Spring Boot classroom whiteboard relay — same host as the SPA (nginx / CRA proxy forwards `/ws`). */

export function classroomWhiteboardWebSocketUrl(
  linkId: number,
  accessToken: string,
): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const token = encodeURIComponent(accessToken);
  return `${proto}//${host}/ws/classroom-whiteboard/${linkId}?token=${token}`;
}
