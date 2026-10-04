// D58 portal separation (client-side UX layer; the API enforces access).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { portalFor, isAdminPath, CLIENT_NAV, ADMIN_NAV, navHrefs, settingsTab, screenFor } from './portal.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_ROUTES = ['/admin', '/admin/companies', '/admin/providers', '/admin/experts', '/admin/projects', '/admin/corrections', '/admin/learning', '/admin/match'];

test('a founder gets not-found on every admin route', () => {
  for (const r of ADMIN_ROUTES) assert.equal(portalFor(r, { staff: false }), 'not_found', r);
  assert.equal(portalFor('/admin/anything/deeper', {}), 'not_found');
});

test('staff get the admin shell on admin routes, the client shell elsewhere', () => {
  for (const r of ADMIN_ROUTES) assert.equal(portalFor(r, { staff: true }), 'admin');
  assert.equal(portalFor('/', { staff: true }), 'client');
  assert.equal(portalFor('/capital/matches', { staff: true }), 'client');
});

test('only a strict true makes staff (no truthy client-side state grants admin)', () => {
  for (const v of ['true', 1, {}, [], 'yes']) assert.equal(portalFor('/admin', { staff: v }), 'not_found');
});

test('admin-looking client paths are not admin', () => {
  assert.equal(isAdminPath('/administration'), false);
  assert.equal(isAdminPath('/company/admin'), false);
});

test('the client navigation never carries an admin entry; D58 sections in order', () => {
  assert.ok(navHrefs(CLIENT_NAV).every((h) => !isAdminPath(h)));
  assert.deepEqual(CLIENT_NAV.map((s) => s.title || 'Home'), ['Home', 'Company', 'Capital', 'Experts']);
  assert.ok(navHrefs(ADMIN_NAV).every((h) => isAdminPath(h)));
});

test('every admin route in App.jsx is wrapped staffOnly (renders not-found for founders)', () => {
  const app = readFileSync(join(SRC, 'App.jsx'), 'utf8');
  const lines = app.split('\n').filter((l) => /<Route path="\/admin/.test(l));
  assert.equal(lines.length, ADMIN_ROUTES.length);
  for (const l of lines) assert.match(l, /<AdminArea>/, l.trim());
  const area = readFileSync(join(SRC, 'components/AdminLayout.jsx'), 'utf8');
  assert.match(area, /portalFor\(/);
  assert.match(area, /NotFoundPage/);
});

test('the client shell imports no admin navigation', () => {
  const layout = readFileSync(join(SRC, 'components/AppLayout.jsx'), 'utf8');
  assert.doesNotMatch(layout, /ADMIN_NAV|['"]\/admin\//);
});

test('settings tabs resolve from path and legacy query', () => {
  assert.equal(settingsTab('plan'), 'plan');
  assert.equal(settingsTab('billing'), 'plan');
  assert.equal(settingsTab(undefined, 'privacy'), 'privacy');
  assert.equal(settingsTab('nope'), 'account');
});

test('assistant screen ids for the new screens', () => {
  assert.equal(screenFor('/company/financial-health'), 'financial_health');
  assert.equal(screenFor('/company/record'), 'company_record');
  assert.equal(screenFor('/company/intelligence'), 'company_intelligence');
  assert.equal(screenFor('/settings/plan'), 'settings');
  assert.equal(screenFor('/company'), null);
});
