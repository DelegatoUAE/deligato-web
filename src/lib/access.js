// Team & Access display rules (R-F2, R-BE-F7). The API is authoritative and
// answers 403 insufficient_role; these only hide controls that would fail.

/** Only an owner may remove the company. No `access_role` = an older API: today's behaviour. */
export const canDeleteCompany = (company) => !company?.access_role || company.access_role === 'owner';
