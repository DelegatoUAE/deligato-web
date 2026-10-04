import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtUsd, ago, day, words } from './adminFormat.js';

test('missing values read as a dash, never as zero', () => {
  assert.equal(fmtUsd(null), '—');
  assert.equal(fmtUsd(undefined), '—');
  assert.equal(ago(null), '—');
  assert.equal(day(null), '—');
  assert.equal(day('not a date'), '—');
  assert.equal(words(null), '—');
});

test('amounts and words read as a person would say them', () => {
  assert.equal(fmtUsd(1500000), '$1.5M');
  assert.equal(fmtUsd(2000000), '$2M');
  assert.equal(fmtUsd(250000), '$250k');
  assert.equal(fmtUsd(900), '$900');
  assert.equal(words('stalled_pipeline'), 'Stalled pipeline');
});
