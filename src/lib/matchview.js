// Pure helpers for the Matches table and compare view. No React, no network:
// unit-tested in matchview.test.js (npm test).
//
// D24: evidence buckets come first. Whatever column the founder sorts by,
// rows stay grouped by bucket (Verified fit, then Possible, then Likely
// outside), and the chosen sort applies inside each bucket. A sort never lifts
// a "Possible" result above a verified one.

export const BUCKET_RANK = { eligible: 0, possible: 1, likely_outside: 2 };
const CONF_RANK = { high: 3, medium: 2, low: 1 };
const FIT_RANK = { yes: 3, partial: 2, unknown: 1, no: 0 };
const FIT_KEYS = ['stage', 'sector', 'geography', 'ticket', 'business_model'];

const fitState = (s) => (s in FIT_RANK ? s : 'unknown');

/** How many of the five decisive criteria fit (yes), and how many are unknown. */
export function fitSummary(r) {
  const states = FIT_KEYS.map((k) => fitState(r?.fits?.[k]));
  return {
    yes: states.filter((s) => s === 'yes').length,
    partial: states.filter((s) => s === 'partial').length,
    unknown: states.filter((s) => s === 'unknown').length,
    no: states.filter((s) => s === 'no').length,
    total: FIT_KEYS.length,
  };
}

/** Sort value for one column. null means "not on record" and always sorts last. */
export function sortValue(r, key) {
  switch (key) {
    case 'name': return r.name ? String(r.name).toLowerCase() : null;
    case 'type': return r.type ? String(r.type).toLowerCase() : null;
    case 'location': return [r.country, r.city].filter(Boolean).join(' ').toLowerCase() || null;
    case 'score': return r.match_score ?? null;
    case 'confidence': return CONF_RANK[String(r.data_confidence || '').toLowerCase()] ?? null;
    case 'fits': { const f = fitSummary(r); return f.yes * 10 + f.partial * 3 - f.no * 20; }
    case 'ticket_size': return r.ticket_max_usd ?? r.ticket_min_usd ?? null;
    case 'deadline': return r.deadline ? new Date(r.deadline).getTime() : null;
    default: return FIT_KEYS.includes(key) ? FIT_RANK[fitState(r?.fits?.[key])] : null;
  }
}

/**
 * Sort rows by column inside their evidence bucket. dir: 'asc' | 'desc'.
 * Unknown values sort last in either direction. Stable on ties (original order).
 */
export function sortMatches(rows, key, dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const bk = (BUCKET_RANK[a.r.bucket] ?? 1) - (BUCKET_RANK[b.r.bucket] ?? 1);
      if (bk) return bk;
      if (!key) return a.i - b.i;
      const va = sortValue(a.r, key);
      const vb = sortValue(b.r, key);
      if (va === null && vb === null) return a.i - b.i;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return a.i - b.i;
    })
    .map((x) => x.r);
}

export const COMPARE_MAX = 3;

/** Toggle a record in the compare selection, never exceeding COMPARE_MAX. */
export function toggleCompare(selected, recordId) {
  if (selected.includes(recordId)) return selected.filter((id) => id !== recordId);
  if (selected.length >= COMPARE_MAX) return selected;
  return [...selected, recordId];
}

/** The approved Match score explainer (positioning.md §4), verbatim. UAT F28. */
export const MATCH_SCORE_EXPLAINER = 'Fit counts for most of the score. How much we know about the investor pulls it toward the middle. Unknown details never add points. This score is about fit, not your chance of raising.';

// R-CI-F3: order and tier come from the server (api capital/tier.js and the
// engine's rank). The web never recomputes either: its old rule differed from
// tier.js and diverged further once AI re-ranking was on.
/** Server order: stored runs by `rank`; a live engine response in array order. */
export function serverOrder(results) {
  if (results.length && results.every((r) => Number.isFinite(r.rank))) return results.slice().sort((a, b) => a.rank - b.rank);
  return results.slice();
}

/** The server's tier. A missing one is never promoted by the client: it reads as a research lead. */
export function serverTier(r) {
  if (r?.fit_tier) return r.fit_tier;
  if (typeof console !== 'undefined') console.warn('[capital] result without fit_tier', r?.record_id);
  return 'lead';
}

/** A run the founder scoped to chosen capital routes (R-CI-F1): its counts are route-scoped. */
export const isRouteScoped = (run) => Number(run?.counts?.filtered_out_by_route) > 0;

/**
 * UAT F08: a run made on a smaller plan keeps its few results after an upgrade.
 * True when today's plan would return more results than the run holds.
 * maxResults: the entitlement (null = the engine's full list, 200).
 */
export function runBelowPlan(run, maxResults) {
  if (!run || !Array.isArray(run.results)) return false;
  const limit = Number.isFinite(Number(maxResults)) && maxResults !== null ? Number(maxResults) : 200;
  const eligible = Number(run.counts?.eligible);
  if (!Number.isFinite(eligible)) return false;
  return run.results.length < Math.min(eligible, limit);
}
