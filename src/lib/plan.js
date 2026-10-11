// Plan words for customer copy (packages-web.md W3–W6, D45/D46/D50; D73/D74 RC3 phase 2). PURE.
// The D73 ladder is Free → Capital Intelligence → Capital Raising. "Company Intelligence" is now the
// restricted live-layer bundle (Accounting plans, the $54/$99 services' 30 days), never an upgrade.
// Advisor is an optional branch, never an upgrade. Customer copy never says "unlimited" (D46), and
// every limit number comes from the API (entitlements, display or limits), never from this file.

const TIER_LABELS = { free: 'Free', company_intelligence: 'Company Intelligence', capital_intelligence: 'Capital Intelligence', capital_raising: 'Capital Raising' };
// Catalog names of the self-service ids `upgrade_to` may list (api/modules/packages/catalog.js).
const NAMES = {
  'readiness-free': 'Free', 'capital-intelligence': 'Capital Intelligence', 'capital-raising': 'Capital Raising',
  'company-intelligence': 'Company Intelligence', 'capital-readiness': 'Capital Readiness Report', 'capital-assessment': 'Capital Readiness + Advisor',
};
// The restricted bundle is never an upgrade target (D74 (2)).
const NOT_A_TARGET = ['readiness-free', 'company-intelligence'];

/** entitlements.ladder_tier → badge text; null when unknown. */
export const tierLabel = (tier) => TIER_LABELS[tier] || null;

/** The id a 402 points to: the first `upgrade_to` entry, else Capital Raising. */
const upgradeList = (err) => {
  const b = err?.body;
  const e = b && typeof b.error === 'object' && b.error ? b.error : {};
  const list = (b && (b.upgrade_to || e.upgrade_to || e.details?.upgrade_to)) || [];
  return Array.isArray(list) ? list : [];
};

export function upgradeTarget(err) {
  const list = upgradeList(err);
  const first = list.find((id) => NAMES[id] && !NOT_A_TARGET.includes(id));
  return first || 'capital-raising';
}

/** "Included in Capital Raising" (never "Investor-Ready"). */
export const includedIn = (id = 'capital-raising') => `Included in ${NAMES[id] || 'Capital Raising'}`;

export const packageName = (id) => NAMES[id] || null;

/** The link an upgrade CTA opens. */
export const upgradeHref = (id = 'capital-raising') => `/packages?highlight=${encodeURIComponent(id)}`;

/** Customer copy never says "unlimited" (D46): replace it with the approved words. */
export const fullAccess = (text) => String(text).replace(/\bunlimited\b/gi, 'Full access / plan limits');

/** Customer-facing entitlement value: the API's `display`, never a raw null and never "unlimited" (D46). */
export function displayValue(display, key) {
  const v = display && display[key];
  if (v === undefined || v === null || v === '') return '–';
  return /unlimited/i.test(String(v)) ? 'Full access / plan limits' : String(v);
}

const GATE_DEFAULT = {
  fair_use_limit: "You've reached this plan's fair-use limit.",
  seat_limit: 'Your plan has no free team seats.',
  upgrade_required: 'This is part of a paid plan.',
};

/**
 * One reading of every 402 (upgrade_required, fair_use_limit, seat_limit, shortlist_limit,
 * active_pipeline_limit): a calm message and at most one link to the plans page. A fair-use or
 * seat ceiling links only when the API names a plan above (never an upsell from Capital Raising,
 * never to advisor/consulting: D50).
 */
export function gateFor(err) {
  const e = err?.body && typeof err.body.error === 'object' && err.body.error ? err.body.error : {};
  const code = err?.code || e.code || 'upgrade_required';
  const ceiling = code === 'fair_use_limit' || code === 'seat_limit' || e.details?.fair_use === true || err?.body?.fair_use === true;
  const offers = upgradeList(err).some((id) => NAMES[id] && !NOT_A_TARGET.includes(id));
  const link = !ceiling || offers;
  const message = err?.message && !/^Request failed/.test(err.message) ? err.message : (GATE_DEFAULT[code] || GATE_DEFAULT.upgrade_required);
  return { code, message, href: link ? upgradeHref(upgradeTarget(err)) : null, cta: link ? 'See plans' : null };
}

/**
 * Does this entitlement view include ranked matches? Under D73 every plan does (Free 5,
 * Capital Intelligence 50, Capital Raising 200). Only a view with max_results 0 (a pre-D73
 * snapshot) reads as false. Unknown (no view yet) reads as true: the server stays the judge.
 */
export function hasMatching(ents) {
  if (!ents || ents.max_results === undefined) return true;
  return ents.max_results === null || Number(ents.max_results) > 0;
}

/** May this plan save NEW investors? (a shortlist exists on the plan; the server counts the slots). */
export function canShortlist(ents) {
  if (!ents) return true;
  const v = ents.shortlist_limit !== undefined ? ents.shortlist_limit : ents.pipeline_items;
  if (v === undefined) return true;
  return v === null || Number(v) > 0;
}

// ---- D73 levels (catalog ORDERS; the server enforces every one of them) -------------------

const ORDER = {
  ai_level: ['preview', 'copilot', 'advanced'],
  outreach_level: ['none', 'standard', 'full'],
  pipeline_level: ['none', 'core', 'advanced'],
  match_explanation_level: ['basic', 'full', 'full_advanced'],
};
/** True when `ents[key]` is at least `min` (unknown levels read as the lowest). */
export function atLeast(ents, key, min) {
  const list = ORDER[key];
  if (!list) return false;
  return list.indexOf(ents?.[key]) >= list.indexOf(min);
}
/** Contact routes and outreach drafts (Capital Intelligence and up). */
export const canOutreach = (ents) => atLeast(ents, 'outreach_level', 'standard') && Number(ents?.outreach_drafts_per_month || 0) > 0;
/** Notes, follow-ups and stage work beyond the shortlist (pipeline_level core and up). */
export const hasPipelineWorkflow = (ents) => atLeast(ents, 'pipeline_level', 'core');
/** Investor comparison, shortlist summary and meeting prep (Capital Raising: compare_tools). */
export const canCompare = (ents) => Boolean(ents && ents.compare_tools === true);
/** Basic explanations (Free): the company's own top N only, no contact routes, no excluded list. */
export const basicMatching = (ents) => Boolean(ents) && ents.match_explanation_level !== undefined && !atLeast(ents, 'match_explanation_level', 'full');

/** ladder tier → D73 plan id (for the API's per-plan d73_platform maps). */
export const planIdForTier = (tier) => ({ free: 'readiness-free', capital_intelligence: 'capital-intelligence', capital_raising: 'capital-raising', company_intelligence: 'company-intelligence' }[tier] || null);

/** The plan that shows more matches than this one (D73 ladder), or null at the top. */
export function nextPlanFor(tier) {
  if (tier === 'capital_raising') return null;
  if (tier === 'capital_intelligence') return 'capital-raising';
  return 'capital-intelligence';
}

// ---- D73 pipeline buckets (mirror of api capital/pipeline-buckets.js; a test pins the lists) ----

export const PIPELINE_BUCKETS = Object.freeze({
  shortlist: Object.freeze(['shortlisted', 'researching']),
  active: Object.freeze(['intro_requested', 'contacted', 'in_conversation', 'diligence', 'term_sheet']),
  history: Object.freeze(['closed_won', 'passed', 'not_now', 'rejected']),
});
/** stage → 'shortlist' | 'active' | 'history' | null. */
export function bucketOf(stage) {
  for (const [b, list] of Object.entries(PIPELINE_BUCKETS)) if (list.includes(stage)) return b;
  return null;
}
/** Counts per bucket from items (fallback when the API sends no `capacity`). */
export function countBuckets(items) {
  const out = { shortlist: 0, active: 0, history: 0 };
  for (const it of items || []) { const b = it.bucket || bucketOf(it.stage); if (b) out[b] += 1; }
  return out;
}

/**
 * One capacity reading for a bucket from GET /capital/pipeline `capacity` ({ used, limit }).
 * limit null = no number to show (fair use: never a ceiling in copy, D46).
 * → { used, limit, state: 'none' | 'ok' | 'full' | 'over' | 'uncapped', text, hint }
 */
export function capacityLine(cap, bucket) {
  const used = Number(cap?.used) || 0;
  const limit = cap && Number.isInteger(cap.limit) ? cap.limit : null;
  const noun = bucket === 'shortlist' ? 'shortlisted' : 'active in your pipeline';
  if (limit === null) return { used, limit, state: 'uncapped', text: `${used} ${noun}`, hint: null };
  if (limit === 0) {
    return {
      used, limit, state: 'none',
      text: bucket === 'shortlist' ? 'No shortlist on your plan' : used ? `${used} active, read-only on your plan` : 'Active pipeline not included on your plan',
      hint: used ? 'Move them to closed, passed or rejected, or remove them. They stay in your history.' : null,
    };
  }
  const base = `${used} of ${limit} ${noun}`;
  if (used > limit) {
    return { used, limit, state: 'over', text: base, hint: bucket === 'shortlist' ? 'Over your plan limit. Remove some, or move them to your history, before adding more.' : 'Over your plan limit. Move some to closed, passed or rejected to free a slot; nothing is deleted.' };
  }
  if (used === limit) {
    return { used, limit, state: 'full', text: base, hint: bucket === 'shortlist' ? 'Upgrade or remove one to add another.' : 'Closed, passed and rejected don\'t count. Move one there, or upgrade, to add another.' };
  }
  return { used, limit, state: 'ok', text: base, hint: null };
}

// ---- D73 limit rows (Plans, Settings, cards). Hidden limits never appear: the monthly run limit,
// AI calls and data room egress are fair-use values (D46, OD-14). ---------------------------------

/** "40 minutes" / "2 hours" from a number of minutes or the API's "Up to 120". null when none. */
export function advisoryLabel(v) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n % 60 === 0) return `${n / 60} ${n === 60 ? 'hour' : 'hours'}`;
  return `${n} minutes`;
}
const NOT_INCLUDED = /^not included$/i;
const seatsLabel = (v) => {
  if (typeof v === 'string') return v; // the public list sends words ("3 team members")
  if (!Number.isInteger(v)) return null;
  return v <= 1 ? 'Owner only' : `${v} team members`;
};
const storageLabel = (v) => {
  if (typeof v === 'string') return v;
  if (typeof v !== 'number') return null;
  return v > 0 ? `${v} GB` : 'Not included';
};

/** The labels used everywhere a plan's limits are listed. */
export const LIMIT_LABELS = {
  max_results: 'Ranked matches per run',
  shortlist_limit: 'Shortlist',
  active_pipeline_limit: 'Active pipeline',
  seats: 'Team members',
  deal_room_storage_gb: 'Data room storage',
  advisory_minutes_per_year: 'Expert time per subscription year',
};

/**
 * The D73 limit rows of one plan view: { display, limits, entitlements } as the API returns
 * them (signed-in entitlements, or a price-list / catalog plan). A row is left out when the API
 * gives nothing for it. → [{ key, label, value }]
 */
export function planLimitRows(view, pending = {}) {
  const d = view?.display || {};
  const lim = view?.limits || {};
  const ents = view?.entitlements || {};
  const rows = [];
  const later = (key, value) => (pending && pending[key] && !/^not included$/i.test(String(value)) ? `${value} (opens in a later release)` : value);
  const push = (key, value) => { if (value !== null && value !== undefined && value !== '') rows.push({ key, label: LIMIT_LABELS[key], value: later(key, fullAccess(value)) }); };
  push('max_results', d.max_results);
  push('shortlist_limit', d.shortlist_limit);
  push('active_pipeline_limit', d.active_pipeline_limit);
  push('seats', seatsLabel(lim.seats));
  push('deal_room_storage_gb', storageLabel(lim.deal_room_storage_gb));
  const adv = ents.advisory_minutes_per_year !== undefined ? ents.advisory_minutes_per_year : d.advisory_minutes_per_year;
  if (adv !== undefined) push('advisory_minutes_per_year', NOT_INCLUDED.test(String(adv)) || Number(adv) === 0 ? 'Not included' : advisoryLabel(adv));
  return rows;
}

/**
 * May an item move from `from` to `to`, by the capacity the API reported? (mirror of the api's
 * moveVerdict: the server stays the judge). History is always allowed; moving inside a bucket needs
 * the bucket on the plan; moving into another bucket needs a free slot. Unknown capacity: allowed.
 */
export function stageAllowed(from, to, capacity) {
  const t = bucketOf(to);
  if (!t) return false;
  if (t === 'history' || !capacity || !capacity[t]) return true;
  const limit = Number.isInteger(capacity[t].limit) ? capacity[t].limit : null;
  if (limit === null) return true;
  if (bucketOf(from) === t) return limit > 0;
  return (Number(capacity[t].used) || 0) < limit;
}
