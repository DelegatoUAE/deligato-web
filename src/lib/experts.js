// Expert Access (D13, api/modules/experts at /api/v1/experts). The Expert
// Match Score is its own thing: never shown like an investor Match score or
// the readiness score. Rates are never shown to founders.
import { apiFetch } from './auth';

const base = '/api/v1/experts';
const post = (path, body) => apiFetch(`${base}${path}`, { method: 'POST', body: JSON.stringify(body || {}) });

export const getTaxonomy = () => apiFetch(`${base}/taxonomy`);
export const interpretNeed = (companyId, needText, factorKey) => post('/interpret', { company_id: companyId, need_text: needText, factor_key: factorKey });
export const matchExperts = (companyId, { needText, requirement, factorKey, adviceId, limit = 6 } = {}) =>
  post('/match', { company_id: companyId, need_text: needText, requirement, factor_key: factorKey, advice_id: adviceId, limit });
export const expertsForGap = (companyId, factorKey) => apiFetch(`${base}/for-gap?company_id=${encodeURIComponent(companyId)}&factor_key=${encodeURIComponent(factorKey)}`);
export const listDirectory = (params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return apiFetch(`${base}/directory${q ? `?${q}` : ''}`);
};
export const getExpert = (id, { companyId, requestId } = {}) =>
  apiFetch(`${base}/directory/${id}${requestId && companyId ? `?company_id=${companyId}&request_id=${requestId}` : ''}`);
export const listExpertRequests = (companyId) => apiFetch(`${base}/requests?company_id=${encodeURIComponent(companyId)}`);
export const getExpertRequest = (companyId, id) => apiFetch(`${base}/requests/${id}?company_id=${encodeURIComponent(companyId)}`);
export const requestExpertHelp = (body) => post('/requests', body);
export const shortlistExpert = (companyId, requestId, consultantId) => post(`/requests/${requestId}/shortlist`, { company_id: companyId, consultant_id: consultantId });
export const startExpertProject = (companyId, requestId, consultantId, dates = {}) =>
  post(`/requests/${requestId}/start-project`, { company_id: companyId, consultant_id: consultantId, ...dates });

/** Shown under the need box: concrete things founders ask for. */
export const NEED_EXAMPLES = [
  'Build a three-statement financial model for our Seed raise',
  'Fractional CFO for two days a week to get us investor-ready',
  'Tighten our pitch deck and narrative before investor meetings',
  'Set up our data room and prepare for due diligence',
  'Clean up our cap table and SAFE paperwork',
];

/** Advice / readiness skill name → plain need text for the matcher. */
export const SKILL_NEED = {
  'Financial model': 'Build a financial model for our raise',
  'Fractional CFO': 'A fractional CFO to strengthen runway, cash and financial planning',
  'Pitch & narrative': 'Sharpen our pitch and investment narrative',
  Valuation: 'Help with valuation and dilution for this round',
  'Data room': 'Prepare our data room and due diligence materials',
  'Legal & cap table': 'Legal and cap table clean-up before the round',
  'Market entry': 'Market entry planning for a new country',
};

export const SENIORITY = { junior: 'Junior', mid: 'Mid', senior: 'Senior', principal: 'Principal' };
export const AVAILABILITY = {
  available: { label: 'Available', tone: 'ok' },
  partial: { label: 'Partially available', tone: 'warn' },
  booked: { label: 'Booked', tone: 'bad' },
  leave: { label: 'On leave', tone: 'neutral' },
};
export const EXPERT_CHIP_LABEL = { expertise: 'Expertise', sector: 'Sector', stage: 'Stage', region: 'Region', availability: 'Availability' };

// Briefs: the experts API keys a brief by its request id. The latest
// requirement and results per brief are kept in session so the results and
// profile pages can show fit context without re-running the matcher.
const BRIEF_KEY = (id) => `conncct.brief.${id}`;
export function saveBrief(id, data) { try { sessionStorage.setItem(BRIEF_KEY(id), JSON.stringify(data)); } catch { /* optional */ } }
export function readBrief(id) { try { return JSON.parse(sessionStorage.getItem(BRIEF_KEY(id)) || 'null'); } catch { return null; } }

export const ENGAGEMENT = { advisory: 'Advice sessions', project: 'A defined project', fractional: 'Fractional (part-time)', interim: 'Interim (full-time cover)' };
export const URGENCY = { urgent: 'This week', soon: 'Soon', flexible: 'Flexible' };

/** Founder-facing project status (20 §6). */
export function projectStatus(project, allocation) {
  const s = project?.status || allocation?.status;
  if (s === 'draft' || s === 'proposed') return 'Requested · waiting for the expert to confirm';
  if (s === 'active' || s === 'confirmed') return 'In progress';
  if (s === 'on_hold') return 'Paused';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled') return 'Cancelled';
  return 'Requested · waiting for the expert to confirm';
}



export const listShortlist = (companyId) => apiFetch(`/api/v1/experts/shortlist?company_id=${encodeURIComponent(companyId)}`);
export const listProjects = (companyId, status) => apiFetch(`/api/v1/experts/projects?company_id=${encodeURIComponent(companyId)}${status ? `&status=${status}` : ''}`);
export const updateProject = (companyId, id, body) =>
  apiFetch(`/api/v1/experts/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ company_id: companyId, ...body }) });

/** Shortlist works with or without a brief (duplicate: true on repeat). */
export const shortlistDirect = (companyId, expertId, requestId) => post('/shortlist', { company_id: companyId, expert_id: expertId, request_id: requestId || undefined });
export const updateBrief = (companyId, briefId, requirement) =>
  apiFetch(`${base}/briefs/${briefId}`, { method: 'PATCH', body: JSON.stringify({ company_id: companyId, requirement }) });
/** Expert profile with fit (null without a brief) and per-field provenance; records 'viewed'. */
export const getExpertProfile = (expertId, companyId, requestId) =>
  apiFetch(`${base}/${expertId}?company_id=${encodeURIComponent(companyId)}${requestId ? `&request_id=${encodeURIComponent(requestId)}` : ''}`);
