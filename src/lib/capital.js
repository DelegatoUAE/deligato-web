// ============================================================
// Capital Access — web API client (capital module, /capital/*)
//
// `apiFetch` from auth.js is the single network primitive. Every
// investor-profile fetch goes through getSource(recordId, companyId):
// the capital module writes the `viewed` outcome event from company_id
// (journey.md step 6). A call without a company id is a defect, so the
// helper refuses it.
// ============================================================

import { apiFetch } from './auth';
import { fmtUsd } from './format';

export { fmtUsd };

// ---- meta -------------------------------------------------------
export function fetchCapitalMeta() {
  return apiFetch('/capital/meta');
}

// ---- companies (capital_founder_profiles became companies, migration 002)
export function listProfiles() {
  return apiFetch('/capital/profiles');
}

export function getProfile(id) {
  return apiFetch(`/capital/profiles/${id}`);
}

export function updateProfile(id, fields) {
  return apiFetch(`/capital/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
}

// ---- matching ---------------------------------------------------
// The engine response carries fields the stored run does not (caveats,
// fit_reasons). Keep the latest responses in memory, keyed by run id, so
// the matches screen can show them after navigation.
const runCache = new Map();
export function cachedRunExtras(runId) {
  return runCache.get(runId) || null;
}

export async function runMatch(companyId, options = {}) {
  const res = await apiFetch(`/capital/profiles/${companyId}/match`, { method: 'POST', body: JSON.stringify(options) });
  if (res?.run_id) {
    const byRecord = new Map((res.results || []).map((r) => [r.record_id, { caveats: r.caveats, fit_reasons: r.fit_reasons, fit_tier: r.fit_tier, bucket: r.bucket, likely_outside_reasons: r.likely_outside_reasons, fit_provenance: r.fit_provenance || r.provenance, route_keys: r.route_keys }]));
    runCache.set(res.run_id, { byRecord, plan: res.plan, ai_gated: res.ai_gated, counts: res.counts, excluded_by_reason: res.counts?.excluded_by_reason });
    if (runCache.size > 10) runCache.delete(runCache.keys().next().value);
  }
  return res;
}

export function previewMatch(founder) {
  return apiFetch('/capital/match/preview', { method: 'POST', body: JSON.stringify(founder) });
}

export function listRuns(companyId) {
  return apiFetch(`/capital/runs?profile_id=${encodeURIComponent(companyId)}`);
}

export function getRun(runId) {
  return apiFetch(`/capital/runs/${runId}`);
}

export function getUnlocks(companyId) {
  return apiFetch(`/capital/profiles/${companyId}/unlocks`);
}

/** Latest run for a company, normalised, or null when none exists. */
export async function getLatestRun(companyId) {
  const { runs } = await listRuns(companyId);
  const latest = (runs || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  if (!latest) return null;
  return getRunNormalised(latest.id);
}

export async function getRunNormalised(runId) {
  const out = await getRun(runId);
  return normaliseRun(out.run, out.results);
}

export function normaliseRun(run, results, extra = {}) {
  const cached = run?.id ? runCache.get(run.id) : null;
  const items = (results || []).map((r) => {
    const x = cached?.byRecord.get(r.record_id);
    return normaliseResult(x ? { ...x, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== undefined)) } : r);
  });
  return {
    run_id: run?.id || extra.run_id || null,
    created_at: run?.created_at || null,
    provider: run?.provider || extra.provider || 'heuristic',
    ai_model: run?.ai_model || extra.ai_model || null,
    ai_error: run?.ai_error || extra.ai_error || null,
    counts: run?.counts || extra.counts || {},
    plan: extra.plan || cached?.plan || null,
    ai_gated: cached?.ai_gated || null,
    results: sortByTier(items),
  };
}

// ---- a single capital source: ALWAYS with the company id --------
export function getSource(recordId, companyId) {
  if (!companyId) {
    return Promise.reject(Object.assign(new Error('Select a company before opening an investor.'), { status: 400, code: 'missing_company_id' }));
  }
  return apiFetch(`/capital/sources/${encodeURIComponent(recordId)}?company_id=${encodeURIComponent(companyId)}`);
}

/** The one link every screen uses to open an investor profile. */
export function investorHref(recordId, runId) {
  return `/capital/matches/${encodeURIComponent(recordId)}${runId ? `?run=${runId}` : ''}`;
}

// ---- pipeline ---------------------------------------------------
export function listPipeline(companyId) {
  return apiFetch(`/capital/pipeline?profile_id=${encodeURIComponent(companyId)}`);
}

export function addToPipeline({ profile_id, record_id, match_score_at_add, stage = 'shortlisted', fit_tier_at_add, run_id }) {
  return apiFetch('/capital/pipeline', {
    method: 'POST',
    body: JSON.stringify({ profile_id, record_id, match_score_at_add, stage, fit_tier_at_add, run_id }),
  });
}

export function updatePipelineItem(id, fields) {
  return apiFetch(`/capital/pipeline/${id}`, { method: 'PATCH', body: JSON.stringify(fields) });
}

export function removeFromPipeline(id) {
  return apiFetch(`/capital/pipeline/${id}`, { method: 'DELETE' });
}

export const PIPELINE_STAGES = [
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'researching', label: 'Researching' },
  { key: 'intro_requested', label: 'Intro requested' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'in_conversation', label: 'In conversation' },
  { key: 'diligence', label: 'Diligence' },
  { key: 'term_sheet', label: 'Term sheet' },
  { key: 'closed_won', label: 'Closed — won' },
  { key: 'passed', label: 'Passed' },
  { key: 'not_now', label: 'Not now' },
];
export const ACTIVE_STAGES = PIPELINE_STAGES.slice(0, 7).map((s) => s.key);
export const stageLabel = (k) => PIPELINE_STAGES.find((s) => s.key === k)?.label || k;
export const stageIndex = (k) => PIPELINE_STAGES.findIndex((s) => s.key === k);

// ---- fit tiers (06-matches.md; client fallback until H2 lands) ----
export const FIT_DIMENSIONS = [
  { key: 'stage', label: 'Stage' },
  { key: 'sector', label: 'Sector' },
  { key: 'geography', label: 'Geography' },
  { key: 'ticket', label: 'Ticket' },
  { key: 'business_model', label: 'Model' },
];

export const TIERS = [
  { key: 'strong', label: 'Strong fit' },
  { key: 'possible', label: 'Possible fit' },
  { key: 'lead', label: 'Research leads' },
];
export const tierLabel = (k) => ({ strong: 'Strong fit', possible: 'Possible fit', lead: 'Research lead' }[k] || 'Research lead');

const normState = (s) => (['yes', 'partial', 'no', 'unknown'].includes(s) ? s : 'unknown');

export function fitTier(r) {
  const fits = r?.fits || {};
  const states = FIT_DIMENSIONS.map((d) => normState(fits[d.key]));
  const unknown = states.filter((s) => s === 'unknown').length;
  const conf = String(r?.data_confidence || '').toLowerCase();
  const lowConf = conf === 'low' || !conf;
  if (!states.includes('no') && normState(fits.stage) === 'yes' && normState(fits.geography) === 'yes' && unknown <= 1 && !lowConf) return 'strong';
  if (unknown <= 3 && !lowConf) return 'possible';
  return 'lead';
}

const TIER_ORDER = { strong: 0, possible: 1, lead: 2 };
const BUCKET_ORDER = { eligible: 0, possible: 1, likely_outside: 2 };
export function sortByTier(results) {
  return results.slice().sort((a, b) => ((BUCKET_ORDER[a.bucket] ?? 1) - (BUCKET_ORDER[b.bucket] ?? 1))
    || (TIER_ORDER[a.fit_tier] - TIER_ORDER[b.fit_tier])
    || ((b.match_score ?? -1) - (a.match_score ?? -1))
    || ((b.data_confidence_score ?? -1) - (a.data_confidence_score ?? -1)));
}

/** The one-line reason for a fit dimension, whichever shape the engine sent. */
export function fitReasonText(r, dim) {
  const fr = r?.fit_reasons?.[dim];
  if (!fr) return null;
  if (typeof fr === 'string') return fr;
  return fr.reason || null;
}

/** Engine result (POST /match) and stored row (GET /runs/:id) → one shape. */
export function normaliseResult(r) {
  const s = r.capital_sources || {};
  const pickv = (k) => (r[k] !== undefined && r[k] !== null ? r[k] : s[k] !== undefined ? s[k] : null);
  const out = {
    match_result_id: r.capital_sources ? r.id : (r.match_result_id || null),
    record_id: r.record_id,
    name: pickv('name'),
    type: pickv('type'),
    country: pickv('country'),
    city: pickv('city'),
    website: pickv('website'),
    application_url: pickv('application_url'),
    contact_route: pickv('contact_route'),
    application_open: pickv('application_open'),
    deadline: pickv('deadline'),
    next_intake: pickv('next_intake'),
    ticket_min_usd: pickv('ticket_min_usd'),
    ticket_max_usd: pickv('ticket_max_usd'),
    stages: pickv('stages') || [],
    sectors: pickv('sectors') || [],
    investor_types: pickv('investor_types') || [],
    match_score: r.match_score === null || r.match_score === undefined ? null : Number(r.match_score),
    data_confidence: r.data_confidence || null,
    data_confidence_score: r.data_confidence_score === undefined ? null : Number(r.data_confidence_score),
    fits: r.fits || {},
    fit_reasons: r.fit_reasons || null,
    why_matched: r.why_matched || null,
    ai_reasoning: r.ai_reasoning || null,
    caveats: Array.isArray(r.caveats) ? r.caveats : [],
    activity: r.activity || null,
    missing_from_your_profile: r.missing_from_your_profile || r.missing_from_profile || [],
    record_data_gaps: r.record_data_gaps || [],
    locked: Boolean(r.locked),
    bucket: r.bucket || null,
    likely_outside_reasons: r.likely_outside_reasons || [],
    fit_provenance: r.fit_provenance || r.provenance || null,
    route_keys: r.route_keys || null,
    headline: r.headline || null,
  };
  out.fit_tier = r.fit_tier || fitTier(out);
  out.bucket = out.bucket || bucketOf(out);
  return out;
}

// ---- D20/D24 evidence buckets ------------------------------------
// eligible: fits on verified or asserted evidence · possible: unknown or
// soft · likely_outside: their own published text suggests no (collapsed).
export const BUCKETS = [
  { key: 'eligible', label: 'Verified eligible', short: 'verified fits' },
  { key: 'possible', label: 'Possible: insufficient evidence', short: 'possible' },
  { key: 'likely_outside', label: 'Likely outside their mandate', short: 'likely outside mandate' },
];
/**
 * Client fallback when a stored result carries no bucket. Only the server can
 * see evidence tiers, so the client never promotes anything to "Verified
 * eligible": with no server bucket a result is at best "possible" (D24).
 */
export function bucketOf(r) {
  if ((r.likely_outside_reasons || []).length) return 'likely_outside';
  return 'possible';
}

// D16 labels for a fit chip. Server labels win (fit_provenance); otherwise
// the conservative reading: unknown → Unknown, an inference from their own
// text → AI Inferred, anything else → Public Source (never "Verified" without proof).
export const PROVENANCE_LABEL = {
  provider_verified: 'Capital Provider Verified', conncct_verified: 'Conncct Verified', licensed: 'Licensed Data Provider',
  public_source: 'Public Source', ai_inferred: 'AI Inferred', unknown: 'Unknown',
  verified: 'Conncct Verified', asserted: 'Public Source', inferred_read: 'AI Inferred', inferred_default: 'AI Inferred', weak_record: 'Public Source', absent: 'Unknown',
};
export function fitProvenance(r, dim) {
  const fr = r?.fit_reasons?.[dim];
  const p = r?.fit_provenance?.[dim] || (fr && typeof fr === 'object' ? (typeof fr.provenance === 'string' ? fr.provenance : fr.provenance?.label || fr.provenance?.key || fr.provenance?.tier) : null);
  if (p) return PROVENANCE_LABEL[p] || p;
  if (fr && typeof fr === 'object' && fr.inferred) return 'AI Inferred';
  if (normState(r?.fits?.[dim]) === 'unknown') return 'Unknown';
  if ((r?.likely_outside_reasons || []).some((x) => x.dimension === dim)) return 'AI Inferred';
  return 'Public Source';
}

export function confidenceLevel(c) {
  const v = String(c || '').toLowerCase();
  return ['high', 'medium', 'low'].includes(v) ? v : 'low';
}

export function ticketRange(min, max) {
  const lo = fmtUsd(min);
  const hi = fmtUsd(max);
  if (lo && hi) return `${lo}–${hi}`;
  if (lo) return `from ${lo}`;
  if (hi) return `up to ${hi}`;
  return null;
}

// ---- matching completeness: N of 9 (journey.md §4) ---------------
export const MATCH_INPUTS = [
  { key: 'stage', label: 'Stage', owner: 'conncct' },
  { key: 'sector', label: 'Sector', owner: 'conncct' },
  { key: 'business_model', label: 'Business model', owner: 'conncct' },
  { key: 'hq_country_iso2', label: 'HQ country', owner: 'conncct' },
  { key: 'raise_usd', label: 'Raise amount', owner: 'deligato' },
  { key: 'instrument', label: 'Instrument', owner: 'deligato' },
  { key: 'revenue_usd', label: 'Revenue', owner: 'conncct' },
  { key: 'target_markets', label: 'Target markets', owner: 'deligato' },
  { key: 'keywords', label: 'Keywords', owner: 'conncct' },
];

export function completeness(company) {
  if (!company) return { known: 0, total: 9, missing: MATCH_INPUTS };
  const has = (v) => !(v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0));
  const missing = MATCH_INPUTS.filter((i) => !has(company[i.key]));
  return { known: 9 - missing.length, total: 9, missing };
}

export const FILTER_LABEL = {
  stage: 'Stage',
  geography: 'Geography',
  ticket: 'Ticket size',
  instrument: 'Instrument',
  investor_type: 'Investor type',
  sector_exclusion: 'Sector exclusion',
  revenue: 'Revenue requirement',
  founder_requirements: 'Founder requirements',
  local_presence: 'Local presence',
  status: 'Status',
  business_model: 'Business model',
};
export const filterLabel = (k) => FILTER_LABEL[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ') : '');
