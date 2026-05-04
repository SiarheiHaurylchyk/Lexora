import React from 'react';
import { useTranslation } from 'react-i18next';
import { getYouTubeEmbedUrl } from '../../lib/youtube';

/**
 * YouTubePlayer — turns a YouTube link into an embedded player so students
 * can watch the video without leaving the platform.
 *
 * If the URL does not look like a YouTube link, we show a small error box
 * instead of an iframe.
 */
interface Props {
  /** Any YouTube URL or a raw 11-char video id. */
  url: string;
  /** Optional title shown above the video. */
  title?: string;
}

export default function YouTubePlayer({ url, title }: Props) {
  const { t } = useTranslation();
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div
        style={{
          padding: 16,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
          color: 'var(--danger)',
          fontSize: 14,
        }}
      >
        {t('lesson.invalidYoutube', { url })}
      </div>
    );
  }

  return (
    <div>
      {title && <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%' /* 16:9 */,
          background: '#000',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    </div>
  );
}
