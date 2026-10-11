import test from 'node:test';
import assert from 'node:assert/strict';
import { signalStatus } from './signal-status.js';

test('unscored signals are a to-do with one action, never a score', () => {
  assert.deepEqual(signalStatus('capital_readiness', { status: 'not_assessed' }), { tone: 'todo', pct: null, action: 'Take the assessment' });
  assert.equal(signalStatus('financial_health', { score: null }).action, 'Do your first check-in');
  assert.equal(signalStatus('capital_need', { confirmed: false }).tone, 'todo');
});

test('readiness tone follows the band the engine returned', () => {
  assert.equal(signalStatus('capital_readiness', { status: 'scored', score: 73.5, band: 'Investor-Ready' }).tone, 'ok');
  assert.equal(signalStatus('capital_readiness', { status: 'scored', score: 44.7, band: 'High Risk' }).tone, 'bad');
  assert.equal(signalStatus('capital_readiness', { status: 'scored', score: 55, band: 'Medium Risk' }).tone, 'warn');
  assert.equal(signalStatus('capital_readiness', { status: 'scored', score: 73.5, band: 'Investor-Ready' }).pct, 74);
});

test('record with missing items needs attention', () => {
  assert.deepEqual(signalStatus('company_record', { pct: 30, freshness: { missing: 20 } }), { tone: 'warn', pct: 30, action: 'Complete your record' });
});
