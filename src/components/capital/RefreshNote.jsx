import { useCompany } from '../company-context';
import { apiFetch } from '../../lib/auth';
import useApi from '../../lib/useApi';
import { hasMonthlyRefresh, refreshDetail, refreshNote } from '../../lib/capitalExport';

/**
 * The small "Refreshed on <date>: 3 new fits, 1 removed" note on Matches, from the monthly re-run
 * (GET /api/v1/match-refresh/:companyId/latest). Nothing when the plan has no monthly refresh or
 * no refresh has happened yet; a failed read shows nothing rather than an error.
 */
export default function RefreshNote() {
  const { companyId, entitlements } = useCompany();
  const on = Boolean(companyId) && hasMonthlyRefresh(entitlements);
  const q = useApi(() => (on ? apiFetch(`/api/v1/match-refresh/${encodeURIComponent(companyId)}/latest`).catch(() => null) : null), [companyId, on]);
  const text = refreshNote(q.data?.refresh);
  if (!on || !text) return null;
  return <span className="ui-muted refresh-note" title={refreshDetail(q.data.refresh) || undefined} role="status">{text}</span>;
}
