import test from 'node:test';
import assert from 'node:assert/strict';
import { reachFor } from './outreachRoute.js';

test('outreach names the best route on record and never invents an address (UAT #10)', () => {
  const app = reachFor({ name: 'Annex', contact_route: 'Online application', application_url: 'https://annex.example/apply', website: 'https://annex.example' });
  assert.equal(app.href, 'https://annex.example/apply');
  assert.match(app.line, /application page/);
  const unknown = reachFor({ name: 'OTF', contact_route: 'Unknown', website: 'https://otf.example' });
  assert.match(unknown.line, /not on record/);
  assert.equal(unknown.href, 'https://otf.example');
  const unknownApp = reachFor({ name: '500 Global', contact_route: 'Unknown', application_url: 'https://500.example/apply' });
  assert.equal(unknownApp.href, 'https://500.example/apply');
  const email = reachFor({ name: 'X', contact_route: 'Pitch email' });
  assert.match(email.line, /no address is on record/);
  assert.equal(email.href, null);
  assert.match(reachFor({ name: 'Y', contact_route: 'Warm intro only' }).line, /introductions only/);
  assert.equal(reachFor({ name: 'Z', website: 'javascript:alert(1)' }).href, null);
  for (const r of [app, unknown, email]) assert.doesNotMatch(r.line, /@/);
});
