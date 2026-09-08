import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <Outlet />;
}
