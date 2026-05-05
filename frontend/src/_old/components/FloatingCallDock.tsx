import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { JitsiMeetEmbed, type JitsiMeetEmbedHandle } from './JitsiMeetEmbed';
import styles from './FloatingCallDock.module.css';

export type FloatingDockMode = 'pip' | 'max';

export type FloatingCallSession = {
  url: string;
  returnTo: string;
  dock: FloatingDockMode;
};

type Props = {
  session: FloatingCallSession;
  onConferenceLeft: () => void;
  onToggleDock: () => void;
};

export default function FloatingCallDock({ session, onConferenceLeft, onToggleDock }: Props) {
  const { t } = useTranslation();
  const embedRef = useRef<JitsiMeetEmbedHandle>(null);
  const pip = session.dock === 'pip';

  const requestHangup = () => {
    embedRef.current?.hangup();
  };

  return (
    <>
      {!pip && <div className={styles.backdrop} onClick={onToggleDock} aria-hidden />}
      <div className={pip ? styles.shellPip : styles.shellMax} role="dialog" aria-label={t('lessonCall.dockTitle')}>
        <div className={styles.chrome}>
          <span>{t('lessonCall.dockTitle')}</span>
          <div className={styles.chromeBtns}>
            <button type="button" onClick={onToggleDock}>
              {pip ? t('lessonCall.expand') : t('lessonCall.mini')}
            </button>
            <button type="button" className={styles.hangup} onClick={requestHangup}>
              {t('lessonCall.hangup')}
            </button>
          </div>
        </div>
        <div className={styles.video}>
          <JitsiMeetEmbed ref={embedRef} url={session.url} onConferenceLeft={onConferenceLeft} />
        </div>
      </div>
    </>
  );
}
