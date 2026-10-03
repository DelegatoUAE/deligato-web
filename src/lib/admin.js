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
