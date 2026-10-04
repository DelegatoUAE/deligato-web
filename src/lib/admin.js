// Staff-only admin API (the Admin section). Every call is enforced by the API:
// founders get 403 or the founder-safe projection, never staff data.
import { apiFetch } from './auth';

const json = (body) => ({ body: JSON.stringify(body) });
const qs = (o) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')); return p.toString() ? `?${p}` : ''; };

// ---- experts (legacy consultants table; rates are staff-only)
export const listExperts = (f = {}) => apiFetch(`/consultants${qs(f)}`).then((d) => d.consultants || []);
export const createExpert = (body) => apiFetch('/consultants', { method: 'POST', ...json(body) }).then((d) => d.consultant);
export const updateExpert = (id, body) => apiFetch(`/consultants/${id}`, { method: 'PATCH', ...json(body) }).then((d) => d.consultant);
export const deleteExpert = (id) => apiFetch(`/consultants/${id}`, { method: 'DELETE' });

// ---- projects and allocations
export const PROJECT_STATUS = ['draft', 'active', 'on_hold', 'completed', 'cancelled'];
export const ALLOCATION_STATUS = ['proposed', 'confirmed', 'active', 'completed', 'cancelled'];
export const listProjects = (status) => apiFetch(`/projects${qs({ status })}`).then((d) => d.projects || []);
export const updateProject = (id, body) => apiFetch(`/projects/${id}`, { method: 'PATCH', ...json(body) }).then((d) => d.project);
export const listAllocations = (f = {}) => apiFetch(`/allocations${qs(f)}`).then((d) => d.allocations || []);
export const updateAllocation = (id, body) => apiFetch(`/allocations/${id}`, { method: 'PATCH', ...json(body) }).then((d) => d.allocation);

// ---- data corrections review queue (api/modules/data)
export const CORRECTION_STATUS = ['pending', 'accepted', 'rejected', 'applied'];
export const listCorrections = (status, offset = 0, limit = 50) => apiFetch(`/api/v1/data/corrections${qs({ status, limit, offset })}`);
export const reviewCorrection = (id, status, reviewerNote) => apiFetch(`/api/v1/data/corrections/${id}`, { method: 'PATCH', ...json({ status, reviewer_note: reviewerNote || undefined }) }).then((d) => d.correction);
export const exportCorrections = (dryRun) => apiFetch('/api/v1/data/corrections/export', { method: 'POST', ...json({ dry_run: !!dryRun }) });

// ---- learning (read-only + a review mark on weight suggestions)
export const getLearningMetrics = () => apiFetch('/api/v1/learning/metrics');
export const reviewWeightSuggestion = (file, status, note) => apiFetch(`/api/v1/learning/weight-suggestions/${encodeURIComponent(file)}/review`, { method: 'POST', ...json({ status, note }) }).then((d) => d.review);

// ---- platform oversight (api capital/admin.js, staff only) --------------
// The server returns 404 to a founder, so these never leak the surface.
const adminQs = (f = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v !== '' && v !== null && v !== undefined && v !== false) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const listPlatformCompanies = (f = {}) => apiFetch(`/capital/admin/companies${adminQs(f)}`);
export const listPlatformProviders = (f = {}) => apiFetch(`/capital/admin/providers${adminQs(f)}`);
// Company 360 and Provider 360 are audited on the server (migration 020);
// without the access log they answer 503 admin_audit_unavailable.
export const getCompany360 = (id) => apiFetch(`/capital/admin/companies/${encodeURIComponent(id)}`);
export const getProvider360 = (recordId) => apiFetch(`/capital/admin/providers/${encodeURIComponent(recordId)}`);
export const listRaises = (f = {}) => apiFetch(`/capital/admin/raises${adminQs(f)}`);
export const getMatchingOversight = (f = {}) => apiFetch(`/capital/admin/matching${adminQs(f)}`);
export const getAccessLog = (f = {}) => apiFetch(`/capital/admin/access-log${adminQs(f)}`);

/** Plain words for a machine flag. Staff read these at a glance all day. */
export const COMPANY_FLAG_LABEL = {
  incomplete_profile: 'Profile incomplete',
  never_assessed: 'Never assessed',
  need_not_confirmed: 'Need not confirmed',
  confirmed_but_never_matched: 'Confirmed, never matched',
  matched_but_no_shortlist: 'Matched, nothing shortlisted',
  runway_under_3_months: 'Runway under 3 months',
  stale_30_days: 'No activity in 30 days',
  financial_health_at_risk: 'Financial Health at risk',
  pipeline_idle: 'Pipeline idle',
  follow_ups_overdue: 'Follow-ups overdue',
  target_date_passed: 'Target date passed',
  last_match_ai_failed: 'Last match: AI step failed',
  target_date_infeasible: 'Target date too soon for route',
  raise_start_passed: 'Should already be raising',
  matched_provider_no_longer_active: 'Matched provider inactive',
};

export const RAISE_ISSUE_LABEL = {
  target_date_passed: 'Target date passed',
  raise_start_passed: 'Should already be raising',
  runway_under_3_months: 'Runway under 3 months',
  target_date_infeasible: 'Target too soon for route',
  stalled_pipeline: 'Pipeline stalled',
  confirmed_but_never_matched: 'Never matched',
  matched_but_no_shortlist: 'Nothing shortlisted',
  shortlist_not_contacted: 'Shortlist not contacted',
  never_assessed: 'Never assessed',
  target_date_soon_no_conversations: 'Target soon, no conversations',
  follow_ups_overdue: 'Follow-ups overdue',
};
export const URGENT_RAISE_ISSUES = new Set(['target_date_passed', 'raise_start_passed', 'runway_under_3_months', 'stalled_pipeline']);

/** Provider evidence classes. Sourced is not verified; missing shows no value. */
export const EVIDENCE_LABEL = { verified: 'Verified', sourced: 'Sourced', inferred: 'Inferred', missing: 'Missing' };
export const EVIDENCE_TONE = { verified: 'ok', sourced: 'neutral', inferred: 'warn', missing: 'bad' };

export const BUCKET_LABEL = { eligible: 'Verified fit', possible: 'Possible', likely_outside: 'Likely outside mandate' };
export const TIER_LABEL = { strong: 'Strong fit', possible: 'Possible fit', lead: 'Research lead' };
export const STAGE_LABEL = {
  shortlisted: 'Shortlisted', researching: 'Researching', intro_requested: 'Intro requested', contacted: 'Contacted',
  in_conversation: 'In conversation', diligence: 'Diligence', term_sheet: 'Term sheet', closed_won: 'Closed', passed: 'Passed', not_now: 'Not now',
};

export const PROVIDER_ISSUE_LABEL = {
  missing_stages: 'No stages',
  missing_sectors: 'No sectors',
  missing_accepts_hq: 'No geography',
  missing_instruments: 'No instruments',
  missing_ticket: 'No ticket size',
  unverified: 'Unverified',
  stale: 'Stale',
  deadline_passed: 'Deadline passed',
};

/** Flags that should pull a staff member's eye first. */
export const URGENT_COMPANY_FLAGS = new Set(['runway_under_3_months', 'confirmed_but_never_matched', 'financial_health_at_risk', 'target_date_passed', 'raise_start_passed']);
