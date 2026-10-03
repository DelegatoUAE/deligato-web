import test from 'node:test';
import assert from 'node:assert/strict';
import { runwayOption, raiseOption, prefillAnswers, sentenceCase, internalHint, loadDraft, saveDraft, clearDraft } from './readinessForm.js';

const QS = [
  { key: 'runway', opts: ['24 months and over', '18–24 months', '12–18 months', '6–12 months', 'under 6 months'] },
  { key: 'raise_amount', opts: ['Under 100k', '100k – 250k', '250k – 500k', '500k – 1M', '1M – 2M', '2M – 5M', '5M+'] },
];

test('runway and raise map onto the method\'s own option labels (the walk: 11 months, $1.5M)', () => {
  assert.equal(runwayOption(11), '6–12 months');
  assert.equal(runwayOption(24), '24 months and over');
  assert.equal(runwayOption(null), null);
  assert.equal(raiseOption(1500000), '1M – 2M');
  assert.equal(raiseOption(0), null);
  assert.deepEqual(prefillAnswers({ runway_months: 11, raise_usd: 1500000 }, QS), { answers: { runway: '6–12 months', raise_amount: '1M – 2M' }, fromProfile: ['runway', 'raise_amount'] });
});

test('prefill never invents an answer the questionnaire does not offer', () => {
  assert.deepEqual(prefillAnswers({ runway_months: 11 }, []), { answers: {}, fromProfile: [] });
  assert.deepEqual(prefillAnswers({}, QS), { answers: {}, fromProfile: [] });
});

test('sentence case for display only', () => {
  assert.equal(sentenceCase('Mostly Stable'), 'Mostly stable');
  assert.equal(sentenceCase('More than 10 Years'), 'More than 10 years');
  assert.equal(sentenceCase("I don't have any experience"), "I don't have any experience");
  assert.equal(sentenceCase('Convertible Notes'), 'Convertible notes');
  assert.equal(sentenceCase('Raise with SAFE notes'), 'Raise with SAFE notes');
});

test('method internals are detected in hints', () => {
  assert.ok(internalHint('Pairs with Q2 → one Raise-vs-cost score'));
  assert.ok(!internalHint('How long you can operate on existing cash.'));
});

test('drafts survive a reload and a broken storage never throws', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.ok(saveDraft('c1', { answers: { runway: '6–12 months' }, i: 3 }, storage));
  assert.equal(loadDraft('c1', storage).i, 3);
  clearDraft('c1', storage);
  assert.equal(loadDraft('c1', storage), null);
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  assert.equal(loadDraft('c1', broken), null);
  assert.equal(saveDraft('c1', { answers: {} }, broken), false);
  assert.doesNotThrow(() => clearDraft('c1', broken));
});
