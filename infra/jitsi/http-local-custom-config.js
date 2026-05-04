// Lexora / локальный HTTP (DISABLE_HTTPS=1):
// В docker-jitsi-meet system-config.js задаёт bosh/websocket как https:// и wss:// относительно PUBLIC_URL_DOMAIN,
// при этом из PUBLIC_URL обрезается только префикс "https://".
// Если PUBLIC_URL = "http://localhost:8000", получается https://http://localhost:8000/... — клиент отключается («Вы отключены»).
config.bosh = window.location.protocol + '//' + window.location.host + '/' + subdir + 'http-bind';
config.websocket =
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  window.location.host +
  '/' +
  subdir +
  'xmpp-websocket';
