// Intelligence module (/api/v1/intelligence): versioned AI tasks with a
// rules-based fallback. Every result says which path ran.
import { apiFetch } from './auth';

export const runTask = (name, { input = {}, company_id } = {}) =>
  apiFetch(`/api/v1/intelligence/tasks/${name}`, { method: 'POST', body: JSON.stringify({ input, company_id }) });
