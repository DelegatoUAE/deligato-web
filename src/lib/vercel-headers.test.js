// SEC-OV-07 (Security, 5 Oct): the web ships its security headers, and the SPA rewrite stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

test('vercel.json keeps the SPA rewrite', () => {
  assert.ok(cfg.rewrites.some((r) => r.source === '/(.*)' && r.destination === '/index.html'));
});

test('vercel.json sends the five security headers on every path', () => {
  const all = cfg.headers.find((h) => h.source === '/(.*)');
  assert.ok(all, 'a catch-all headers block');
  const h = Object.fromEntries(all.headers.map((x) => [x.key.toLowerCase(), x.value]));
  assert.equal(h['x-frame-options'], 'DENY');
  assert.equal(h['x-content-type-options'], 'nosniff');
  assert.equal(h['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.match(h['permissions-policy'], /camera=\(\)/);
  assert.match(h['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(h['content-security-policy'], /base-uri 'self'/);
  assert.match(h['content-security-policy'], /object-src 'none'/);
});
