// Pricing and billing words for customer copy (D60/D61, D46, D50). PURE (imports only lib/plan.js).
// Every price, label and limit comes from GET /api/v1/billing/plans; nothing here
// knows an amount. These helpers only arrange and word what the API returns.

import { fullAccess } from './plan.js';

/** The stage each product answers (D68: Understand → Stay Ready → Raise; the two services assess). */
const STAGE = {
  'readiness-free': 'Understand',
  'capital-readiness': 'Assess',
  'capital-assessment': 'Assess',
  'company-intelligence': 'Stay Ready',
  'capital-raising': 'Raise',
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

/** The plan whose ladder tier matches (free | company_intelligence | capital_raising). */
export const planForTier = (data, tier) => columnsOf(data).find((p) => p.tier && p.tier === tier) || null;

/** The name the API gives a product id, from the price list. */
export function productName(data, id) {
  const p = (data?.plans || []).find((x) => x.id === id);
  return p ? p.name : null;
}

/** Labels for the limit keys the API returns under each plan's `limits`. */
export const LIMIT_ROWS = [
  ['max_results', 'Investor matches'],
  ['pipeline_items', 'Shortlist and pipeline'],
  ['outreach_drafts_per_month', 'Outreach drafts'],
  ['ai_calls_per_month', 'Ask AI and AI explanations'],
  ['seats', 'Team members'],
  ['deal_room_storage_gb', 'Data room storage'],
];

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

// ---- D68: 3 platform plans + 2 one-time services ---------------------------------------

const PLATFORM = ['readiness-free', 'company-intelligence', 'capital-raising'];
const SERVICES = ['capital-readiness', 'capital-assessment'];
const pick = (data, ids) => ids.map((id) => columnsOf(data).find((p) => p.id === id)).filter(Boolean);

/** The three platform plans, in ladder order (the API's `platform` list when present). */
export const platformOf = (data) => pick(data, Array.isArray(data?.platform) ? data.platform : PLATFORM);
/** The one-time Capital Readiness services, shown apart from the plans (never as tiers). */
export const servicesOf = (data) => pick(data, Array.isArray(data?.services) ? data.services : SERVICES);

/**
 * The words on each card (Bilal's 5 Oct brief). Every bullet names the entitlement key that makes
 * it true; planBullets() drops a bullet whose key the API reports as "Not included", so a card can
 * never claim more than the server grants. `null` = always true for that plan.
 */
export const PLAN_STORY = {
  'readiness-free': {
    label: 'Understand', promise: 'Know where your company stands.', cta: 'Start free',
    bullets: [['IR / Investor Readiness Score', 'company_profile'], ['Financial Health Check', 'checkin'], ['Company profile & portal', 'company_profile'],
      ['Basic readiness insights', 'improvement_plan'], ['20-minute consultant session', 'expert_access']],
  },
  'company-intelligence': {
    label: 'Stay Ready', promise: 'Keep your company continuously ready.', cta: 'Stay ready',
    bullets: [['Everything in Free', null], ['Continuous Company Intelligence', 'company_intel_live'], ['Financial health trends', 'financial_health_history'],
      ['Readiness history', 'score_history'], ['Changes & alerts', 'company_intel_live'], ['Recommendations', 'next_best_actions'], ['Monthly check-in', 'checkin']],
  },
  'capital-raising': {
    label: 'Raise', promise: 'Find the right capital and execute your raise.', cta: 'Start raising', badge: 'Most complete',
    bullets: [['Everything in Company Intelligence', null], ['Investor & capital-provider matching', 'max_results'], ['Why-this-fits explanations', 'ai_explanations'],
      ['Evidence behind matches', 'investor_profile_depth'], ['Shortlist & pipeline', 'pipeline_items'], ['Outreach & meeting preparation', 'outreach_drafts_per_month'],
      ['Raise CRM & workflow', 'crm'], ['Matches refreshed monthly', 'match_refresh'], ['Export to CSV for Excel', 'export'],
      ['Private data room (investor sharing coming later)', 'data_room']],
  },
  'capital-readiness': {
    label: 'Capital Readiness Report', promise: 'A structured assessment of what is ready, what is missing and what to fix next.', cta: 'Get your report',
    bullets: [['Capital Readiness assessment', 'capital_readiness_report'], ['Detailed readiness report', 'capital_readiness_report'], ['Gaps and recommendations', 'capital_readiness_report']],
  },
  'capital-assessment': {
    label: 'Capital Readiness + Advisor', promise: 'The report, walked through with an advisor.', cta: 'Add an advisor',
    bullets: [['Everything in the report', 'capital_readiness_report'], ['+ 40-minute session with an advisor', 'expert_sessions']],
  },
};

const NOT_INCLUDED = /^not included$/i;
/** The bullets the API confirms for this plan (see PLAN_STORY). */
export function planBullets(plan) {
  const story = plan && PLAN_STORY[plan.id];
  if (!story) return [];
  const display = plan.display || {};
  return story.bullets.filter(([, key]) => key === null || (display[key] !== undefined && !NOT_INCLUDED.test(String(display[key])))).map(([text]) => text);
}

/** The price row for a billing period ('monthly' | 'annual'); free and one-time items have one row. */
export function priceFor(plan, billing = 'monthly') {
  const prices = plan?.prices || [];
  return prices.find((p) => p.billing === billing) || prices.find((p) => p.billing === 'monthly') || prices[0] || null;
}

/** True when any plan offers a yearly price (the monthly / annual toggle is shown only then). */
export const hasAnnual = (data) => platformOf(data).some((p) => (p.prices || []).some((x) => x.billing === 'annual'));

/** The one small line under both services, worded from the API (D65 behaviour unchanged). */
export function serviceTerms(data) {
  const s = servicesOf(data).find((p) => p.includes_company_intelligence_days || p.credit);
  if (!s) return null;
  const parts = [];
  if (s.includes_company_intelligence_days) parts.push(`Includes ${s.includes_company_intelligence_days} days of Company Intelligence`);
  if (s.credit) parts.push(`${money(s.credit.amount_usd)} credited if you upgrade to Capital Raising within ${s.credit.window_days} days`);
  return parts.join(' · ');
}

/** A compare-table cell: { kind: 'yes' | 'no' | 'text', text }. */
export function compareCell(value) {
  const v = cleanCopy(value);
  if (!v || v === '–' || NOT_INCLUDED.test(v)) return { kind: 'no', text: 'Not included' };
  if (/^included$/i.test(v)) return { kind: 'yes', text: 'Included' };
  return { kind: 'text', text: v };
}
