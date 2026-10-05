import test from 'node:test';
import assert from 'node:assert/strict';
import { notAsked } from './readiness.js';

test('an answered factor that scored low is not "Not asked yet" (UAT F01)', () => {
  assert.equal(notAsked({ key: 'strengths', status: 'missing', points: 1, max: 4, answer: ['Deep technical expertise'] }), false);
  assert.equal(notAsked({ key: 'traction', status: 'missing', points: 0, max: 4, answer: 'None yet' }), false);
});

test('a factor never asked still reads "Not asked yet"', () => {
  assert.equal(notAsked({ key: 'strengths', status: 'missing', points: 0, max: 4, answer: null }), true);
  assert.equal(notAsked({ key: 'x', status: 'unknown', points: 0, max: 4 }), true);
  assert.equal(notAsked({ key: 'x', status: 'met', points: 4, max: 4, answer: 'y' }), false);
  assert.equal(notAsked(null), false);
});

test('the API answered/level fields win when present (R-BE-F1)', () => {
  assert.equal(notAsked({ status: 'missing', level: 'low', answered: true, points: 0, max: 4 }), false);
  assert.equal(notAsked({ status: 'missing', level: 'not_asked', answered: false, points: 0, max: 4 }), true);
  assert.equal(notAsked({ status: 'missing', level: 'low', points: 0, max: 4 }), false);
  assert.equal(notAsked({ status: 'unknown', level: 'unknown' }), true);
});
