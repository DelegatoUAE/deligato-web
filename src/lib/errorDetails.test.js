import test from 'node:test';
import assert from 'node:assert/strict';
import { errorDetails } from './errorDetails.js';

const map = (...a) => Object.fromEntries(errorDetails(...a));

test('names the screen and the error', () => {
  const r = map(new TypeError('x is not a function'), '/admin');
  assert.equal(r.Screen, '/admin');
  assert.equal(r.Error, 'TypeError: x is not a function');
});

test('carries the API status, code and request id when the throw came from a call', () => {
  const e = Object.assign(new Error('Request failed (500)'), {
    status: 500,
    code: 'server_error',
    body: { error: { request_id: 'req_abc123', message: 'Request failed (500)' } },
  });
  const r = map(e, '/');
  assert.equal(r.HTTP, '500');
  assert.equal(r.Code, 'server_error');
  assert.equal(r['Request id'], 'req_abc123');
});

test('never includes the response body, which can carry company data', () => {
  const e = Object.assign(new Error('boom'), {
    status: 500,
    body: { error: { request_id: 'r1' }, company_name: 'Ledgerline', revenue_usd: 420000 },
  });
  const text = errorDetails(e, '/').map(([k, v]) => `${k}:${v}`).join('|');
  assert.ok(!text.includes('Ledgerline'));
  assert.ok(!text.includes('420000'));
  assert.ok(text.includes('r1'));
});

test('truncates a very long message rather than filling the screen', () => {
  assert.ok(map(new Error('x'.repeat(5000)), '/').Error.length < 350);
});

test('survives a thrown non-Error', () => {
  const r = map('plain string', '/capital');
  assert.ok(r.Error.includes('plain string'));
  assert.equal(r.Screen, '/capital');
});

test('a 0 status is reported, not dropped as falsy', () => {
  const e = Object.assign(new Error('network'), { status: 0, code: 'network' });
  assert.equal(map(e, '/').HTTP, '0');
});
