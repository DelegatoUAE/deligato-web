// Intelligence module (/api/v1/intelligence): versioned AI tasks with a
// rules-based fallback. Every result says which path ran.
import { apiFetch } from './auth';

// Ids go top-level: the server loads the founder's STORED rows for them
// (owner-checked) and replaces anything sent in `input` (ai-web-match-explanations.md).
export const runTask = (name, { input = {}, company_id, run_id, record_id, record_ids } = {}) =>
  apiFetch(`/api/v1/intelligence/tasks/${name}`, { method: 'POST', body: JSON.stringify({ input, company_id, run_id, record_id, record_ids }) });
