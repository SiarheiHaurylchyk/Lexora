import { Navigate } from 'react-router-dom';

/** Legacy URL — landing choice is at `/home`. */
export function DashboardPage() {
  return <Navigate to='/home' replace />;
}
