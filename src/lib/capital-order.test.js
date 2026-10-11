import test from 'node:test';
import assert from 'node:assert/strict';
import { serverOrder, serverTier, isRouteScoped } from './matchview.js';

test('stored runs keep the server rank; live results keep array order (R-CI-F3)', () => {
  assert.deepEqual(serverOrder([{ rank: 2, id: 'b' }, { rank: 1, id: 'a' }]).map((r) => r.id), ['a', 'b']);
  assert.deepEqual(serverOrder([{ id: 'x' }, { id: 'y' }]).map((r) => r.id), ['x', 'y']);
});

test('a result without a server tier is a research lead, never recomputed upward', () => {
  const warn = console.warn; console.warn = () => {};
  try {
    assert.equal(serverTier({ record_id: 'r1', fits: { stage: 'yes', geography: 'yes', sector: 'yes', ticket: 'yes' }, data_confidence: 'high' }), 'lead');
  } finally { console.warn = warn; }
  assert.equal(serverTier({ record_id: 'r2', fit_tier: 'strong' }), 'strong');
});

test('a run filtered by route is recognised as route-scoped (R-CI-F1)', () => {
  assert.equal(isRouteScoped({ counts: { filtered_out_by_route: 2277 } }), true);
  assert.equal(isRouteScoped({ counts: { filtered_out_by_route: 0 } }), false);
  assert.equal(isRouteScoped({ counts: {} }), false);
});
