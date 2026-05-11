import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  ensureJitsiExternalApiScript,
  isHttpMeetingUrl,
  parseJitsiMeetConnection,
} from '../lessonCallUrl';

export type JitsiMeetEmbedHandle = {
  hangup: () => void;
};

type JitsiApi = {
  dispose?: () => void;
  executeCommand?: (cmd: string) => void;
  addEventListeners?: (events: Record<string, () => void>) => void;
  addEventListener?: (event: string, listener: () => void) => void;
};

interface Props {
  url: string;
  onConferenceLeft: () => void;
  className?: string;
  style?: CSSProperties;
}

const JitsiHttpIframe = forwardRef<JitsiMeetEmbedHandle, Props>(
  function JitsiHttpIframe({ url, onConferenceLeft, className, style }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      hangup: () => {
        try {
          const el = iframeRef.current;
          if (el) el.src = 'about:blank';
        } catch {
          /* ignore */
        }
        onConferenceLeft();
      },
    }));

    return (
      <iframe
        ref={iframeRef}
        title='Jitsi'
        src={url}
        allow='camera; microphone; fullscreen; display-capture; autoplay'
        className={cn('h-full w-full border-0 bg-[#111]', className)}
        style={style}
      />
    );
  },
);

const JitsiExternalApiEmbed = forwardRef<JitsiMeetEmbedHandle, Props>(
  function JitsiExternalApiEmbed(
    { url, onConferenceLeft, className, style },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<JitsiApi | null>(null);
    const finishedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      hangup: () => {
        try {
          apiRef.current?.executeCommand?.('hangup');
        } catch {
          /* ignore */
        }
      },
    }));

    useEffect(() => {
      finishedRef.current = false;
      const conn = parseJitsiMeetConnection(url);
      const node = containerRef.current;
      if (!conn || !node) return undefined;

      let cancelled = false;

      const handleLeft = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        onConferenceLeft();
      };

      (async () => {
        try {
          await ensureJitsiExternalApiScript(url);
          if (cancelled || !containerRef.current) return;

          const JitsiCtor = (
            window as unknown as {
              JitsiMeetExternalAPI?: new (
                domain: string,
                options: Record<string, unknown>,
              ) => JitsiApi;
            }
          ).JitsiMeetExternalAPI;
          if (!JitsiCtor) {
            handleLeft();
            return;
          }

          const { domain, roomName } = conn;
          const api = new JitsiCtor(domain, {
            roomName,
            parentNode: containerRef.current,
            width: '100%',
            height: '100%',
            configOverwrite: {
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              enableWelcomePage: false,
              enableClosePage: false,
            },
          });
          if (cancelled) {
            api.dispose?.();
            return;
          }
          apiRef.current = api;

          if (typeof api.addEventListeners === 'function') {
            api.addEventListeners({
              videoConferenceLeft: handleLeft,
              readyToClose: handleLeft,
            });
          } else {
            api.addEventListener?.('videoConferenceLeft', handleLeft);
            api.addEventListener?.('readyToClose', handleLeft);
          }
        } catch {
          handleLeft();
        }
      })();

      return () => {
        cancelled = true;
        try {
          apiRef.current?.dispose?.();
        } catch {
          /* ignore */
        }
        apiRef.current = null;
      };
    }, [url, onConferenceLeft]);

    return (
      <div
        ref={containerRef}
        className={cn('h-full w-full overflow-hidden bg-[#111]', className)}
        style={style}
      />
    );
  },
);

export const JitsiMeetEmbed = forwardRef<JitsiMeetEmbedHandle, Props>(
  function JitsiMeetEmbed(props, ref) {
    if (isHttpMeetingUrl(props.url)) {
      return <JitsiHttpIframe ref={ref} {...props} />;
    }
    return <JitsiExternalApiEmbed ref={ref} {...props} />;
  },
);
