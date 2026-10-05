// Plan words for customer copy (packages-web.md W3–W6, D45/D46/D50). PURE.
// The ladder is Free → Company Intelligence → Capital Raising. Advisor is an
// optional branch, never an upgrade. Customer copy never says "unlimited".

const TIER_LABELS = { free: 'Free', company_intelligence: 'Company Intelligence', capital_raising: 'Capital Raising' };
// Catalog names of the self-service ids `upgrade_to` may list (api/modules/packages/catalog.js).
const NAMES = { 'readiness-free': 'Free', 'company-intelligence': 'Company Intelligence', 'capital-raising': 'Capital Raising', 'capital-readiness': 'Capital Readiness Report', 'capital-assessment': 'Capital Readiness + Advisor' };

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
  const first = Array.isArray(list) ? list.find((id) => NAMES[id] && id !== 'readiness-free') : null;
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
 * One reading of every 402 (upgrade_required, fair_use_limit, seat_limit): a calm message and at
 * most one link to the plans page. A fair-use or seat ceiling links only when the API names a plan
 * above (never an upsell from Capital Raising, never to advisor/consulting: D50).
 */
export function gateFor(err) {
  const e = err?.body && typeof err.body.error === 'object' && err.body.error ? err.body.error : {};
  const code = err?.code || e.code || 'upgrade_required';
  const ceiling = code === 'fair_use_limit' || code === 'seat_limit' || e.details?.fair_use === true;
  const offers = upgradeList(err).some((id) => NAMES[id] && id !== 'readiness-free');
  const link = !ceiling || offers;
  const message = err?.message && !/^Request failed/.test(err.message) ? err.message : (GATE_DEFAULT[code] || GATE_DEFAULT.upgrade_required);
  return { code, message, href: link ? upgradeHref(upgradeTarget(err)) : null, cta: link ? 'See plans' : null };
}

/**
 * D68: does this entitlement view include investor/provider matching? Free does not
 * (max_results 0). Unknown (no view yet) reads as true: the server stays the judge and
 * answers 402 when the plan does not include it.
 */
export function hasMatching(ents) {
  if (!ents || ents.max_results === undefined) return true;
  return ents.max_results === null || Number(ents.max_results) > 0;
}

/** D68: may this plan save NEW investors or move stages? Free keeps earlier saves read-only. */
export function canShortlist(ents) {
  if (!ents || ents.pipeline_items === undefined) return true;
  return ents.pipeline_items === null || Number(ents.pipeline_items) > 0;
}

/** D68 copy, shared by every Free upgrade state (Matches, Find Capital, Saved, Pipeline, profile). */
export const MATCHING_UPGRADE = {
  title: 'Investor matching is part of Capital Raising',
  body: 'Free and Company Intelligence show where your company stands and which types of capital fit, without naming providers. Capital Raising adds matched investors and capital providers, why each one fits, the evidence behind it, your shortlist and pipeline, and outreach.',
  readOnly: 'Investors you saved earlier stay here, read-only. You can remove them. Saving more, moving stages and outreach are part of Capital Raising.',
  cta: 'Unlock Capital Raising',
};

const listWords = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * D69 locked teaser words, from the API's aggregate only (a real engine run). null when there is
 * nothing honest to say (no preview, a count of 0, or not a whole number): never an estimate.
 */
export function previewLines(preview) {
  const n = preview && Number.isInteger(preview.potential_fits) ? preview.potential_fits : 0;
  if (n <= 0) return null;
  const regions = Array.isArray(preview.regions) ? preview.regions.filter((x) => typeof x === 'string' && x).slice(0, 3) : [];
  return {
    count: `${n.toLocaleString('en-US')} potential capital ${n === 1 ? 'match' : 'matches'} identified.`,
    regions: regions.length ? `Potential fits across ${listWords(regions)} investors.` : null,
    upgrade: 'Upgrade to Capital Raising to see who fits your company and why.',
  };
}
