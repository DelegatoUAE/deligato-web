import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tierLabel, upgradeTarget, includedIn, displayValue, hasMatching, canShortlist, MATCHING_UPGRADE, packageName, previewLines } from './plan.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

test('ladder tier labels (W4)', () => {
  assert.equal(tierLabel('company_intelligence'), 'Company Intelligence');
  assert.equal(tierLabel('capital_raising'), 'Capital Raising');
  assert.equal(tierLabel('free'), 'Free');
  assert.equal(tierLabel(undefined), null);
});

test('upgrade target reads upgrade_to and never falls back to a consulting package (W5)', () => {
  assert.equal(upgradeTarget({ body: { error: { upgrade_to: ['company-intelligence'] } } }), 'company-intelligence');
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

test('D68: Free has no matching and no new shortlist items; unknown defers to the server', () => {
  assert.equal(hasMatching({ max_results: 0 }), false);
  assert.equal(hasMatching({ max_results: 5 }), true, 'Company Intelligence keeps its top 5');
  assert.equal(hasMatching({ max_results: null }), true, 'Capital Raising: plan limits');
  assert.equal(hasMatching(null), true);
  assert.equal(canShortlist({ pipeline_items: 0 }), false);
  assert.equal(canShortlist({ pipeline_items: 10 }), true);
  assert.equal(canShortlist({ pipeline_items: null }), true);
  assert.match(MATCHING_UPGRADE.title, /Capital Raising/);
  assert.match(MATCHING_UPGRADE.body, /without naming providers/);
  assert.match(MATCHING_UPGRADE.readOnly, /read-only/);
  assert.equal(packageName('capital-readiness'), 'Capital Readiness Report');
  assert.equal(packageName('capital-assessment'), 'Capital Readiness + Advisor');
});

test('D69 locked teaser words: from the aggregate only, nothing when 0 or unknown', () => {
  assert.equal(previewLines(null), null);
  assert.equal(previewLines({ potential_fits: 0, regions: ['UAE'] }), null);
  assert.equal(previewLines({ potential_fits: '27' }), null, 'never coerces a non-number');
  assert.deepEqual(previewLines({ potential_fits: 23, regions: [] }),
    { count: '23 potential capital matches identified.', regions: null, upgrade: 'Upgrade to Capital Raising to see who fits your company and why.' });
  assert.equal(previewLines({ potential_fits: 1, regions: [] }).count, '1 potential capital match identified.');
  assert.equal(previewLines({ potential_fits: 140, regions: ['United Arab Emirates', 'United Kingdom', 'USA', 'France'] }).regions,
    'Potential fits across United Arab Emirates, United Kingdom and USA investors.');
  assert.equal(MATCHING_UPGRADE.cta, 'Unlock Capital Raising');
});
