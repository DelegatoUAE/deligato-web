import test from 'node:test';
import assert from 'node:assert/strict';
import { READINESS_AREAS, areaOf } from './readiness-areas.js';

test('every question sits in exactly one area', () => {
  const all = READINESS_AREAS.flatMap((a) => a.questions);
  assert.equal(new Set(all).size, all.length);
  assert.equal(areaOf('runway').label, 'Runway and the raise');
  assert.equal(areaOf('not_a_question'), null);
});
