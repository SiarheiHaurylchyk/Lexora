import { useTranslation } from 'react-i18next';

import { getYouTubeEmbedUrl } from '../../lib/youtube';

interface Props {
  url: string;
  title?: string;
}

export function YouTubePlayer({ url, title }: Props) {
  const { t } = useTranslation();
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div
        className={cn(
          'rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-[var(--danger)]',
        )}
      >
        {t('lesson.invalidYoutube', { url })}
      </div>
    );
  }

  return (
    <div>
      {title && <div className='mb-2 font-semibold'>{title}</div>}
      <div
        className='relative w-full overflow-hidden rounded-xl bg-black'
        style={{ paddingTop: '56.25%' }}
      >
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
          referrerPolicy='strict-origin-when-cross-origin'
          className='absolute inset-0 h-full w-full border-none'
        />
      </div>
    </div>
  );
}
