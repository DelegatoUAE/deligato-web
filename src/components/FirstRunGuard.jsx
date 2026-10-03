import { Navigate, useLocation } from 'react-router-dom';
import { SkeletonCards } from '../design/ui';
import { useCompany } from './company-context';
import NotFoundPage from '../pages/NotFoundPage';
import { LoadError } from './capital/bits';

/**
 * First-run rules (ia.md §2):
 *  open       always shown
 *  company    needs an imported company, else back to Home (waiting state)
 *  confirmed  also needs a confirmed capital need (or a run), else /capital/find
 *  welcome    needs a company; once confirmed, Home
 */
export default function FirstRunGuard({ gate = 'company', staffOnly = false, children }) {
  const { staff, company, companiesLoading, companiesError, reloadCompanies, capitalNeedConfirmed, runLoading } = useCompany();
  const { search } = useLocation();
  if (staffOnly && !staff) return <NotFoundPage />;
  if (gate === 'open') return children;
  if (companiesError && !company) return <LoadError error={companiesError} onRetry={reloadCompanies} what="your companies" />;
  if (companiesLoading) return <SkeletonCards count={3} />;
  if (!company) return <Navigate to="/" replace />;
  if (gate === 'confirmed' || gate === 'welcome') {
    if (runLoading) return <SkeletonCards count={3} />;
    // A run id in the URL means a run exists for this company: never bounce it.
    if (gate === 'confirmed' && !capitalNeedConfirmed && !/[?&]run=/.test(search)) return <Navigate to="/capital/find?confirm=1" replace />;
    if (gate === 'welcome' && capitalNeedConfirmed) return <Navigate to="/" replace />;
  }
  return children;
}
