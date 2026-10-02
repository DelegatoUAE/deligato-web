import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import WelcomePage from './pages/WelcomePage';
import OnboardingPage from './pages/OnboardingPage';
import DevImportPage from './pages/DevImportPage';
import CapitalOverviewPage from './pages/CapitalOverviewPage';
import ReadinessPage from './pages/ReadinessPage';
import ReadinessAssessPage from './pages/ReadinessAssessPage';
import FindCapitalPage from './pages/FindCapitalPage';
import CapitalNeedPage from './pages/CapitalNeedPage';
import MatchesPage from './pages/MatchesPage';
import InvestorProfilePage from './pages/InvestorProfilePage';
import SavedPage from './pages/SavedPage';
import PipelinePage from './pages/PipelinePage';
import DataRoomPage from './pages/DataRoomPage';
import OutreachPage from './pages/OutreachPage';
import InsightsPage from './pages/InsightsPage';
import AdvicePage from './pages/AdvicePage';
import PackagesPage from './pages/PackagesPage';
import ExpertsPage from './pages/ExpertsPage';
import MyExpertsPage from './pages/MyExpertsPage';
import ExpertDetailPage from './pages/ExpertDetailPage';
import ExpertShortlistPage from './pages/ExpertShortlistPage';
import ExpertProjectsPage from './pages/ExpertProjectsPage';
import ProjectsPage from './pages/ProjectsPage';
import CompanyPage from './pages/CompanyPage';
import BusinessInfoPage from './pages/BusinessInfoPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ConsultantsPage from './pages/ConsultantsPage';
import ConsultantDetailPage from './pages/ConsultantDetailPage';
import MatchPage from './pages/MatchPage';
import Showcase from './design/Showcase';
import ProtectedRoute from './components/ProtectedRoute';
import CompanyProvider from './components/CompanyProvider';
import AppLayout from './components/AppLayout';
import FirstRunGuard from './components/FirstRunGuard';
import './App.css';

/** Signed-in area: session → active company → shell → first-run rules. */
function Protected({ children, gate = 'company', staffOnly = false }) {
  return (
    <ProtectedRoute>
      {(me) => (
        <CompanyProvider me={me}>
          <AppLayout>
            <FirstRunGuard gate={gate} staffOnly={staffOnly}>{children}</FirstRunGuard>
          </AppLayout>
        </CompanyProvider>
      )}
    </ProtectedRoute>
  );
}

function RedirectParam({ to }) {
  const params = useParams();
  const { search } = useLocation();
  const path = Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), to);
  return <Navigate to={`${path}${search}`} replace />;
}

const devImportOn = import.meta.env.VITE_DEV_IMPORT === 'true';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {import.meta.env.DEV && <Route path="/design" element={<Showcase />} />}

      <Route path="/" element={<Protected gate="open"><DashboardPage /></Protected>} />
      <Route path="/welcome" element={<Protected gate="welcome"><WelcomePage /></Protected>} />
      <Route path="/onboarding" element={<Protected gate="open"><OnboardingPage /></Protected>} />
      {devImportOn && <Route path="/dev/import" element={<Protected gate="open" staffOnly><DevImportPage /></Protected>} />}

      {/* Capital Access (primary) */}
      <Route path="/capital" element={<Protected><CapitalOverviewPage /></Protected>} />
      <Route path="/capital/readiness" element={<Protected><ReadinessPage /></Protected>} />
      <Route path="/capital/find" element={<Protected><FindCapitalPage /></Protected>} />
      <Route path="/capital/need" element={<Protected><CapitalNeedPage /></Protected>} />
      <Route path="/capital/matches" element={<Protected gate="confirmed"><MatchesPage /></Protected>} />
      <Route path="/capital/matches/:recordId" element={<Protected><InvestorProfilePage /></Protected>} />
      <Route path="/capital/readiness/assess" element={<Protected><ReadinessAssessPage /></Protected>} />
      <Route path="/capital/saved" element={<Protected><SavedPage /></Protected>} />
      <Route path="/capital/pipeline" element={<Protected><PipelinePage /></Protected>} />
      <Route path="/capital/data-room" element={<Protected><DataRoomPage /></Protected>} />
      <Route path="/capital/outreach" element={<Protected><OutreachPage /></Protected>} />
      <Route path="/capital/outreach/:draftId" element={<Protected><OutreachPage /></Protected>} />
      <Route path="/capital/insights" element={<Protected><InsightsPage /></Protected>} />
      <Route path="/capital/improve" element={<Protected><AdvicePage /></Protected>} />
      <Route path="/packages" element={<Protected><PackagesPage /></Protected>} />

      {/* Expert Access (secondary) */}
      <Route path="/experts" element={<Protected gate="open"><ExpertsPage /></Protected>} />
      <Route path="/experts/mine" element={<Protected gate="open"><MyExpertsPage /></Protected>} />
      <Route path="/experts/projects" element={<Protected gate="open"><ExpertProjectsPage /></Protected>} />
      <Route path="/experts/results/:briefId" element={<Protected gate="open"><ExpertShortlistPage /></Protected>} />
      <Route path="/experts/:id" element={<Protected gate="open"><ExpertDetailPage /></Protected>} />

      {/* Company (from Conncct) */}
      <Route path="/company" element={<Protected><CompanyPage /></Protected>} />
      <Route path="/company/business" element={<Protected><BusinessInfoPage /></Protected>} />
      <Route path="/company/documents" element={<Protected><DataRoomPage mode="documents" /></Protected>} />

      <Route path="/settings" element={<Protected gate="open"><SettingsPage /></Protected>} />

      {/* Staff workspace (legacy consultant tools) */}
      <Route path="/workspace/experts" element={<Protected gate="open" staffOnly><ConsultantsPage /></Protected>} />
      <Route path="/workspace/experts/:id" element={<Protected gate="open" staffOnly><ConsultantDetailPage /></Protected>} />
      <Route path="/workspace/consultants" element={<Protected gate="open" staffOnly><ConsultantsPage /></Protected>} />
      <Route path="/workspace/match" element={<Protected gate="open" staffOnly><MatchPage /></Protected>} />
      <Route path="/workspace/projects" element={<Protected gate="open" staffOnly><ProjectsPage /></Protected>} />

      {/* Legacy and spec-v1 links keep working */}
      <Route path="/matches" element={<Navigate to="/capital/matches" replace />} />
      <Route path="/matches/:recordId" element={<RedirectParam to="/capital/matches/:recordId" />} />
      <Route path="/capital/investors/:recordId" element={<RedirectParam to="/capital/matches/:recordId" />} />
      <Route path="/capital/profile" element={<Navigate to="/company/business" replace />} />
      <Route path="/capital/pipeline/*" element={<Navigate to="/capital/pipeline" replace />} />
      <Route path="/pipeline" element={<Navigate to="/capital/pipeline" replace />} />
      <Route path="/data-room" element={<Navigate to="/capital/data-room" replace />} />
      <Route path="/outreach" element={<RedirectParam to="/capital/outreach" />} />
      <Route path="/outreach/:draftId" element={<RedirectParam to="/capital/outreach/:draftId" />} />
      <Route path="/insights" element={<Navigate to="/capital/insights" replace />} />
      <Route path="/advice" element={<Navigate to="/capital/improve" replace />} />
      <Route path="/capital-need" element={<Navigate to="/capital/need" replace />} />
      <Route path="/consultants" element={<Navigate to="/experts" replace />} />
      <Route path="/consultants/:id" element={<RedirectParam to="/experts/:id" />} />
      <Route path="/projects" element={<Navigate to="/experts/projects" replace />} />
      <Route path="/match" element={<Navigate to="/workspace/match" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
