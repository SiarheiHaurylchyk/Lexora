import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { getLastClassroomPath } from '@/shared/lib/classroomReturn';

/**
 * When the user left a shared class via sidebar or deep link, offers one tap to jump back.
 */
export function ClassroomReturnBar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const back = getLastClassroomPath();

  if (!back || pathname === back || pathname.startsWith(`${back}/`)) {
    return null;
  }

  return (
    <div
      className='border-border shrink-0 border-b bg-[linear-gradient(90deg,rgba(124,58,237,0.12),transparent_55%)] px-4 py-2'
      role='region'
      aria-label={t('classroom.returnBarAria')}
    >
      <Link
        to={back}
        className='text-brand-light hover:text-text inline-flex items-center gap-2 rounded-[12px] border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.08)] px-3 py-1.5 text-[13px] font-bold no-underline transition-[background,border-color,color] duration-200 hover:border-[rgba(139,92,246,0.55)] hover:bg-[rgba(124,58,237,0.14)]'
      >
        <ArrowLeft size={16} strokeWidth={2.5} aria-hidden />
        <span>{t('classroom.returnToClass')}</span>
      </Link>
    </div>
  );
}
