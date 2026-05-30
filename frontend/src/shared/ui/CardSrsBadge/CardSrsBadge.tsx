import { useTranslation } from 'react-i18next';

import type { CardSrsStatus } from '../../api/types';
import { SRS_STATUS_CLASS, SRS_STATUS_LABEL_KEY } from '../../lib/srs';

interface Props {
  status: CardSrsStatus;
  due?: boolean;
}

/** Компактный бейдж статуса SRS на карточке. */
export function CardSrsBadge({ status, due }: Props) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        SRS_STATUS_CLASS[status],
      )}
    >
      {due && <span aria-hidden>⏰</span>}
      {t(SRS_STATUS_LABEL_KEY[status])}
    </span>
  );
}
