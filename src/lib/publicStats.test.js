import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseStats, loadPublicStats } from './publicStats.js';

test('numbers are shown only with a date and only when they are positive integers', () => {
  assert.equal(normaliseStats({ capital_providers: 3984 }), null, 'no as_of → nothing');
  assert.equal(normaliseStats({ as_of: '2026-10-03', capital_providers: '3984' }), null);
  const s = normaliseStats({ as_of: '2026-10-03T01:00:00Z', capital_providers: 3984, countries: 111, gcc_hq: 0, primary_verified: 2053.5 });
  assert.equal(s.asOf, '2026-10-03');
  assert.deepEqual(s.items.map((i) => [i.key, i.value]), [['capital_providers', 3984], ['countries', 111]]);
});

test('a missing or failing endpoint hides the strip (never a hard-coded fallback)', async () => {
  assert.equal(await loadPublicStats('http://x', { fetchImpl: async () => ({ ok: false, status: 404 }) }), null);
  assert.equal(await loadPublicStats('http://x', { fetchImpl: async () => { throw new Error('offline'); } }), null);
  const ok = await loadPublicStats('http://x', { fetchImpl: async () => ({ ok: true, json: async () => ({ as_of: '2026-10-03', capital_providers: 3984 }) }) });
  assert.equal(ok.items[0].value, 3984);
});

test('reads the live API field names (providers, verified) as well as the original ones', () => {
  const r = normaliseStats({ providers: 2960, countries: 98, gcc_hq: 462, verified: 1768, capital_types: 11, as_of: '2026-10-04T21:27:08.611Z' });
  assert.deepEqual(r.items.map((i) => [i.key, i.value]), [['capital_providers', 2960], ['countries', 98], ['gcc_hq', 462], ['primary_verified', 1768]]);
  assert.equal(r.asOf, '2026-10-04');
});
