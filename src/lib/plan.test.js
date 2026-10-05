import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  tierLabel, upgradeTarget, includedIn, displayValue, hasMatching, canShortlist, packageName, nextPlanFor, bucketOf, PIPELINE_BUCKETS,
  capacityLine, planLimitRows, advisoryLabel, canOutreach, canCompare, basicMatching, hasPipelineWorkflow, stageAllowed,
} from './plan.js';
import { PRODUCT_SUB_LABEL, BRAND_TITLE } from './brand.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

test('ladder tier labels (W4)', () => {
  assert.equal(tierLabel('company_intelligence'), 'Company Intelligence');
  assert.equal(tierLabel('capital_intelligence'), 'Capital Intelligence');
  assert.equal(tierLabel('capital_raising'), 'Capital Raising');
  assert.equal(tierLabel('free'), 'Free');
  assert.equal(tierLabel(undefined), null);
});

test('upgrade target reads upgrade_to and never falls back to a consulting package (W5)', () => {
  assert.equal(upgradeTarget({ body: { error: { upgrade_to: ['capital-intelligence'] } } }), 'capital-intelligence');
  assert.equal(upgradeTarget({ body: { upgrade_to: ['investor-ready', 'capital-raising'] } }), 'capital-raising');
  assert.equal(upgradeTarget({}), 'capital-raising');
  assert.equal(includedIn(), 'Included in Capital Raising');
});

test('display never prints null or "unlimited" (D46)', () => {
  assert.equal(displayValue({ a: null }, 'a'), '–');
  assert.equal(displayValue({ a: 'Unlimited' }, 'a'), 'Full access / plan limits');
  assert.equal(displayValue({ a: 'Up to 200' }, 'a'), 'Up to 200');
});

function walk(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
}

test('no retired package copy in customer screens (W6, D41, D45, D46)', () => {
  const BAD = [/from Investor-Ready/i, /highlight=investor-ready/, /80% (investor-ready|line)/i, /Living score/i, /\bConcierge\b/, /Capital Assessment/, /\bunlimited\b/i];
  const offenders = [];
  for (const f of walk(SRC).filter((x) => /\.jsx?$/.test(x) && !x.endsWith('.test.js') && !/design\//.test(x) && !x.endsWith('lib/plan.js'))) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (BAD.some((re) => re.test(code))) offenders.push(`${relative(SRC, f)}:${i + 1}: ${code.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('D73: every plan matches; the shortlist exists on every plan; levels read the catalog orders', () => {
  assert.equal(hasMatching({ max_results: 5 }), true, 'Free shows its top 5');
  assert.equal(hasMatching({ max_results: 50 }), true);
  assert.equal(hasMatching({ max_results: 0 }), false, 'only a pre-D73 view reads as none');
  assert.equal(hasMatching(null), true);
  assert.equal(canShortlist({ shortlist_limit: 5 }), true);
  assert.equal(canShortlist({ shortlist_limit: 0, pipeline_items: 9 }), false, 'shortlist_limit wins over the compat key');
  assert.equal(canShortlist({ pipeline_items: null }), true);
  const free = { match_explanation_level: 'basic', ai_level: 'preview', outreach_level: 'none', outreach_drafts_per_month: 0, pipeline_level: 'none', compare_tools: false };
  const ci = { match_explanation_level: 'full', ai_level: 'copilot', outreach_level: 'standard', outreach_drafts_per_month: 20, pipeline_level: 'core', compare_tools: false };
  const cr = { match_explanation_level: 'full_advanced', ai_level: 'advanced', outreach_level: 'full', outreach_drafts_per_month: 60, pipeline_level: 'advanced', compare_tools: true };
  assert.deepEqual([free, ci, cr].map(basicMatching), [true, false, false]);
  assert.deepEqual([free, ci, cr].map(canOutreach), [false, true, true]);
  assert.deepEqual([free, ci, cr].map(hasPipelineWorkflow), [false, true, true]);
  assert.deepEqual([free, ci, cr].map(canCompare), [false, false, true]);
  assert.equal(nextPlanFor('free'), 'capital-intelligence');
  assert.equal(nextPlanFor('company_intelligence'), 'capital-intelligence', 'the restricted bundle upgrades to the $29 plan');
  assert.equal(nextPlanFor('capital_intelligence'), 'capital-raising');
  assert.equal(nextPlanFor('capital_raising'), null);
  assert.equal(upgradeTarget({ body: { upgrade_to: ['company-intelligence'] } }), 'capital-raising', 'never the restricted bundle');
  assert.equal(packageName('capital-intelligence'), 'Capital Intelligence');
  assert.equal(packageName('capital-readiness'), 'Capital Readiness Report');
});

test('D73 buckets mirror api capital/pipeline-buckets.js exactly (rejected is history)', () => {
  const apiFile = join(SRC, '..', '..', 'api', 'capital', 'pipeline-buckets.js');
  const api = existsSync(apiFile) ? readFileSync(apiFile, 'utf8') : ''; // the sibling api checkout, when present
  for (const [b, list] of Object.entries(PIPELINE_BUCKETS)) {
    const m = api.match(new RegExp(`${b}: Object\\.freeze\\(\\[([^\\]]*)\\]`));
    if (m) assert.deepEqual(list, m[1].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean), `${b} differs from the api`);
  }
  assert.equal(bucketOf('rejected'), 'history');
  assert.equal(bucketOf('researching'), 'shortlist');
  assert.equal(bucketOf('term_sheet'), 'active');
  assert.equal(bucketOf('nope'), null);
});

test('D73 capacity words: at the limit, over the limit, not on the plan, fair use', () => {
  assert.deepEqual(capacityLine({ used: 50, limit: 50 }, 'shortlist'), { used: 50, limit: 50, state: 'full', text: '50 of 50 shortlisted', hint: 'Upgrade or remove one to add another.' });
  const over = capacityLine({ used: 22, limit: 20 }, 'active');
  assert.equal(over.state, 'over');
  assert.equal(over.text, '22 of 20 active in your pipeline');
  assert.match(over.hint, /closed, passed or rejected/);
  assert.equal(capacityLine({ used: 20, limit: 20 }, 'active').text, '20 of 20 active in your pipeline');
  assert.match(capacityLine({ used: 20, limit: 20 }, 'active').hint, /Closed, passed and rejected don't count/);
  assert.equal(capacityLine({ used: 3, limit: 5 }, 'shortlist').state, 'ok');
  assert.equal(capacityLine({ used: 0, limit: 0 }, 'active').text, 'Active pipeline not included on your plan');
  assert.equal(capacityLine({ used: 2, limit: 0 }, 'active').state, 'none');
  assert.deepEqual(capacityLine({ used: 7, limit: null }, 'shortlist'), { used: 7, limit: null, state: 'uncapped', text: '7 shortlisted', hint: null }, 'a fair-use ceiling is never shown as a number');
});

test('D73 stage moves mirror the api verdict: history always, a full bucket refuses, same bucket allowed', () => {
  const cap = { shortlist: { used: 5, limit: 5 }, active: { used: 20, limit: 20 }, history: { used: 3, limit: null } };
  assert.equal(stageAllowed('contacted', 'rejected', cap), true);
  assert.equal(stageAllowed('shortlisted', 'contacted', cap), false, 'active full');
  assert.equal(stageAllowed('contacted', 'diligence', cap), true, 'inside the active bucket');
  assert.equal(stageAllowed('passed', 'shortlisted', cap), false, 'shortlist full');
  assert.equal(stageAllowed('shortlisted', 'researching', cap), true);
  assert.equal(stageAllowed('shortlisted', 'contacted', { active: { used: 0, limit: 0 } }), false, 'Free: no active pipeline');
  assert.equal(stageAllowed('shortlisted', 'contacted', null), true, 'unknown capacity: the server judges');
});

test('D73 limit rows: numbers from the API, hidden limits never shown', () => {
  const view = {
    entitlements: { advisory_minutes_per_year: 40 },
    display: { max_results: 'Up to 50', shortlist_limit: 'Up to 50', active_pipeline_limit: 'Up to 20', advisory_minutes_per_year: 'Up to 40' },
    limits: { seats: 3, deal_room_storage_gb: 2, match_runs_per_month: 60, ai_calls_per_month: 1000, deal_room_egress_gb_per_month: 5 },
  };
  assert.deepEqual(planLimitRows(view).map((r) => [r.label, r.value]), [
    ['Ranked matches per run', 'Up to 50'], ['Shortlist', 'Up to 50'], ['Active pipeline', 'Up to 20'],
    ['Team members', '3 team members'], ['Data room storage', '2 GB'], ['Expert time per subscription year', '40 minutes'],
  ]);
  const free = planLimitRows({ entitlements: { advisory_minutes_per_year: 0 }, display: { max_results: 'Up to 5', shortlist_limit: 'Up to 5', active_pipeline_limit: 'Not included' }, limits: { seats: 1, deal_room_storage_gb: 0 } });
  assert.deepEqual(free.map((r) => r.value), ['Up to 5', 'Up to 5', 'Not included', 'Owner only', 'Not included', 'Not included']);
  assert.equal(advisoryLabel(120), '2 hours');
  assert.equal(advisoryLabel('Up to 40'), '40 minutes');
  assert.equal(advisoryLabel(60), '1 hour');
  assert.equal(advisoryLabel(0), null);
});

test('D74 (2): the product sub-label is one constant and never the $29 plan name', () => {
  assert.notEqual(PRODUCT_SUB_LABEL, 'Capital Intelligence');
  assert.ok(BRAND_TITLE.includes(PRODUCT_SUB_LABEL));
  const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8');
  assert.ok(!/Capital Intelligence/.test(html), 'index.html carries no "Capital Intelligence" sub-label');
  assert.ok(html.includes(BRAND_TITLE), 'index.html <title> matches lib/brand.js');
  const offenders = [];
  for (const f of walk(SRC).filter((x) => /\.jsx$/.test(x))) {
    const code = readFileSync(f, 'utf8');
    if (/(wordmark-sub|login-brand-sub)">Capital Intelligence</.test(code) && !f.endsWith('AuthLayout.jsx')) offenders.push(relative(SRC, f));
  }
  assert.deepEqual(offenders, [], 'every wordmark reads PRODUCT_SUB_LABEL (AuthLayout is held for the onboarding hotfix lane)');
});

test('D74 (4): no free 20-minute session anywhere in customer screens', () => {
  const offenders = [];
  for (const f of walk(SRC).filter((x) => /\.jsx?$/.test(x) && !x.endsWith('.test.js'))) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const code = /^\s*(\*|\/\*)/.test(line) ? '' : line.replace(/\/\/.*$/, '');
      if (/20-minute (consultant )?session|intro_session: true/i.test(code)) offenders.push(`${relative(SRC, f)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});
