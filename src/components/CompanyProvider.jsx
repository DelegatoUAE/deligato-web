import { useCallback, useMemo, useState } from 'react';
import useApi from '../lib/useApi';
import { listCompanies, getReadinessOrNull } from '../lib/companies';
import { fetchCapitalMeta, getLatestRun } from '../lib/capital';
import { getEntitlements, FREE_ENTITLEMENTS } from '../lib/packages';
import { isStaff } from '../lib/auth';
import { CompanyContext } from './company-context';

const ACTIVE_KEY = 'conncct.active_company';
const readActive = () => { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } };

/**
 * The active company and everything most screens need about it. Each piece
 * loads and fails on its own, so one missing endpoint never blanks the app.
 */
export default function CompanyProvider({ me, children }) {
  const [chosen, setChosen] = useState(readActive);
  const companiesQ = useApi(() => listCompanies(), []);
  const companies = companiesQ.data;

  const company = useMemo(() => {
    if (!companies?.length) return null;
    return companies.find((c) => c.id === chosen) || companies[0];
  }, [companies, chosen]);
  const companyId = company?.id || null;

  const metaQ = useApi(() => fetchCapitalMeta(), []);
  const readinessQ = useApi(() => (companyId ? getReadinessOrNull(companyId) : null), [companyId]);
  const entQ = useApi(() => (companyId ? getEntitlements(companyId) : null), [companyId]);
  const runQ = useApi(() => (companyId ? getLatestRun(companyId) : null), [companyId]);

  const setCompanyId = useCallback((id) => {
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* per-tab only */ }
    setChosen(id);
  }, []);

  const { reload: reloadCompanies } = companiesQ;
  const { reload: reloadRun } = runQ;
  const { reload: reloadEnt } = entQ;
  const { reload: reloadMeta } = metaQ;

  const value = useMemo(() => {
    const ent = entQ.data?.entitlements || null;
    const plan = metaQ.data?.plan || null;
    const run = runQ.data || null;
    const hasRun = Boolean(run?.run_id);
    return {
      me,
      staff: isStaff(me),
      companies,
      companiesLoading: companiesQ.loading && companies === undefined,
      companiesError: companiesQ.error,
      company,
      companyId,
      setCompanyId,
      readiness: readinessQ.data ?? null,
      readinessLoading: readinessQ.loading && readinessQ.data === undefined,
      readinessError: readinessQ.error,
      meta: metaQ.data || null,
      plan,
      entitlements: ent || { ...FREE_ENTITLEMENTS, capital_plan: plan?.key || 'trial' },
      entitlementsKnown: Boolean(ent),
      entitlementsRaw: entQ.data || null,
      run,
      runLoading: runQ.loading && runQ.data === undefined,
      hasRun,
      capitalNeedConfirmed: Boolean(company?.capital_need_confirmed_at) || hasRun,
      reloadCompanies,
      reloadRun,
      reloadEntitlements: () => { reloadEnt(); reloadMeta(); },
    };
  }, [me, companies, companiesQ.loading, companiesQ.error, company, companyId, setCompanyId, readinessQ.data, readinessQ.loading, readinessQ.error,
    metaQ.data, entQ.data, runQ.data, runQ.loading, reloadCompanies, reloadRun, reloadEnt, reloadMeta]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}
