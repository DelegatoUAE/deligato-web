import { Navigate } from 'react-router-dom';
import { SkeletonCards } from '../design/ui';
import { useCompany } from './company-context';
import NotFoundPage from '../pages/NotFoundPage';
import { LoadError } from './capital/bits';

/**
 * First-run rules (ia.md §2):
 *  open       always shown
 *  company    needs an imported company, else back to Home (waiting state)
 *  confirmed  also needs a confirmed capital need, else /welcome
 *  welcome    needs a company; once confirmed, Home
 */
export default function FirstRunGuard({ gate = 'company', staffOnly = false, children }) {
  const { staff, company, companiesLoading, companiesError, reloadCompanies, capitalNeedConfirmed, runLoading } = useCompany();
  if (staffOnly && !staff) return <NotFoundPage />;
  if (gate === 'open') return children;
  if (companiesError && !company) return <LoadError error={companiesError} onRetry={reloadCompanies} what="your companies" />;
  if (companiesLoading) return <SkeletonCards count={3} />;
  if (!company) return <Navigate to="/" replace />;
  if (gate === 'confirmed' || gate === 'welcome') {
    if (runLoading) return <SkeletonCards count={3} />;
    if (gate === 'confirmed' && !capitalNeedConfirmed) return <Navigate to="/welcome" replace />;
    if (gate === 'welcome' && capitalNeedConfirmed) return <Navigate to="/" replace />;
  }
  return children;
}
