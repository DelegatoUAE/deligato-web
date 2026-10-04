import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanCopy, columnsOf, foundingLabel, priceLine, priceParts, isLaunching, limitLabel, billingErrorCopy,
  refundable, creditUsedBy, bridgeExpiry, stageOf, planForTier, idempotencyKey,
  platformOf, servicesOf, planBullets, priceFor, hasAnnual, serviceTerms, compareCell, PLAN_STORY,
} from './pricing.js';
import { gateFor } from './plan.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

// The shape GET /api/v1/billing/plans returns (api 9b2bdb1, founding version), trimmed.
const PLANS = {
  currency: 'USD', price_version: 'founding', price_version_label: 'Founding price',
  plans: [
    { id: 'readiness-free', name: 'Free', tier: 'free', prices: [{ key: 'free', billing: 'free', amount_usd: 0 }], limits: { seats: '2 team members' } },
    { id: 'capital-readiness', name: 'Capital Readiness', tier: null, prices: [{ key: 'readiness_one_time', billing: 'one_time', amount_usd: 54 }], includes_company_intelligence_days: 30, credit: { amount_usd: 54, toward: ['capital-raising'], window_days: 30 } },
    { id: 'capital-assessment', name: 'Capital Readiness Plus', tier: null, prices: [{ key: 'readiness_plus_one_time', billing: 'one_time', amount_usd: 99 }] },
    { id: 'company-intelligence', name: 'Company Intelligence', tier: 'company_intelligence', prices: [{ key: 'ci_monthly', billing: 'monthly', amount_usd: 29 }, { key: 'ci_annual', billing: 'annual', amount_usd: 290, note: '2 months free' }] },
    { id: 'capital-raising', name: 'Capital Raising', tier: 'capital_raising', prices: [
      { key: 'cr_monthly', billing: 'monthly', amount_usd: 99, locked_months: 12, note: 'Founding price, locked for 12 months' },
      { key: 'cr_raise_pass', billing: 'six_months', amount_usd: 549, term_months: 6, note: 'Founding Raise Pass (D61): only while founding pricing is active' },
    ] },
  ],
  checkout: { enabled: false, provider: null, live: false },
};

test('every priced item in the API order (D60 data; D68 groups them as 3 plans + 2 services)', () => {
  assert.deepEqual(columnsOf(PLANS).map((p) => p.id), ['readiness-free', 'capital-readiness', 'capital-assessment', 'company-intelligence', 'capital-raising']);
  assert.deepEqual(columnsOf({ plans: [{ id: 'x', prices: [] }] }), []);
  assert.deepEqual(columnsOf(null), []);
});

test('the founding label is worded from the API rows, not hard-coded (D61)', () => {
  const cr = PLANS.plans[4];
  assert.equal(foundingLabel(cr, 'Founding price'), 'Founding price: $99/month, locked for 12 months, or $549 for 6 months');
  // Standard version: no lock, no founding label; different amounts flow straight through.
  assert.equal(foundingLabel({ prices: [{ billing: 'monthly', amount_usd: 129 }, { billing: 'six_months', amount_usd: 699, term_months: 6 }] }, 'Standard'), null);
  assert.equal(foundingLabel({ prices: [{ billing: 'monthly', amount_usd: 111, locked_months: 9 }] }, 'Launch price'), 'Launch price: $111/month, locked for 9 months');
});

test('price words', () => {
  assert.equal(priceLine({ billing: 'monthly', amount_usd: 29 }), '$29 / month');
  assert.equal(priceLine({ billing: 'annual', amount_usd: 290 }), '$290 / year');
  assert.equal(priceLine({ billing: 'six_months', amount_usd: 549, term_months: 6 }), '$549 for 6 months');
  assert.equal(priceLine({ billing: 'one_time', amount_usd: 54 }), '$54 one-time');
  assert.deepEqual(priceParts({ billing: 'free', amount_usd: 0 }), { amount: '$0', cadence: '' });
  assert.equal(priceLine({ billing: 'monthly', amount_usd: 1290.5 }), '$1,290.50 / month');
});

test('customer copy: no decision refs, no "unlimited", launching deal room flagged (D46, D60)', () => {
  assert.equal(cleanCopy('Founding Raise Pass (D61): only while founding pricing is active'), 'Founding Raise Pass: only while founding pricing is active');
  assert.equal(cleanCopy('Expert / Advisor help is optional and sold separately (D50).'), 'Expert / Advisor help is optional and sold separately.');
  assert.equal(cleanCopy('Unlimited matches'), 'Full access / plan limits matches');
  assert.equal(limitLabel(null), '–');
  assert.equal(limitLabel('Full access / plan limits'), 'Full access / plan limits');
  assert.equal(isLaunching('Data room uploads and secure share links'), true);
  assert.equal(isLaunching('Living Deal Room'), true);
  assert.equal(isLaunching('Data room checklist'), false);
  assert.equal(stageOf('company-intelligence'), 'Stay Ready');
  assert.equal(planForTier(PLANS, 'capital_raising').id, 'capital-raising');
});

test('payments off is calm and honest, never a success (day-3 §6)', () => {
  const off = billingErrorCopy({ status: 503, code: 'payments_not_enabled', message: 'Payments are not enabled yet. Nothing has been charged.' });
  assert.equal(off.kind, 'payments_off');
  assert.equal(off.title, 'Payments open soon.');
  assert.match(off.body, /Your plan isn't charged yet/);
  assert.equal(billingErrorCopy({ status: 503, code: 'billing_unavailable' }).kind, 'payments_off');
  assert.equal(billingErrorCopy({ status: 409, code: 'already_subscribed', message: 'x' }).kind, 'conflict');
  assert.equal(billingErrorCopy({ status: 400, code: 'not_self_serve' }).kind, 'conflict');
  const other = billingErrorCopy({ status: 500, message: 'boom' });
  assert.equal(other.kind, 'error');
  assert.match(other.body, /Nothing has been charged/);
  for (const c of ['payments_not_enabled', 'billing_unavailable', 'provider_error', 'refund_window_closed', undefined]) {
    assert.doesNotMatch(JSON.stringify(billingErrorCopy({ code: c })), /success|confirmed|you're on/i);
  }
});

test('refund only while the API window is open, bridge expiry is the latest live one', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  assert.equal(refundable({ status: 'completed', refundable_until: '2026-10-10T00:00:00Z', charge_usd: 99 }, now), true);
  assert.equal(refundable({ status: 'completed', refundable_until: '2026-10-01T00:00:00Z', charge_usd: 99 }, now), false);
  assert.equal(refundable({ status: 'open', refundable_until: '2026-10-10T00:00:00Z', charge_usd: 99 }, now), false);
  assert.equal(refundable({ status: 'completed', refundable_until: null, charge_usd: 99 }, now), false);
  assert.equal(bridgeExpiry([{ source: 'readiness_purchase', expires_at: '2026-11-01T00:00:00Z' }, { source: 'readiness_purchase', expires_at: '2026-11-02T00:00:00Z' }, { source: 'accounting_plan' }], now), '2026-11-02T00:00:00Z');
  assert.equal(bridgeExpiry([{ source: 'readiness_purchase', expires_at: '2026-09-01T00:00:00Z' }], now), null);
  assert.notEqual(idempotencyKey('a', 'b'), idempotencyKey('a', 'b'));
  const report = { product_id: 'capital-readiness', status: 'completed', completed_at: '2026-10-01T00:00:00Z', credit_usd: 0 };
  const cr = { product_id: 'capital-raising', status: 'completed', completed_at: '2026-10-02T00:00:00Z', credit_usd: 54 };
  assert.equal(creditUsedBy(report, [cr, report]), true);
  assert.equal(creditUsedBy(report, [report]), false);
  assert.equal(creditUsedBy(cr, [cr, report]), false);
});

test('402 readings: one calm link, none for a ceiling with nowhere to go (D50)', () => {
  const up = gateFor({ status: 402, code: 'upgrade_required', message: 'Your current plan does not include outreach drafts.', body: { error: { code: 'upgrade_required', details: { upgrade_to: ['capital-raising'] } } } });
  assert.equal(up.href, '/packages?highlight=capital-raising');
  assert.equal(up.cta, 'See plans');
  const ciUp = gateFor({ status: 402, code: 'upgrade_required', message: 'x', body: { error: { upgrade_to: ['company-intelligence'] } } });
  assert.equal(ciUp.href, '/packages?highlight=company-intelligence');
  const fairCr = gateFor({ status: 402, code: 'fair_use_limit', message: "You've reached this plan's fair-use limit.", body: { error: { code: 'fair_use_limit', details: { fair_use: true, upgrade_to: [] } } } });
  assert.equal(fairCr.href, null);
  assert.match(fairCr.message, /fair-use limit/);
  const fairFree = gateFor({ status: 402, code: 'fair_use_limit', message: 'm', body: { error: { code: 'fair_use_limit', details: { fair_use: true, upgrade_to: ['company-intelligence'] } } } });
  assert.equal(fairFree.href, '/packages?highlight=company-intelligence');
  const seats = gateFor({ status: 402, code: 'seat_limit', message: 'Your plan has 5 team members.', body: { error: { code: 'seat_limit', details: { upgrade_to: [] } } } });
  assert.equal(seats.href, null);
  const advisorOnly = gateFor({ status: 402, code: 'seat_limit', message: 'm', body: { error: { details: { upgrade_to: ['advisor-sessions'] } } } });
  assert.equal(advisorOnly.href, null, 'never links to advisor/consulting');
  assert.equal(gateFor({ status: 402, message: 'Request failed (402)' }).message, 'This is part of a paid plan.');
});

test('checkout never offers advisor or consulting products (D50) and never hard-codes a price', () => {
  for (const f of ['components/billing/CheckoutDialog.jsx', 'components/billing/PricingPlans.jsx', 'components/billing/PlanBilling.jsx', 'pages/PricingPage.jsx', 'pages/PackagesPage.jsx', 'lib/pricing.js', 'lib/billing.js']) {
    const code = readFileSync(join(SRC, f), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /\$\s?(29|54|99|129|290|549|699)\b/, `${f} hard-codes an approved price`);
    assert.doesNotMatch(code, /\bunlimited\b/i, `${f} says unlimited`);
  }
  const co = readFileSync(join(SRC, 'components/billing/CheckoutDialog.jsx'), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
  assert.doesNotMatch(co, /advisor-sessions|consulting|fractional/i);
});

// D68: the 3 platform plans and 2 services, as GET /billing/plans returns them (api pricing-d68), trimmed.
const D68 = {
  currency: 'USD',
  platform: ['readiness-free', 'company-intelligence', 'capital-raising'],
  services: ['capital-readiness', 'capital-assessment'],
  plans: [
    { id: 'readiness-free', name: 'Free', tier: 'free', prices: [{ key: 'free', billing: 'free', amount_usd: 0 }],
      display: { company_profile: 'Included', checkin: 'Financial Health inputs only', improvement_plan: 'Top 3 actions', expert_access: 'Browse and request', max_results: 'Not included', pipeline_items: 'Not included' } },
    { id: 'capital-readiness', name: 'Capital Readiness Report', tier: null, prices: [{ key: 'readiness_one_time', billing: 'one_time', amount_usd: 54 }],
      display: { capital_readiness_report: 'Included' }, includes_company_intelligence_days: 30, credit: { amount_usd: 54, toward: ['capital-raising'], window_days: 30 } },
    { id: 'capital-assessment', name: 'Capital Readiness + Advisor', tier: null, prices: [{ key: 'readiness_plus_one_time', billing: 'one_time', amount_usd: 99 }],
      display: { capital_readiness_report: 'Included', expert_sessions: '1 included' }, includes_company_intelligence_days: 30, credit: { amount_usd: 54, toward: ['capital-raising'], window_days: 30 } },
    { id: 'company-intelligence', name: 'Company Intelligence', tier: 'company_intelligence',
      prices: [{ key: 'ci_monthly', billing: 'monthly', amount_usd: 29 }, { key: 'ci_annual', billing: 'annual', amount_usd: 290, note: '2 months free' }],
      display: { company_intel_live: 'Included', financial_health_history: 'Included', score_history: 'Included', next_best_actions: 'Full', checkin: 'Full monthly check-in', max_results: 'Up to 5' } },
    { id: 'capital-raising', name: 'Capital Raising', tier: 'capital_raising',
      prices: [{ key: 'cr_monthly', billing: 'monthly', amount_usd: 99 }, { key: 'cr_annual', billing: 'annual', amount_usd: 990, note: '2 months free' }],
      display: { max_results: 'Full access / plan limits', ai_explanations: 'Full access / plan limits', investor_profile_depth: 'Full profile with contact routes',
        pipeline_items: 'Full access / plan limits', outreach_drafts_per_month: '60 drafts a month', crm: 'Included' } },
  ],
};

test('D68: three platform plans in ladder order, the two services apart (never tiers)', () => {
  assert.deepEqual(platformOf(D68).map((p) => p.id), ['readiness-free', 'company-intelligence', 'capital-raising']);
  assert.deepEqual(servicesOf(D68).map((p) => p.id), ['capital-readiness', 'capital-assessment']);
  assert.ok(servicesOf(D68).every((p) => !p.tier));
  assert.equal(stageOf('readiness-free'), 'Understand');
  assert.equal(stageOf('company-intelligence'), 'Stay Ready');
  assert.equal(stageOf('capital-raising'), 'Raise');
});

test('D68: card bullets are only shown when the API confirms them', () => {
  assert.deepEqual(planBullets(platformOf(D68)[0]), ['IR / Investor Readiness Score', 'Financial Health Check', 'Company profile & portal', 'Basic readiness insights', '20-minute consultant session']);
  assert.equal(planBullets(platformOf(D68)[2]).length, PLAN_STORY['capital-raising'].bullets.length, 'every Capital Raising bullet is true');
  assert.ok(!planBullets(platformOf(D68)[0]).some((b) => /match|shortlist|pipeline|outreach|team/i.test(b)), 'Free never lists matching or team members (D69)');
  assert.ok(!planBullets(platformOf(D68)[1]).some((b) => /match|shortlist|pipeline|outreach/i.test(b)), 'Company Intelligence never lists matching (D69)');
  const pretend = { ...platformOf(D68)[1], display: { ...platformOf(D68)[1].display, score_history: 'Not included' } };
  assert.ok(!planBullets(pretend).includes('Readiness history'), 'a bullet the API does not grant is dropped');
  assert.deepEqual(planBullets(servicesOf(D68)[1]), ['Everything in the report', '+ 40-minute session with an advisor']);
});

test('D68: monthly / annual prices come from the API rows; the services line is worded from the API', () => {
  const [free, ci, cr] = platformOf(D68);
  assert.equal(priceLine(priceFor(ci, 'monthly')), '$29 / month');
  assert.equal(priceLine(priceFor(cr, 'annual')), '$990 / year');
  assert.equal(priceLine(priceFor(free, 'annual')), '$0', 'Free stays free');
  assert.equal(hasAnnual(D68), true);
  assert.equal(serviceTerms(D68), 'Includes 30 days of Company Intelligence · $54 credited if you upgrade to Capital Raising within 30 days');
  assert.equal(serviceTerms({ plans: [] }), null);
});

test('D68: compare cells read the API values honestly', () => {
  assert.deepEqual(compareCell('Included'), { kind: 'yes', text: 'Included' });
  assert.deepEqual(compareCell('Not included'), { kind: 'no', text: 'Not included' });
  assert.deepEqual(compareCell('Up to 5'), { kind: 'text', text: 'Up to 5' });
  assert.equal(compareCell('unlimited').text, 'Full access / plan limits');
});
