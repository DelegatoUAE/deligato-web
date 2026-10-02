// node --test src/lib/home.test.js   (00-home-command-centre.md §10 criterion 3)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankActions } from './home.js';

const NOW = Date.UTC(2026, 9, 3, 9);
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();
const readiness = (factors, improvements = []) => ({ score: 60, band: { key: 'R5', name: 'Semi-Ready' }, factors, improvements });

test('brand-new company shows S1 and S2 only', () => {
  const out = rankActions({ now: NOW, readiness: null, capitalNeedConfirmed: false, hasRun: false });
  assert.deepEqual(out.map((a) => a.key), ['S1', 'S2']);
  assert.ok(out.every((a) => a.dismissible === false));
});

test('a 30-day stale Diligence item outranks a non-dominant unlock', () => {
  const out = rankActions({
    now: NOW, readiness: readiness([]), capitalNeedConfirmed: true, hasRun: true,
    pipeline: [{ id: 'p1', stage: 'diligence', stage_entered_at: daysAgo(30), name: 'Fund A' }],
    unlocks: { blockers: { dominant_blocker: null, excluded: 100 }, unlocks: [{ kind: 'raise_usd', to: 1e6, label: 'Raise $1M', unlocks: 300, loses: 0, net: 300 }], resolvable: [] },
  });
  assert.equal(out[0].pool, 'P');
  assert.equal(out[1].pool, 'U');
});

test('raise_timing exploring lifts a readiness gap above a net +20 unlock', () => {
  const out = rankActions({
    now: NOW, raiseTiming: 'exploring', capitalNeedConfirmed: true, hasRun: true,
    readiness: readiness([{ key: 'runway', label: 'Runway', points: 2, max: 5, status: 'partial' }]),
    unlocks: { blockers: { excluded: 10 }, unlocks: [{ kind: 'instrument', to: 'Equity', label: 'Accept Equity', unlocks: 20, loses: 0, net: 20 }], resolvable: [] },
  });
  assert.equal(out[0].pool, 'R');
  assert.equal(out[1].pool, 'U');
});

test('diversity: at most 2 from one pool', () => {
  const out = rankActions({
    now: NOW, capitalNeedConfirmed: true, hasRun: true, readiness: readiness([]),
    pipeline: [1, 2, 3].map((i) => ({ id: `p${i}`, stage: 'contacted', stage_entered_at: daysAgo(40 + i), name: `F${i}` })),
    unlocks: { blockers: { excluded: 5 }, unlocks: [{ kind: 'x', to: 1, label: 'X', unlocks: 5, loses: 0, net: 5 }], resolvable: [] },
  });
  assert.equal(out.length, 3);
  assert.equal(out.filter((a) => a.pool === 'P').length, 2);
});

test('ties break by pool order P > U > R', () => {
  const out = rankActions({
    now: NOW, capitalNeedConfirmed: true, hasRun: true,
    readiness: readiness([{ key: 'revenue', label: 'Revenue', points: 0, max: 5, status: 'missing' }]), // 45 + 30 = 75
    unlocks: { blockers: { excluded: 1 }, unlocks: [], resolvable: [] },
    pipeline: [{ id: 'p', stage: 'contacted', stage_entered_at: daysAgo(36), name: 'F' }], // 60 + 15 = 75
  });
  assert.equal(out[0].pool, 'P');
  assert.equal(out[1].pool, 'R');
});

test('never more than 3 and setup items cannot be dismissed', () => {
  const out = rankActions({ now: NOW, readiness: null, capitalNeedConfirmed: true, hasRun: true, pipeline: [] });
  assert.ok(out.length <= 3);
  assert.equal(out[0].key, 'S1');
  assert.equal(out[0].dismissible, false);
});
