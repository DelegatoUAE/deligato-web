import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { getToken } from './lib/auth';
import { Skeleton } from './design/ui';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import CompanyProvider from './components/CompanyProvider';
import AppLayout from './components/AppLayout';
import FirstRunGuard from './components/FirstRunGuard';
import { AdminArea } from './components/AdminLayout';
import './App.css';

// Signed-in screens load on demand, so the public landing and auth pages stay light.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const CapitalOverviewPage = lazy(() => import('./pages/CapitalOverviewPage'));
const ReadinessPage = lazy(() => import('./pages/ReadinessPage'));
const ReadinessAssessPage = lazy(() => import('./pages/ReadinessAssessPage'));
const FindCapitalPage = lazy(() => import('./pages/FindCapitalPage'));
const CapitalNeedPage = lazy(() => import('./pages/CapitalNeedPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const InvestorProfilePage = lazy(() => import('./pages/InvestorProfilePage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const PipelinePage = lazy(() => import('./pages/PipelinePage'));
const DataRoomPage = lazy(() => import('./pages/DataRoomPage'));
const OutreachPage = lazy(() => import('./pages/OutreachPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const AdvicePage = lazy(() => import('./pages/AdvicePage'));
const PackagesPage = lazy(() => import('./pages/PackagesPage'));
const ExpertsPage = lazy(() => import('./pages/ExpertsPage'));
const MyExpertsPage = lazy(() => import('./pages/MyExpertsPage'));
const ExpertDetailPage = lazy(() => import('./pages/ExpertDetailPage'));
const ExpertShortlistPage = lazy(() => import('./pages/ExpertShortlistPage'));
const ExpertProjectsPage = lazy(() => import('./pages/ExpertProjectsPage'));
const CompanyPage = lazy(() => import('./pages/CompanyPage'));
const BusinessInfoPage = lazy(() => import('./pages/BusinessInfoPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CompanyIntelligencePage = lazy(() => import('./pages/CompanyIntelligencePage'));
const FinancialHealthPage = lazy(() => import('./pages/FinancialHealthPage'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const CompanyRecordPage = lazy(() => import('./pages/CompanyRecordPage'));
const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'));
const AdminExpertsPage = lazy(() => import('./pages/admin/AdminExpertsPage'));
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage'));
const AdminCorrectionsPage = lazy(() => import('./pages/admin/AdminCorrectionsPage'));
const AdminLearningPage = lazy(() => import('./pages/admin/AdminLearningPage'));
const AdminMatchPage = lazy(() => import('./pages/admin/AdminMatchPage'));
const DevImportPage = import.meta.env.DEV ? lazy(() => import('./pages/DevImportPage')) : null;
const Showcase = import.meta.env.DEV ? lazy(() => import('./design/Showcase')) : null;

/** Signed-in area: session → active company → shell → first-run rules. */
function Protected({ children, gate = 'company', staffOnly = false }) {
  return (
    <ProtectedRoute>
      {(me) => (
        <CompanyProvider me={me}>
          <AppLayout>
            <FirstRunGuard gate={gate} staffOnly={staffOnly}>
              <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
            </FirstRunGuard>
          </AppLayout>
        </CompanyProvider>
      )}
    </ProtectedRoute>
  );
}

/** Content-area placeholder while a lazily loaded screen arrives. */
function PageSkeleton() {
  return (
    <div className="page-skel" aria-busy="true" aria-label="Loading">
      <Skeleton w="40%" h="28px" />
      <Skeleton w="64%" h="14px" />
      <div className="page-skel-grid"><Skeleton h="112px" r="12px" /><Skeleton h="112px" r="12px" /><Skeleton h="112px" r="12px" /></div>
      <Skeleton h="220px" r="12px" />
    </div>
  );
}

/** "/": the public landing for signed-out visitors, the Command Center once signed in. */
function Home() {
  if (!getToken()) return <LandingPage />;
  return <Protected gate="open"><DashboardPage /></Protected>;
}

function RedirectSearch({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function RedirectParam({ to }) {
  const params = useParams();
  const { search } = useLocation();
  const path = Object.entries(params).reduce((p, [k, v]) => p.replace(`:${k}`, v), to);
  return <Navigate to={`${path}${search}`} replace />;
}

const devImportOn = (import.meta.env.DEV && import.meta.env.VITE_DEV_IMPORT === 'true');

export default function App() {
  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {Showcase && <Route path="/design" element={<Suspense fallback={null}><Showcase /></Suspense>} />}

      <Route path="/" element={<Home />} />
      <Route path="/welcome" element={<Protected gate="welcome"><WelcomePage /></Protected>} />
      <Route path="/onboarding" element={<Protected gate="open"><OnboardingPage /></Protected>} />
      {devImportOn && <Route path="/dev/import" element={<Protected gate="open" staffOnly><Suspense fallback={null}><DevImportPage /></Suspense></Protected>} />}

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
      <Route path="/company/intelligence" element={<Protected><CompanyIntelligencePage /></Protected>} />
      <Route path="/company/financial-health" element={<Protected><FinancialHealthPage /></Protected>} />
      <Route path="/company/check-in" element={<Protected><CheckInPage /></Protected>} />
      <Route path="/company/record" element={<Protected><CompanyRecordPage /></Protected>} />

      <Route path="/settings" element={<Protected gate="open"><SettingsPage /></Protected>} />
      <Route path="/settings/:tab" element={<Protected gate="open"><SettingsPage /></Protected>} />

      {/* Admin Portal (D58): own shell; founders get not-found; the API enforces every call */}
      <Route path="/admin" element={<AdminArea><Suspense fallback={<PageSkeleton />}><AdminHomePage /></Suspense></AdminArea>} />
      <Route path="/admin/experts" element={<AdminArea><Suspense fallback={<PageSkeleton />}><AdminExpertsPage /></Suspense></AdminArea>} />
      <Route path="/admin/projects" element={<AdminArea><Suspense fallback={<PageSkeleton />}><AdminProjectsPage /></Suspense></AdminArea>} />
      <Route path="/admin/corrections" element={<AdminArea><Suspense fallback={<PageSkeleton />}><AdminCorrectionsPage /></Suspense></AdminArea>} />
      <Route path="/admin/learning" element={<AdminArea><Suspense fallback={<PageSkeleton />}><AdminLearningPage /></Suspense></AdminArea>} />
      <Route path="/admin/match" element={<AdminArea><Suspense fallback={<PageSkeleton />}><AdminMatchPage /></Suspense></AdminArea>} />
      <Route path="/workspace" element={<Navigate to="/admin" replace />} />
      <Route path="/workspace/experts" element={<Navigate to="/admin/experts" replace />} />
      <Route path="/workspace/experts/:id" element={<Navigate to="/admin/experts" replace />} />
      <Route path="/workspace/consultants" element={<Navigate to="/admin/experts" replace />} />
      <Route path="/workspace/match" element={<RedirectSearch to="/admin/match" />} />
      <Route path="/workspace/projects" element={<Navigate to="/admin/projects" replace />} />

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
      <Route path="/match" element={<RedirectSearch to="/admin/match" />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
