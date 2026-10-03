// Plan words for customer copy (packages-web.md W3–W6, D45/D46/D50). PURE.
// The ladder is Free → Company Intelligence → Capital Raising. Advisor is an
// optional branch, never an upgrade. Customer copy never says "unlimited".

const TIER_LABELS = { free: 'Free', company_intelligence: 'Company Intelligence', capital_raising: 'Capital Raising' };
// Catalog names of the self-service ids `upgrade_to` may list (api/modules/packages/catalog.js).
const NAMES = { 'readiness-free': 'Free', 'company-intelligence': 'Company Intelligence', 'capital-raising': 'Capital Raising', 'capital-readiness': 'Capital Readiness', 'capital-assessment': 'Capital Readiness Plus' };

/** entitlements.ladder_tier → badge text; null when unknown. */
export const tierLabel = (tier) => TIER_LABELS[tier] || null;

/** The id a 402 points to: the first `upgrade_to` entry, else Capital Raising. */
export function upgradeTarget(err) {
  const b = err?.body;
  const list = (b && (b.upgrade_to || b.error?.upgrade_to)) || [];
  const first = Array.isArray(list) ? list.find((id) => NAMES[id] && id !== 'readiness-free') : null;
  return first || 'capital-raising';
}

/** "Included in Capital Raising" (never "Investor-Ready"). */
export const includedIn = (id = 'capital-raising') => `Included in ${NAMES[id] || 'Capital Raising'}`;

export const packageName = (id) => NAMES[id] || null;

/** The link an upgrade CTA opens. */
export const upgradeHref = (id = 'capital-raising') => `/packages?highlight=${encodeURIComponent(id)}`;

/** Customer-facing entitlement value: the API's `display`, never a raw null and never "unlimited" (D46). */
export function displayValue(display, key) {
  const v = display && display[key];
  if (v === undefined || v === null || v === '') return '–';
  return /unlimited/i.test(String(v)) ? 'Full access / plan limits' : String(v);
}
