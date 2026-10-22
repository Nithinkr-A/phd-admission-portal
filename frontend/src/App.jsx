import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import ApplicationPage from './pages/ApplicationPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SupervisorAllocationForm from './pages/SupervisorAllocationForm';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/application" element={<ProtectedRoute><ApplicationPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute adminOnly><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/supervisor-allocation" element={<ProtectedRoute><SupervisorAllocationForm /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
