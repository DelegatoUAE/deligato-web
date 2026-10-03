import test from 'node:test';
import assert from 'node:assert/strict';
import { sortMatches, fitSummary, toggleCompare, COMPARE_MAX } from './matchview.js';

const rows = [
  { record_id: 'p1', name: 'Bravo', bucket: 'possible', match_score: 90, fits: { stage: 'yes' } },
  { record_id: 'e1', name: 'Zulu', bucket: 'eligible', match_score: 60, fits: { stage: 'yes', sector: 'yes' } },
  { record_id: 'e2', name: 'Alpha', bucket: 'eligible', match_score: 70, fits: {} },
  { record_id: 'o1', name: 'Echo', bucket: 'likely_outside', match_score: 99, fits: { stage: 'no' } },
  { record_id: 'p2', name: 'Charlie', bucket: 'possible', match_score: null, fits: {} },
];
const ids = (rs) => rs.map((r) => r.record_id);

test('a sort never lifts a Possible result above a Verified eligible one (D24)', () => {
  assert.deepEqual(ids(sortMatches(rows, 'score', 'desc')), ['e2', 'e1', 'p1', 'p2', 'o1']);
  assert.deepEqual(ids(sortMatches(rows, 'score', 'asc')), ['e1', 'e2', 'p1', 'p2', 'o1']);
});

test('sort by name inside each bucket', () => {
  assert.deepEqual(ids(sortMatches(rows, 'name', 'asc')), ['e2', 'e1', 'p1', 'p2', 'o1']);
});

test('unknown values sort last in both directions', () => {
  const asc = ids(sortMatches(rows, 'score', 'asc'));
  const desc = ids(sortMatches(rows, 'score', 'desc'));
  assert.ok(asc.indexOf('p2') > asc.indexOf('p1'));
  assert.ok(desc.indexOf('p2') > desc.indexOf('p1'));
});

test('no key keeps the server order inside buckets', () => {
  assert.deepEqual(ids(sortMatches(rows, null)), ['e1', 'e2', 'p1', 'p2', 'o1']);
});

test('fitSummary treats missing and unexpected states as unknown, never as a fit', () => {
  assert.deepEqual(fitSummary({ fits: { stage: 'yes', sector: 'maybe' } }), { yes: 1, partial: 0, unknown: 4, no: 0, total: 5 });
});

test('compare selection is capped and toggles off', () => {
  let s = [];
  for (const id of ['a', 'b', 'c', 'd']) s = toggleCompare(s, id);
  assert.equal(s.length, COMPARE_MAX);
  assert.deepEqual(toggleCompare(s, 'b'), ['a', 'c']);
});

test('the Ticket fit column sorts by fit state, not by ticket size', () => {
  const rs = [
    { record_id: 'a', bucket: 'possible', ticket_max_usd: 9e6, fits: { ticket: 'unknown' } },
    { record_id: 'b', bucket: 'possible', ticket_max_usd: 1e5, fits: { ticket: 'yes' } },
  ];
  assert.deepEqual(ids(sortMatches(rs, 'ticket', 'desc')), ['b', 'a']);
  assert.deepEqual(ids(sortMatches(rs, 'ticket_size', 'desc')), ['a', 'b']);
});
