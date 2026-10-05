import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canExport, hasMonthlyRefresh, exportPath, exportFileName, withBom, refreshNote, refreshDetail, EXPORT_KINDS } from './capitalExport.js';

test('export is offered only when the plan includes it', () => {
  assert.equal(canExport({ export: true }), true);
  assert.equal(canExport({ export: false }), false);
  assert.equal(canExport(null), false);
  assert.deepEqual(EXPORT_KINDS, ['matches', 'shortlist', 'pipeline']);
  assert.equal(exportPath('c1', 'pipeline'), '/api/v1/capital-export/c1/pipeline.csv');
});

test('file name: company slug, kind and ISO date', () => {
  assert.equal(exportFileName('pipeline', 'Bayt Grid', new Date('2026-10-05T10:00:00Z')), 'deligato-bayt-grid-pipeline-2026-10-05.csv');
  assert.equal(exportFileName('matches', '', new Date('2026-10-05T10:00:00Z')), 'deligato-matches-2026-10-05.csv');
});

test('the byte-order mark is restored once', () => {
  assert.equal(withBom('a,b'), '﻿a,b');
  assert.equal(withBom('﻿a,b'), '﻿a,b');
});

test('monthly refresh: only on plans with match_refresh and matching', () => {
  assert.equal(hasMonthlyRefresh({ match_refresh: 'monthly', max_results: null }), true);
  assert.equal(hasMonthlyRefresh({ match_refresh: 'none', max_results: null }), false);
  assert.equal(hasMonthlyRefresh({ match_refresh: 'monthly', max_results: 0 }), false);
  assert.equal(hasMonthlyRefresh(null), false);
});

test('refresh note wording', () => {
  const r = { refreshed_at: '2026-11-02T09:00:00Z', previous_run_at: '2026-10-15T09:00:00Z', counts: { new_fits: 3, removed: 1, tier_changes: 0 } };
  assert.equal(refreshNote(r), 'Refreshed on 2 Nov 2026: 3 new fits, 1 removed');
  assert.equal(refreshNote({ ...r, counts: { new_fits: 1, removed: 0, tier_changes: 2 } }), 'Refreshed on 2 Nov 2026: 1 new fit, 2 changed fit');
  assert.equal(refreshNote({ ...r, counts: {} }), 'Refreshed on 2 Nov 2026: no changes');
  assert.equal(refreshNote(null), null);
  assert.match(refreshDetail(r), /Compared with your run on 15 Oct 2026\./);
});
