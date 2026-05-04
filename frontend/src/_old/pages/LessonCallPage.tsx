import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { sanitizeLessonCallUrl } from '../lib/lessonCallUrl';
import { JitsiMeetEmbed, type JitsiMeetEmbedHandle } from '../components/JitsiMeetEmbed';

function normalizeReturnPath(raw: string | null): string {
  if (!raw || !raw.trim().startsWith('/') || raw.trim().startsWith('//')) {
    return '/home';
  }
  return raw.trim();
}

/**
 * Full-screen Jitsi embed (deep link). Prefer starting calls from the classroom mini-player when possible.
 */
export default function LessonCallPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const embedRef = useRef<JitsiMeetEmbedHandle>(null);

  const safeUrl = useMemo(() => sanitizeLessonCallUrl(params.get('u')), [params]);
  const returnTo = useMemo(() => normalizeReturnPath(params.get('returnTo')), [params]);

  const handleConferenceLeft = useCallback(() => {
    navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  useEffect(() => {
    if (!safeUrl) {
      toast.error(t('lessonCall.badLink'));
      navigate('/home', { replace: true });
    }
  }, [safeUrl, navigate, t]);

  if (!safeUrl) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 24px)', minHeight: 480 }}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 0 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => embedRef.current?.hangup()}>
          {t('lessonCall.back')}
        </button>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t('lessonCall.hint')}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden' }}>
        <JitsiMeetEmbed ref={embedRef} url={safeUrl} onConferenceLeft={handleConferenceLeft} />
      </div>
    </div>
  );
}
