import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LicenseSetupPage from '../pages/LicenseSetupPage';
import LicenseBlockedPage from '../pages/LicenseBlockedPage';

// License protection (blueprint §40 update): every authenticated route below
// this one is intercepted here whenever the system license isn't valid — a
// super admin always sees the setup/repair form (full-page, sidebar-free),
// everyone else sees a plain "access unavailable" screen. Neither renders
// <Outlet/>, so no admin page is reachable until the license is fixed.
export default function ProtectedRoute() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;

  const licenseStatus = user?.license?.status;
  if (licenseStatus && licenseStatus !== 'valid') {
    return user.roleLevel === 'super_admin' ? <LicenseSetupPage /> : <LicenseBlockedPage />;
  }

  return <Outlet />;
}
