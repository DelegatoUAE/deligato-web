// Companies (from Conncct) + the capital need (the one Deligato intake, D8).
//
// Company reads use GET /capital/profiles/:id until the companies module
// (GET /api/v1/companies/:id, ia.md §5) exists: both read the same
// `companies` row (migration 002). The capital-need write tries the
// documented PATCH /api/v1/companies/:id/capital-need first and falls back
// to the capital module's owner-scoped PATCH for the four matching fields.

import { apiFetch, isMissingEndpoint } from './auth';
import { getProfile, listProfiles, updateProfile } from './capital';

export async function listCompanies() {
  const { profiles } = await listProfiles();
  return (profiles || []).map(normaliseCompany);
}

export async function getCompany(id) {
  try {
    const out = await apiFetch(`/api/v1/companies/${id}`);
    return normaliseCompany(out.company || out);
  } catch (e) {
    if (!isMissingEndpoint(e)) throw e;
  }
  const { profile } = await getProfile(id);
  return normaliseCompany(profile);
}

export function normaliseCompany(c) {
  if (!c) return c;
  return { ...c, name: c.name || c.company_name || 'Your company' };
}

const NEED_FIELDS = ['raise_usd', 'instrument', 'investor_types_sought', 'target_markets'];

/**
 * Save the capital need. Returns { company, timingSaved, confirmed_at, via }.
 * via 'routing' = PATCH /api/v1/routing/:id/capital-need; 'capital' = fallback, in which
 * case raise_timing and the confirmation stamp could not be stored.
 */
export async function saveCapitalNeed(id, need) {
  const patch = (body) => apiFetch(`/api/v1/routing/${id}/capital-need`, { method: 'PATCH', body: JSON.stringify({ ...body, confirm: true }) });
  const done = (out, extra = {}) => ({ company: { id, ...out.capital_need }, confirmed_at: out.capital_need?.confirmed_at || null, timingSaved: true, via: 'routing', routing: out.routing, ...extra });
  try {
    // The capital need lives with routing (it feeds routes first): saves and confirms.
    return done(await patch(need));
  } catch (e) {
    // D46 target funding date before migration 018: the API refuses the field
    // with a per-field `not_stored_yet`. Save everything else and say so.
    const why = e?.body?.error?.fields?.target_funding_date;
    if (e.status === 400 && typeof why === 'string' && why.startsWith('not_stored_yet') && 'target_funding_date' in need) {
      const rest = { ...need };
      delete rest.target_funding_date;
      return done(await patch(rest), { targetNotStored: true });
    }
    if (!isMissingEndpoint(e)) throw e;
  }
  const fields = {};
  for (const f of NEED_FIELDS) if (need[f] !== undefined) fields[f] = need[f];
  const { profile } = await updateProfile(id, fields);
  return { company: normaliseCompany(profile), confirmed_at: null, timingSaved: false, via: 'capital' };
}

/** Removes the company and its Deligato data (runs, pipeline, drafts, documents). Conncct is untouched. */
export function deleteCompany(id) {
  return apiFetch(`/capital/profiles/${id}`, { method: 'DELETE' });
}

/** Company onboarding for a founder who doesn't arrive from Conncct: creates the companies row. */
export async function createCompany(fields) {
  const { profile } = await apiFetch('/capital/profiles', { method: 'POST', body: JSON.stringify(fields) });
  return normaliseCompany(profile);
}

// ---- readiness, exactly as Conncct sent it (never computed here) ----
export function getReadiness(id) {
  return apiFetch(`/api/v1/conncct/companies/${id}/readiness`);
}

/** Readiness or null when Conncct hasn't scored the company (404 not_found). */
export async function getReadinessOrNull(id) {
  try {
    const out = await getReadiness(id);
    return out && out.readiness ? out : null;
  } catch (e) {
    if (e.status === 404 && e.code === 'not_found') return null;
    throw e;
  }
}

// ---- dev import (H13; staff + VITE_DEV_IMPORT only) -------------
export function listFixtures() {
  return apiFetch('/api/v1/conncct/dev/fixtures');
}
export function importFixture(body) {
  return apiFetch('/api/v1/conncct/dev/import', { method: 'POST', body: JSON.stringify(body) });
}
export function validatePayload(payload) {
  return apiFetch('/api/v1/conncct/dev/validate', { method: 'POST', body: JSON.stringify({ payload }) });
}

/** The 6 QA personas (api/db/seed/test-companies.json, fixed ids). Labels only; data comes from the API. */
export const PERSONA_FIXTURES = [
  { key: 'uae-fintech-seed', company_id: '10000000-0000-4000-a000-000000000001', label: 'Ledgerline · UAE fintech · Seed', email: 'founder.uae@test.local' },
  { key: 'us-ai-devtools-preseed', company_id: '10000000-0000-4000-a000-000000000002', label: 'Stackhound · US devtools · Pre-seed', email: 'founder.us@test.local' },
  { key: 'saudi-proptech-series-a', company_id: '10000000-0000-4000-a000-000000000003', label: 'Bayt Grid · KSA proptech · Series A', email: 'founder.ksa@test.local' },
  { key: 'uk-climate-hardware-seed-lowready', company_id: '10000000-0000-4000-a000-000000000004', label: 'Thermadyne Loop · UK climate hardware · Seed', email: 'founder.uk@test.local' },
  { key: 'egypt-edtech-preseed-revenue', company_id: '10000000-0000-4000-a000-000000000005', label: 'Fasla · Egypt edtech · Pre-seed', email: 'founder.eg@test.local' },
  { key: 'india-healthtech-series-a-strong', company_id: '10000000-0000-4000-a000-000000000006', label: 'PulseCare Diagnostics · India healthtech · Series A', email: 'founder.in@test.local' },
];

// No outbound links to the readiness partner: Conncct is in stealth (coordinator, 3 Oct).

// ---- readiness provider adapter (D14) ---------------------------
// Conncct's 14-question engine behind the bridge. Questions and wording come
// from the provider; Deligato never edits the methodology.
export const getReadinessQuestions = () => apiFetch('/api/v1/conncct/readiness/questions');
export const assessReadiness = (companyId, answers) =>
  apiFetch('/api/v1/conncct/readiness/assess', { method: 'POST', body: JSON.stringify({ company_id: companyId, answers }) });
