import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import ConsultantsPage from './pages/ConsultantsPage';
import MatchPage from './pages/MatchPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function Protected({ children }) {
  return (
    <ProtectedRoute>
      {(me) => <Layout me={me}>{children(me)}</Layout>}
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<Protected>{(me) => <HomePage me={me} />}</Protected>} />
      <Route path="/projects" element={<Protected>{() => <ProjectsPage />}</Protected>} />
      <Route path="/consultants" element={<Protected>{() => <ConsultantsPage />}</Protected>} />
      <Route path="/match" element={<Protected>{() => <MatchPage />}</Protected>} />
    </Routes>
  );
}
