import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { JitsiMeetEmbed, type JitsiMeetEmbedHandle } from '@/shared/lib/jitsi';
import { sanitizeLessonCallUrl } from '@/shared/lib/lessonCallUrl';

function normalizeReturnPath(raw: string | null): string {
  if (!raw || !raw.trim().startsWith('/') || raw.trim().startsWith('//')) {
    return '/home';
  }
  return raw.trim();
}

/**
 * Full-screen Jitsi embed (deep link). Prefer starting calls from the classroom
 * mini-player when possible.
 */
export function LessonCallPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const embedRef = useRef<JitsiMeetEmbedHandle>(null);

  const safeUrl = useMemo(
    () => sanitizeLessonCallUrl(params.get('u')),
    [params],
  );
  const returnTo = useMemo(
    () => normalizeReturnPath(params.get('returnTo')),
    [params],
  );

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
    <div className='flex h-[calc(100vh-24px)] min-h-[480px] flex-col'>
      <div className='border-border flex shrink-0 items-center gap-3 border-b pt-2.5 pb-3'>
        <button
          type='button'
          className='btn btn-secondary btn-sm'
          onClick={() => embedRef.current?.hangup()}
        >
          {t('lessonCall.back')}
        </button>
        <span className='text-text2 text-[13px]'>{t('lessonCall.hint')}</span>
      </div>
      <div className='min-h-0 flex-1 overflow-hidden rounded-[12px]'>
        <JitsiMeetEmbed
          ref={embedRef}
          url={safeUrl}
          onConferenceLeft={handleConferenceLeft}
        />
      </div>
    </div>
  );
}
