import { createContext, useContext } from 'react';

export const CompanyContext = createContext(null);

/** { me, staff, companies, company, companyId, setCompanyId, readiness, plan, entitlements, run, ... } */
export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside CompanyProvider');
  return ctx;
}
