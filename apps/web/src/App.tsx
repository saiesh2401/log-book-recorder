import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './api/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TemplatesPage from './pages/TemplatesPage';
import EditorPage from './pages/EditorPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
      <Route path="/editor/:templateId" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/templates" replace />} />
    </Routes>
  );
}
