import test from 'node:test';
import assert from 'node:assert/strict';
import { timelineRows } from './timeline.js';

const at = '2026-10-05T10:00:00.000Z';

test('reads the API `entries` shape (F04): meetings, replies and stage moves show', () => {
  const rows = timelineRows({ entries: [
    { at, type: 'outcome.meeting', event: 'meeting', event_id: 'e1' },
    { at: '2026-10-05T09:00:00.000Z', type: 'pipeline.stage_changed', from: 'researching', to: 'contacted' },
    { at: '2026-10-04T09:00:00.000Z', type: 'pipeline.added' },
  ] }, { stageLabel: (k) => ({ researching: 'Researching', contacted: 'Contacted' })[k] });
  assert.deepEqual(rows.map((r) => r.label), ['Meeting logged', 'Moved from Researching to Contacted', 'Added to your pipeline']);
});

test('a meeting written as activity + outcome in the same minute is one row (F14)', () => {
  const rows = timelineRows({ entries: [
    { at, type: 'activity.meeting', kind: 'meeting', title: 'Meeting', activity_id: 'a1' },
    { at, type: 'outcome.meeting', event: 'meeting', event_id: 'e1' },
  ] });
  assert.equal(rows.length, 1);
});

test('older shapes still render and empty data is an empty list', () => {
  assert.equal(timelineRows({ events: [{ at, event: 'replied' }] })[0].label, 'Reply logged');
  assert.deepEqual(timelineRows(null), []);
  assert.deepEqual(timelineRows({}), []);
});
