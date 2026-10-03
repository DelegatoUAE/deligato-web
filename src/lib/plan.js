// Plan words for customer copy (packages-web.md W3–W6, D45/D46/D50). PURE.
// The ladder is Free → Company Intelligence → Capital Raising. Advisor is an
// optional branch, never an upgrade. Customer copy never says "unlimited".

const TIER_LABELS = { free: 'Free', company_intelligence: 'Company Intelligence', capital_raising: 'Capital Raising' };
// Catalog names of the self-service ids `upgrade_to` may list (api/modules/packages/catalog.js).
const NAMES = { 'readiness-free': 'Free', 'company-intelligence': 'Company Intelligence', 'capital-raising': 'Capital Raising', 'capital-readiness': 'Capital Readiness', 'capital-assessment': 'Capital Readiness Plus' };

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
