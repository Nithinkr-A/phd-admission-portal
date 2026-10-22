import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const storedUser = localStorage.getItem('currentUser');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !['admin', 'super_admin', 'department_admin'].includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
