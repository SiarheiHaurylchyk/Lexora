import { Navigate } from 'react-router-dom';

import { AvailabilityEditor } from '@/widgets/AvailabilityEditor';

import { userCanTeach } from '@/shared/lib/accountRole';
import { useAppSelector } from '@/shared/lib/storeHooks';

/**
 * Teacher-only weekly availability — standalone route (sidebar "My schedule").
 * No Settings chrome so this entry never feels like "opening settings".
 */
export function SchedulePage() {
  const user = useAppSelector((s) => s.auth.user);

  if (!userCanTeach(user?.role)) {
    return <Navigate to='/home' replace />;
  }

  return (
    <div className='box-border flex min-h-0 w-full flex-1 flex-col px-4 pt-2 pb-4'>
      <AvailabilityEditor variant='page' />
    </div>
  );
}
