// Pricing and billing words for customer copy (D60/D61, D46, D50). PURE (imports only lib/plan.js).
// Every price, label and limit comes from GET /api/v1/billing/plans; nothing here
// knows an amount. These helpers only arrange and word what the API returns.

import { advisoryLabel, fullAccess } from './plan.js';

/** The stage each product answers (D73: Explore → Prepare & manage → Run your raise; the two services assess). */
const STAGE = {
  'readiness-free': 'Explore',
  'capital-readiness': 'Assess',
  'capital-assessment': 'Assess',
  'capital-intelligence': 'Prepare & manage',
  'capital-raising': 'Run your raise',
};
export const stageOf = (id) => STAGE[id] || null;

/** Customer copy never carries internal decision refs like "(D61)", and never the word plan.js replaces (D46). */
export function cleanCopy(text) {
  if (text === undefined || text === null) return '';
  return fullAccess(String(text)
    .replace(/\s*\((?:D\d+[^)]*)\)/g, ''))
    .replace(/:\s*$/, '')
    .trim();
}

/** Every priced item in the API's order (self-serve items with a price only). */
export function columnsOf(data) {
  const plans = Array.isArray(data?.plans) ? data.plans : [];
  return plans.filter((p) => Array.isArray(p.prices) && p.prices.length > 0);
}

const CADENCE = { monthly: '/ month', annual: '/ year', six_months: 'for 6 months', one_time: 'one-time', free: '' };

/** "$1,290" from a number; null when the API gave none. */
export function money(amount) {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return null;
  const n = Number(amount);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** { amount: '$99', cadence: '/ month' } for one price row. */
export function priceParts(price) {
  if (!price) return { amount: null, cadence: '' };
  if (price.billing === 'free' || Number(price.amount_usd) === 0) return { amount: '$0', cadence: '' };
  const term = price.billing === 'six_months' && price.term_months ? `for ${price.term_months} months` : null;
  return { amount: money(price.amount_usd), cadence: term || CADENCE[price.billing] || '' };
}

/** "$99 / month" style one-liner for a price row. */
export function priceLine(price) {
  const { amount, cadence } = priceParts(price);
  return [amount, cadence].filter(Boolean).join(' ');
}

/**
 * The founding label for Capital Raising, worded from the API's rows:
 * "Founding price: $99/month, locked for 12 months, or $549 for 6 months".
 * null when the current version carries no lock (standard pricing).
 */
export function foundingLabel(plan, versionLabel) {
  const prices = plan?.prices || [];
  const monthly = prices.find((p) => p.billing === 'monthly' && p.locked_months);
  if (!monthly) return null;
  const pass = prices.find((p) => p.billing === 'six_months');
  const head = `${cleanCopy(versionLabel) || 'Founding price'}: ${money(monthly.amount_usd)}/month, locked for ${monthly.locked_months} months`;
  return pass ? `${head}, or ${money(pass.amount_usd)} for ${pass.term_months || 6} months` : head;
}

/** Lines that depend on the Living Deal Room, which is launching (D55, D60). */
export const isLaunching = (line) => /deal room|data room[^.]*\bshar|secure share/i.test(String(line || ''));

/** Customer label for an entitlement or limit value (D46). */
export function limitLabel(v) {
  if (v === undefined || v === null || v === '') return '–';
  return fullAccess(v);
}

/** The plan whose ladder tier matches (free | capital_intelligence | capital_raising). */
export const planForTier = (data, tier) => columnsOf(data).find((p) => p.tier && p.tier === tier) || null;

/** The name the API gives a product id, from the price list. */
export function productName(data, id) {
  const p = (data?.plans || []).find((x) => x.id === id);
  return p ? p.name : null;
}


/**
 * What a failed POST /checkout (or cancel/refund) means for the founder.
 * kind: 'payments_off' (calm, honest: nothing charged) | 'conflict' | 'error'.
 * Never a success.
 */
export function billingErrorCopy(err) {
  const code = err?.code || null;
  if (code === 'payments_not_enabled') {
    return { kind: 'payments_off', title: 'Payments open soon.', body: "Your plan isn't charged yet. Nothing has been taken, and no card details were asked for." };
  }
  if (code === 'billing_unavailable') {
    return { kind: 'payments_off', title: 'Billing is not switched on here yet.', body: 'Nothing has been charged. Your current plan carries on as it is.' };
  }
  if (code === 'provider_error') {
    return { kind: 'error', title: "The payment page didn't open.", body: 'Nothing has been charged. Please try again in a moment.' };
  }
  if (code === 'price_not_offered') {
    return { kind: 'conflict', title: "That price isn't offered any more.", body: 'The prices on this page have been refreshed. Choose again.' };
  }
  if (code === 'not_self_serve') {
    return { kind: 'conflict', title: 'Specialist help is arranged separately.', body: 'Expert and advisor help is optional and never bought through checkout.' };
  }
  if (['already_subscribed', 'already_active', 'step_down_instead', 'pass_not_cancellable', 'already_scheduled', 'credit_in_use',
    'refund_window_closed', 'not_first_payment', 'credit_already_used', 'not_refundable', 'no_subscription'].includes(code)) {
    return { kind: 'conflict', title: CONFLICT_TITLE[code] || 'That change is not available.', body: err.message || '' };
  }
  if (err?.status === 0 || code === 'network') return { kind: 'error', title: "We couldn't reach the server.", body: 'Nothing has been charged. Check your connection and try again.' };
  return { kind: 'error', title: 'Something went wrong.', body: `${err?.message || 'Please try again.'} Nothing has been charged.` };
}

const CONFLICT_TITLE = {
  already_subscribed: 'You already have this plan.',
  already_active: 'This is already active.',
  step_down_instead: 'This would be a step down.',
  pass_not_cancellable: 'A Raise Pass ends on its own.',
  already_scheduled: 'A change is already scheduled.',
  credit_in_use: 'Your credit is being applied elsewhere.',
  refund_window_closed: 'The refund window has closed.',
  not_first_payment: 'Only a first payment can be refunded.',
  credit_already_used: 'This purchase was credited toward an upgrade.',
  not_refundable: 'This payment cannot be refunded.',
  no_subscription: 'There is no subscription to cancel.',
};

/** True when the API says this checkout can still be refunded (first payment, inside the window). */
export function refundable(checkout, now = new Date()) {
  return Boolean(checkout && checkout.status === 'completed' && checkout.refundable_until && new Date(checkout.refundable_until) > now
    && Number(checkout.charge_usd ?? checkout.amount_usd) > 0);
}

/**
 * A $54 / $99 report whose credit was used by a later upgrade cannot be refunded on its own
 * (API 409 credit_already_used), so the button is not offered. The API stays the judge.
 */
export function creditUsedBy(checkout, all = []) {
  if (!checkout || !['capital-readiness', 'capital-assessment'].includes(checkout.product_id)) return false;
  const at = new Date(checkout.completed_at || 0);
  return all.some((c) => c !== checkout && c.status === 'completed' && Number(c.credit_usd) > 0 && new Date(c.completed_at || 0) >= at);
}

/** The Company Intelligence bridge from a $54/$99 purchase: the latest expiry, or null. */
export function bridgeExpiry(sources, now = new Date()) {
  const dates = (sources || []).filter((s) => s && s.source === 'readiness_purchase' && s.expires_at && new Date(s.expires_at) > now)
    .map((s) => s.expires_at).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

const CHECKOUT_STATUS = { open: 'Not completed', completed: 'Paid', expired: 'Expired', failed: 'Failed', refunded: 'Refunded' };
export const checkoutStatusLabel = (s) => CHECKOUT_STATUS[s] || (s ? String(s) : '–');

/** One idempotency key per checkout attempt (a double click never makes two). */
export function idempotencyKey(productId, priceKey, rand = Math.random) {
  return `web-${productId}-${priceKey}-${Date.now().toString(36)}-${rand().toString(36).slice(2, 10)}`;
}


// ---- D73: 3 platform plans (Free · Capital Intelligence · Capital Raising) + 2 one-time services ----
//
// GET /billing/plans prices only what checkout sells. Until RC3 phase 3 moves the $29 checkout to
// `capital-intelligence`, the list publishes the D73 ladder unpriced in `d73_platform`, and the $29
// column it prices is the restricted `company-intelligence` bundle. So a D73 plan the price list does
// not carry is read from the public catalog (GET /packages/catalog: name, tagline, prices, display)
// and marked `checkout: false` (it cannot be bought until billing sells it). Nothing here knows a
// number: every limit and price is the API's.

const LEGACY_PLATFORM = ['readiness-free', 'company-intelligence', 'capital-raising'];
const SERVICES = ['capital-readiness', 'capital-assessment'];
const NOT_INCLUDED = /^not included$/i;
const given = (v) => v !== undefined && v !== null && v !== '' && !NOT_INCLUDED.test(String(v));

/** A catalog item (GET /packages/catalog) in the price-list shape, offered prices only. */
function fromCatalog(p, version) {
  const prices = (p.prices || [])
    .filter((x) => !x.retired && (!Array.isArray(x.versions) || !version || x.versions.includes(version)))
    .map((x) => ({ key: x.key, billing: x.billing, amount_usd: x.amount_usd, ...(x.note ? { note: x.note } : {}), ...(x.term_months ? { term_months: x.term_months } : {}) }));
  if (!prices.length && Number(p.price_usd) === 0) prices.push({ key: 'free', billing: 'free', amount_usd: 0 });
  return { id: p.id, name: p.name, tier: p.tier || null, tagline: p.tagline, includes: p.includes, prices, display: p.display || {}, entitlements: p.entitlements || {}, checkout: false, from_catalog: true };
}

/** "opens in a later release" when the API marks a plan's key as decided but not delivered yet. */
export const LATER = 'opens in a later release';
export const isPending = (plan, key) => Boolean(plan?.pending && plan.pending[key]);

/** Seats and other shown limits per plan id from the API's compare block (D73 compare first). */
function compareLimit(data, id, key) {
  const cmp = data?.d73_platform?.compare?.plans?.includes(id) ? data.d73_platform.compare : data?.compare;
  const i = Array.isArray(cmp?.plans) ? cmp.plans.indexOf(id) : -1;
  if (i < 0) return undefined;
  for (const g of cmp.groups || []) for (const r of g.rows || []) if (r.key === key) return r.values?.[i];
  return undefined;
}

/**
 * The three platform plans, in ladder order: the API's `d73_platform` when present (RC3), else its
 * `platform` list (RC2). `catalog` is GET /packages/catalog (optional; without it a plan the price
 * list does not carry is simply not shown).
 */
export function platformOf(data, catalog = null) {
  const ids = Array.isArray(data?.d73_platform?.plans) ? data.d73_platform.plans : Array.isArray(data?.platform) ? data.platform : LEGACY_PLATFORM;
  const priced = columnsOf(data);
  const cat = [...(catalog?.packages || []), ...(catalog?.add_ons || [])];
  const d73 = data?.d73_platform || {};
  const notSold = Array.isArray(d73.not_sold_until_phase_3) ? d73.not_sold_until_phase_3 : [];
  return ids.map((id) => {
    // api 65702e4: d73_platform.limits / .pending carry each D73 plan's shown limits and the keys that
    // open in a later release; they win over the priced column (which may be the restricted bundle).
    const extra = { limits: d73.limits?.[id] || null, pending: d73.pending?.[id] || {} };
    const p = priced.find((x) => x.id === id && !x.restricted_bundle);
    if (p) {
      const seats = p.limits?.seats ?? compareLimit(data, id, 'seats');
      return { ...p, checkout: !notSold.includes(id), pending: extra.pending, limits: { ...(p.limits || {}), ...(seats !== undefined ? { seats } : {}), ...(extra.limits || {}) } };
    }
    const c = cat.find((x) => x.id === id);
    if (!c) return null;
    const plan = fromCatalog(c, data?.price_version);
    return { ...plan, pending: extra.pending, limits: { ...(c.limits || {}), ...(extra.limits || {}) } };
  }).filter(Boolean);
}

const pick = (data, ids) => ids.map((id) => columnsOf(data).find((p) => p.id === id)).filter(Boolean);
/** The one-time Capital Readiness services, shown apart from the plans (never as tiers). */
export const servicesOf = (data) => pick(data, Array.isArray(data?.services) ? data.services : SERVICES);

/**
 * The words on each card (D73 decision table). Every bullet reads an API value (display or limits);
 * a bullet whose value the API reports as "Not included" (or does not send) is dropped, so a card
 * can never claim more than the server grants. Numbers are the API's display words ("Up to 50").
 */
const low = (v) => cleanCopy(v).replace(/^Up to/, 'up to');
const D73_BULLETS = [
  (p) => (p.id !== 'readiness-free' && given(p.display?.company_intel_live) ? (p.id === 'capital-raising' ? 'Everything in Capital Intelligence' : 'Everything in Free, plus continuous company intelligence') : null),
  (p) => (given(p.display?.company_profile) && p.id === 'readiness-free' ? 'Readiness score, Financial Health check and company profile' : null),
  (p) => (given(p.display?.max_results) ? `${cleanCopy(p.display.max_results)} ranked investor matches per run` : null),
  (p) => (given(p.display?.match_explanation_level) ? cleanCopy(p.display.match_explanation_level) : null),
  (p) => (given(p.display?.investor_profile_depth) ? (/withheld/i.test(p.display.investor_profile_depth) ? 'No contact routes' : 'Contact routes where known') : null),
  (p) => (given(p.display?.shortlist_limit) ? `Shortlist: ${low(p.display.shortlist_limit)} investors` : null),
  (p) => (given(p.display?.active_pipeline_limit) ? `${cleanCopy(p.display.active_pipeline_limit)} active pipeline opportunities; closed, passed and rejected stay in your history` : null),
  (p) => (given(p.display?.pipeline_level) ? cleanCopy(p.display.pipeline_level) : null),
  (p) => (given(p.display?.outreach_level) ? [cleanCopy(p.display.outreach_level), given(p.display?.outreach_drafts_per_month) ? low(p.display.outreach_drafts_per_month) : null].filter(Boolean).join(': ') : null),
  (p) => (given(p.display?.ai_level) ? cleanCopy(p.display.ai_level) : null),
  (p) => {
    const gb = p.limits?.deal_room_storage_gb;
    if (given(gb)) return `Data room: ${cleanCopy(gb)} of private document storage${isPending(p, 'deal_room_storage_gb') ? ` (${LATER})` : ''}`;
    if (p.id !== 'readiness-free' && given(p.display?.data_room)) return 'Data room: private document storage coming later';
    return given(p.display?.data_room) ? `Data room ${cleanCopy(p.display.data_room).toLowerCase()}` : null;
  },
  (p) => (p.id !== 'readiness-free' && given(p.display?.data_room) ? 'Investor guest access: coming later' : null),
  (p) => (given(p.display?.capital_readiness_included) ? 'Capital Readiness Report included' : null),
  (p) => {
    const v = p.entitlements?.advisory_minutes_per_year ?? p.display?.advisory_minutes_per_year;
    const t = given(v) && Number(String(v).replace(/[^0-9]/g, '')) > 0 ? advisoryLabel(v) : null;
    return t ? `${t} of expert time per subscription year` : null;
  },
  (p) => { const s = p.limits?.seats; return given(s) ? cleanCopy(s) : null; },
];

export const PLAN_STORY = {
  'readiness-free': { promise: 'See where you stand and your first ranked matches.', cta: 'Start free' },
  'capital-intelligence': { promise: 'Prepare your raise and manage who you approach.', cta: 'Choose Capital Intelligence' },
  'capital-raising': { promise: 'Run your raise end-to-end, with the full workflow.', cta: 'Start raising' },
  'capital-readiness': {
    label: 'Capital Readiness Report', promise: 'A structured assessment of what is ready, what is missing and what to fix next.', cta: 'Get your report',
    bullets: [['Capital Readiness assessment', 'capital_readiness_report'], ['Detailed readiness report', 'capital_readiness_report'], ['Gaps and recommendations', 'capital_readiness_report']],
  },
  'capital-assessment': {
    label: 'Capital Readiness + Advisor', promise: 'The report, walked through with an advisor.', cta: 'Add an advisor',
    bullets: [['Everything in the report', 'capital_readiness_report'], ['+ 40-minute session with an advisor', 'expert_sessions']],
  },
};

/** The bullets the API confirms for this plan (platform plans: D73_BULLETS; services: PLAN_STORY keys). */
export function planBullets(plan) {
  if (!plan) return [];
  const story = PLAN_STORY[plan.id];
  if (story?.bullets) {
    const display = plan.display || {};
    return story.bullets.filter(([, key]) => key === null || given(display[key])).map(([text]) => text);
  }
  if (!['readiness-free', 'capital-intelligence', 'capital-raising'].includes(plan.id)) return [];
  return D73_BULLETS.map((f) => f(plan)).filter(Boolean);
}

/** The price row for a billing period ('monthly' | 'annual'); free and one-time items have one row. */
export function priceFor(plan, billing = 'monthly') {
  const prices = plan?.prices || [];
  return prices.find((p) => p.billing === billing) || prices.find((p) => p.billing === 'monthly') || prices[0] || null;
}

/** True when any plan offers a yearly price (the monthly / annual toggle is shown only then). */
export const hasAnnual = (data, catalog = null) => platformOf(data, catalog).some((p) => (p.prices || []).some((x) => x.billing === 'annual'));

/** The one small line under both services, worded from the API (D65 behaviour unchanged; OD-4/OD-16 A). */
export function serviceTerms(data) {
  const s = servicesOf(data).find((p) => p.includes_company_intelligence_days || p.credit);
  if (!s) return null;
  const parts = [];
  if (s.includes_company_intelligence_days) parts.push(`Includes ${s.includes_company_intelligence_days} days of the Company Intelligence live layer`);
  if (s.credit) parts.push(`${money(s.credit.amount_usd)} credited if you upgrade to Capital Raising within ${s.credit.window_days} days`);
  return parts.join(' · ');
}

/** A compare-table cell: { kind: 'yes' | 'no' | 'text' | 'pending', text }. null = not published yet. */
export function compareCell(value) {
  if (value === null) return { kind: 'pending', text: 'Not published yet' };
  const v = cleanCopy(value);
  if (!v || v === '–' || NOT_INCLUDED.test(v)) return { kind: 'no', text: 'Not included' };
  if (/^included$/i.test(v)) return { kind: 'yes', text: 'Included' };
  return { kind: 'text', text: v };
}

/**
 * The compare table for the D73 ladder: the API's groups and labels, each cell read from that plan's
 * own `display` (so a catalog-read plan is compared on its real values, never the restricted bundle's),
 * plus the D73 rows the price list does not group yet (storage, guests, the report, expert time).
 * Shown limits only: hidden fair-use values never appear. → { plans, names, groups, pending }
 */
export function compareOf(data, catalog = null) {
  const plans = platformOf(data, catalog);
  const base = data?.d73_platform?.compare?.groups ? data.d73_platform.compare : data?.compare;
  const groups = (base?.groups || []).map((g) => ({
    label: g.label,
    rows: (g.rows || []).map((r) => ({
      key: r.key, label: r.label,
      values: plans.map((p) => {
        let v;
        if (p.display && r.key in p.display) v = p.display[r.key];
        else if (p.limits && r.key in p.limits) v = p.limits[r.key];
        else v = compareLimit(data, p.id, r.key);
        if (v === undefined || v === null) return null;
        // Only storage carries the flag here: the data room checklist works today, and the report /
        // expert-time timing (phase 3) is worded on the cards and FAQ, not as a later release.
        return r.key === 'deal_room_storage_gb' && isPending(p, r.key) && given(v) ? `${cleanCopy(v)} (${LATER})` : v;
      }),
    })),
  }));
  const has = (k) => groups.some((g) => g.rows.some((r) => r.key === k));
  const storage = (p) => (given(p.limits?.deal_room_storage_gb) ? `${cleanCopy(p.limits.deal_room_storage_gb)}${isPending(p, 'deal_room_storage_gb') ? ` (${LATER})` : ''}` : p.id === 'readiness-free' ? 'Not included' : null);
  const extra = [
    ...(has('deal_room_storage_gb') ? [] : [{ key: 'deal_room_storage_gb', label: 'Data room storage', values: plans.map(storage) }]),
    { key: 'dataroom_active_guests', label: 'Investor guest access', values: plans.map((p) => (p.limits?.dataroom_active_guests ? cleanCopy(p.limits.dataroom_active_guests) : p.id === 'readiness-free' ? 'Not included' : 'Coming later')) },
  ];
  const dr = groups.find((g) => g.rows.some((r) => r.key === 'data_room'));
  if (dr) dr.rows.push(...extra); else groups.push({ label: 'Data room', rows: extra });
  groups.push({
    label: 'Readiness and expert time',
    rows: [
      { key: 'capital_readiness_included', label: 'Capital Readiness Report', values: plans.map((p) => p.display?.capital_readiness_included ?? null) },
      { key: 'advisory_minutes_per_year', label: 'Expert time per subscription year', values: plans.map((p) => { const v = p.entitlements?.advisory_minutes_per_year ?? p.display?.advisory_minutes_per_year; return v === undefined ? null : (advisoryLabel(v) || 'Not included'); }) },
    ],
  });
  const pending = groups.some((g) => g.rows.some((r) => r.values.some((v) => v === null)));
  return { plans: plans.map((p) => p.id), names: plans.map((p) => p.name), groups, pending };
}
