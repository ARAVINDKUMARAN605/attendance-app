import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace /> : <Login />}
      />
      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/student"
        element={
          <Protected role="student">
            <StudentDashboard />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
