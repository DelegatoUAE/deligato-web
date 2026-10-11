import test from 'node:test';
import assert from 'node:assert/strict';
import { companyLine } from './company-line.js';

test('company line names the raise in one sentence', () => {
  const s = companyLine({ name: 'Ledgerline', stage: 'Seed', sector: 'Fintech', hq_country_iso2: 'AE', raise_usd: 1500000, instrument: 'SAFE' });
  assert.match(s, /^Ledgerline: Seed, Fintech, United Arab Emirates\. Raising \$1\.5M as SAFE\.$/);
});

test('unknowns stay visible, never filled in', () => {
  const s = companyLine({ name: 'Nimbus' });
  assert.equal(s, 'Nimbus: stage not set, sector not set, HQ not set. Raise amount not set.');
  assert.match(companyLine({ name: 'X', raise_usd: 2000000 }), /instrument not set/);
});
