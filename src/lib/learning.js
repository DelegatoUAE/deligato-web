// Learning module (/api/v1/learning): feedback, corrections, metrics.
import { apiFetch } from './auth';

const json = (method, body) => ({ method, body: JSON.stringify(body || {}) });

export const sendFeedback = (body) => apiFetch('/api/v1/learning/feedback', json('POST', body));
export const listFeedback = (companyId) => apiFetch(`/api/v1/learning/feedback?company_id=${encodeURIComponent(companyId)}`);
export const submitCorrection = (body) => apiFetch('/api/v1/learning/corrections', json('POST', body));
export const listCorrections = () => apiFetch('/api/v1/learning/corrections');
export const getMetrics = (companyId) => apiFetch(`/api/v1/learning/metrics${companyId ? `?company_id=${encodeURIComponent(companyId)}` : ''}`);
export const getInsights = (companyId, days = 90) => apiFetch(`/api/v1/learning/insights/${companyId}?days=${days}`);
export const recordNotFit = (body) => apiFetch('/api/v1/learning/outcomes', json('POST', { ...body, event: 'not_fit' }));

export const FEEDBACK_DOWN_REASONS = [
  { key: 'wrong_stage', label: 'Wrong stage' },
  { key: 'wrong_sector', label: 'Wrong sector' },
  { key: 'wrong_geography', label: 'Wrong geography' },
  { key: 'ticket_too_large', label: 'Ticket too big' },
  { key: 'ticket_too_small', label: 'Ticket too small' },
  { key: 'inactive', label: 'Not active' },
  { key: 'other', label: 'Other' },
];

export const CORRECTION_FIELDS = [
  { key: 'stages', label: 'Stages' },
  { key: 'sectors', label: 'Sectors' },
  { key: 'accepts_hq', label: 'Countries they back' },
  { key: 'ticket_min_usd', label: 'Minimum cheque' },
  { key: 'ticket_max_usd', label: 'Maximum cheque' },
  { key: 'instruments', label: 'Instruments' },
  { key: 'contact_route', label: 'How to contact them' },
  { key: 'website', label: 'Website' },
  { key: 'status', label: 'Still active?' },
  { key: 'application_open', label: 'Applications open' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'other', label: 'Something else' },
];
