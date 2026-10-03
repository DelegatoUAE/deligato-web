import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tierLabel, upgradeTarget, includedIn, displayValue } from './plan.js';

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
