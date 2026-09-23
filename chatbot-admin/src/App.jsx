import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import CategoriesPage from './pages/CategoriesPage';
import ServiceSectorsPage from './pages/ServiceSectorsPage';
import UsersPage from './pages/UsersPage';
import LicensesPage from './pages/LicensesPage';
import RolesPage from './pages/RolesPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/service-sectors" element={<ServiceSectorsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/licenses" element={<LicensesPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
