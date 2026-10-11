// Packages (api/modules/packages, mounted at /api/v1/packages).
// Prices come only from the catalog (D4). No payment is taken here (D9).
import { apiFetch } from './auth';

export const getCatalog = () => apiFetch('/api/v1/packages/catalog');
export const getRecommendation = (companyId, raiseTiming) =>
  apiFetch(`/api/v1/packages/recommendation/${companyId}${raiseTiming ? `?raise_timing=${encodeURIComponent(raiseTiming)}` : ''}`);
export const getEntitlements = (companyId) => apiFetch(`/api/v1/packages/entitlements/${companyId}`);
export const selectPackage = (companyId, code) =>
  apiFetch('/api/v1/packages/selection', { method: 'POST', body: JSON.stringify({ company_id: companyId, code }) });
export const setPocPlan = (companyId, plan) =>
  apiFetch('/api/v1/packages/poc-plan', { method: 'PATCH', body: JSON.stringify({ company_id: companyId, plan }) });

/** Free-tier defaults (catalog FREE_ENTITLEMENTS) used only to gate the UI when entitlements can't be read. */
export const FREE_ENTITLEMENTS = {
  max_results: 5, pipeline_items: 5, shortlist_limit: 5, active_pipeline_limit: 0, investor_profile_depth: 'summary', ai_matching: false, // D73 Free
  outreach_drafts_per_month: 0, outreach_level: 'none', pipeline_level: 'none', ai_level: 'preview', match_explanation_level: 'basic',
  data_room: 'checklist', crm: false, compare_tools: false, improvement_plan: 'top3', capital_plan: 'trial',
};
