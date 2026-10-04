// Incident 4 Oct 2026: the app kept only the ~1 hour Supabase access token, so
// every signed-in screen failed an hour after sign-in. These pin the renewal.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
let calls = [];
let server = () => ({ status: 200, body: {} });
globalThis.fetch = async (url, opts = {}) => {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const auth = (opts.headers || {}).Authorization || null;
  const body = opts.body ? JSON.parse(opts.body) : null;
  calls.push({ path, auth, body });
  const r = server(path, auth, body);
  return { ok: r.status < 400, status: r.status, text: async () => JSON.stringify(r.body), json: async () => r.body };
};
const { apiFetch, setSession, getToken, login } = await import('./auth.js');
const now = () => Math.floor(Date.now() / 1000);

beforeEach(() => { mem.clear(); calls = []; });

test('login keeps the refresh token and expiry, not only the access token', async () => {
  server = () => ({ status: 200, body: { user: { id: 'u' }, session: { access_token: 'A1', refresh_token: 'R1', expires_at: now() + 3600 } } });
  await login('f@x.test', 'pw');
  assert.equal(getToken(), 'A1');
  assert.equal(mem.get('deligato.refresh_token'), 'R1');
  assert.ok(Number(mem.get('deligato.expires_at')) > now());
});

test('an expired access token is renewed before the call, and the call uses the new one', async () => {
  setSession({ access_token: 'OLD', refresh_token: 'R1', expires_at: now() - 10 });
  server = (path, auth) => {
    if (path === '/auth/refresh') return { status: 200, body: { session: { access_token: 'NEW', refresh_token: 'R2', expires_at: now() + 3600 } } };
    return auth === 'Bearer NEW' ? { status: 200, body: { ok: true } } : { status: 401, body: { error: 'expired' } };
  };
  assert.deepEqual(await apiFetch('/auth/me'), { ok: true });
  assert.deepEqual(calls.map((c) => c.path), ['/auth/refresh', '/auth/me']);
  assert.equal(calls[0].body.refresh_token, 'R1');
  assert.equal(mem.get('deligato.refresh_token'), 'R2', 'the rotated token is stored');
});

test('a 401 on a token we thought valid triggers one renewal and one retry', async () => {
  setSession({ access_token: 'OLD', refresh_token: 'R1', expires_at: now() + 3600 });
  server = (path, auth) => {
    if (path === '/auth/refresh') return { status: 200, body: { session: { access_token: 'NEW', refresh_token: 'R2', expires_at: now() + 3600 } } };
    return auth === 'Bearer NEW' ? { status: 200, body: { ok: 1 } } : { status: 401, body: { error: 'expired' } };
  };
  assert.deepEqual(await apiFetch('/api/v1/company-intel/x'), { ok: 1 });
  assert.deepEqual(calls.map((c) => c.path), ['/api/v1/company-intel/x', '/auth/refresh', '/api/v1/company-intel/x']);
});

test('parallel calls share one renewal (refresh tokens are single-use)', async () => {
  setSession({ access_token: 'OLD', refresh_token: 'R1', expires_at: now() - 10 });
  server = (path) => (path === '/auth/refresh'
    ? { status: 200, body: { session: { access_token: 'NEW', refresh_token: 'R2', expires_at: now() + 3600 } } }
    : { status: 200, body: {} });
  await Promise.all([apiFetch('/a'), apiFetch('/b'), apiFetch('/c')]);
  assert.equal(calls.filter((c) => c.path === '/auth/refresh').length, 1);
});

test('a spent refresh token clears the session and surfaces the 401 (sign in again)', async () => {
  setSession({ access_token: 'OLD', refresh_token: 'SPENT', expires_at: now() + 3600 });
  server = (path) => (path === '/auth/refresh' ? { status: 401, body: { error: 'Your session has expired. Please sign in again.' } } : { status: 401, body: { error: 'expired' } });
  await assert.rejects(apiFetch('/auth/me'), (e) => e.status === 401);
  assert.equal(getToken(), null);
  assert.equal(mem.get('deligato.refresh_token'), undefined);
  assert.equal(calls.filter((c) => c.path === '/auth/me').length, 1, 'no retry loop');
});

test('a real 403 or a server error is not treated as an expired session', async () => {
  setSession({ access_token: 'A', refresh_token: 'R1', expires_at: now() + 3600 });
  server = () => ({ status: 403, body: { error: 'forbidden' } });
  await assert.rejects(apiFetch('/x'), (e) => e.status === 403);
  server = () => ({ status: 503, body: { error: 'down' } });
  await assert.rejects(apiFetch('/x'), (e) => e.status === 503);
  assert.equal(calls.filter((c) => c.path === '/auth/refresh').length, 0);
  assert.equal(getToken(), 'A', 'still signed in');
});

test('sign-in itself never triggers a renewal', async () => {
  setSession({ access_token: 'OLD', refresh_token: 'R1', expires_at: now() - 10 });
  server = () => ({ status: 401, body: { error: 'Invalid email or password.' } });
  await assert.rejects(login('f@x.test', 'bad'), (e) => e.status === 401);
  assert.deepEqual(calls.map((c) => c.path), ['/auth/login']);
});
