// Fundraising module (/api/v1/fundraising/:companyId/...): data room,
// outreach drafts (draft-only, D5), CRM activities, outcomes.
import { apiFetch } from './auth';

const base = (id) => `/api/v1/fundraising/${id}`;
const json = (method, body) => ({ method, body: JSON.stringify(body || {}) });

export const getFundraisingMeta = () => apiFetch('/api/v1/fundraising/meta');

// ---- data room
export const getDataRoom = (id) => apiFetch(`${base(id)}/dataroom`);
export const addDataRoomItem = (id, body) => apiFetch(`${base(id)}/dataroom/items`, json('POST', body));
export const setDataRoomItemStatus = (id, key, body) => apiFetch(`${base(id)}/dataroom/items/${encodeURIComponent(key)}`, json('PATCH', body));
/** PATCH one row by id (document_date / expires_at; null clears; verified_at is server-only). */
export const updateDataRoomDoc = (id, docId, body) => apiFetch(`${base(id)}/dataroom/items/${docId}`, json('PATCH', body));
export const deleteDataRoomDoc = (id, docId) => apiFetch(`${base(id)}/dataroom/items/${docId}`, { method: 'DELETE' });

// ---- data room stored files (U-1): raw bytes to the API, which checks the
// plan, the type (by content), the size and the quota, and stores the file in
// private storage. Viewing returns a 60-second signed URL; it is used at once
// and never kept.
const fileHeaders = (file) => ({ 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) });
export function uploadDataRoomFile(id, docType, file, { document_date, expires_at, title } = {}) {
  const q = new URLSearchParams({ doc_type: docType });
  if (document_date) q.set('document_date', document_date);
  if (expires_at) q.set('expires_at', expires_at);
  if (title) q.set('title', title);
  return apiFetch(`${base(id)}/dataroom/files?${q}`, { method: 'POST', headers: fileHeaders(file), body: file });
}
export const replaceDataRoomFile = (id, docId, file) => apiFetch(`${base(id)}/dataroom/files/${docId}`, { method: 'PUT', headers: fileHeaders(file), body: file });
export const getDataRoomFileUrl = (id, docId, { download = false } = {}) => apiFetch(`${base(id)}/dataroom/files/${docId}/url${download ? '?download=1' : ''}`);
export const getDataRoomFileActivity = (id, docId) => apiFetch(`${base(id)}/dataroom/files/${docId}/activity`);

// ---- outreach (the system drafts; the founder sends)
export const listDrafts = (id) => apiFetch(`${base(id)}/outreach/drafts`);
export const getDraft = (id, draftId) => apiFetch(`${base(id)}/outreach/drafts/${draftId}`);
export const createDraft = (id, body) => apiFetch(`${base(id)}/outreach/drafts`, json('POST', body));
export const updateDraft = (id, draftId, body) => apiFetch(`${base(id)}/outreach/drafts/${draftId}`, json('PATCH', body));
/** The founder confirms they sent it themselves. The API wants the draft marked
 *  ready (approved) first, so this does both, in order. */
export async function markDraftSent(id, draftId, currentStatus) {
  if (currentStatus === 'draft') await apiFetch(`${base(id)}/outreach/drafts/${draftId}`, json('PATCH', { status: 'approved' }));
  return apiFetch(`${base(id)}/outreach/drafts/${draftId}`, json('PATCH', { status: 'sent_by_founder' }));
}
export const deleteDraft = (id, draftId) => apiFetch(`${base(id)}/outreach/drafts/${draftId}`, json('PATCH', { status: 'discarded' }));

// ---- CRM + outcomes
export const listActivities = (id, recordId) => apiFetch(`${base(id)}/activities${recordId ? `?record_id=${encodeURIComponent(recordId)}` : ''}`);
export const createActivity = (id, body) => apiFetch(`${base(id)}/activities`, json('POST', body));
export const getTimeline = (id, recordId) => apiFetch(`${base(id)}/investors/${encodeURIComponent(recordId)}/timeline`);
export const recordOutcome = (id, body) => apiFetch(`${base(id)}/outcomes`, json('POST', body));
export const listOutcomes = (id) => apiFetch(`${base(id)}/outcomes`);

/** Outreach kinds by contact route (10-outreach.md). */
export const DRAFT_KINDS = [
  { key: 'cold_email', label: 'Cold email' },
  { key: 'intro_request', label: 'Intro request' },
  { key: 'application', label: 'Application answers' },
  { key: 'platform', label: 'Platform profile summary' },
];
export const draftKindLabel = (k) => DRAFT_KINDS.find((d) => d.key === k)?.label || 'Draft';
export function kindForRoute(route) {
  switch (route) {
    case 'Online application': return 'application';
    case 'Pitch email': return 'cold_email';
    case 'Warm intro only': return 'intro_request';
    case 'Platform': return 'platform';
    case 'Invitation only': return null;
    default: return 'cold_email';
  }
}

export const DRAFT_STATUS = { draft: 'Draft', approved: 'Ready', sent_by_founder: 'Marked sent', discarded: 'Discarded' };

/** Pass reasons (11-pipeline.md), codes from outcome vocabulary. */
export const PASS_REASONS = [
  { key: 'stage_too_early', label: 'Stage too early' },
  { key: 'stage_too_late', label: 'Stage too late' },
  { key: 'sector_not_in_thesis', label: 'Not in their thesis' },
  { key: 'geography', label: 'Geography' },
  { key: 'ticket_size', label: 'Cheque size' },
  { key: 'traction_insufficient', label: 'Traction' },
  { key: 'team', label: 'Team' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'timing_fund_cycle', label: 'Fund timing' },
  { key: 'no_reason_given', label: 'No reason given' },
  { key: 'other', label: 'Other' },
];
export const passReasonLabel = (k) => PASS_REASONS.find((r) => r.key === k)?.label
  || ({ not_now: 'Not now', no_response: 'No response', bounced: 'Bounced' }[k]) || k;
