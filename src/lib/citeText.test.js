import test from 'node:test';
import assert from 'node:assert/strict';
import { citeText } from './citeText.js';

test('citations read as plain words, never field paths or source keys', () => {
  assert.equal(citeText({ source: 'readiness', field: 'factors.runway.points', value: 2 }), 'Runway: 2, from Capital Readiness');
  assert.equal(citeText({ source: 'company_intelligence', field: 'next_top.label', value: 'Review your funding target date' }), 'Top priority, from your Home priorities');
  assert.equal(citeText({ source: 'company', field: 'stage', value: 'Seed' }), 'Stage: Seed, from your profile');
  assert.equal(citeText({ source: 'match_run', field: 'top[0].name', value: 'Fund A' }), 'Top match: Fund A, from your latest matches');
  for (const c of [{ source: 'company_intelligence', field: 'next_top.label', value: 'x' }, { source: 'readiness', field: 'factors.runway.points', value: 2 }]) {
    assert.doesNotMatch(citeText(c), /_|\.\w/);
  }
});
