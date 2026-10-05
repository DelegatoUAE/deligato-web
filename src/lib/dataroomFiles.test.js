import test from 'node:test';
import assert from 'node:assert/strict';
import { showsMissingActions, hasStoredFile, acceptFor, checkFile, expiryState, fmtBytes, typeLabel, typesSentence, usageLine, viewsInline } from './dataroomFiles.js';

test('checkFile mirrors the API allowlist and size cap', () => {
  const f = (name, size = 10) => ({ name, size });
  assert.equal(checkFile(f('deck.pdf')), null);
  assert.equal(checkFile(f('photo.JPEG')), null);
  assert.match(checkFile(f('setup.exe')), /isn't supported/);
  assert.match(checkFile(f('old.doc')), /isn't supported/);
  assert.match(checkFile(f('page.html')), /isn't supported/);
  assert.match(checkFile(f('deck.pdf', 0)), /empty/);
  assert.match(checkFile(f('deck.pdf', 26 * 1024 * 1024)), /25\.0 MB or smaller|25 MB or smaller/);
  assert.match(checkFile(f('deck.pdf', 2 * 1024 * 1024), { maxBytes: 1024 * 1024 }), /1\.0 MB/);
  assert.match(checkFile(null), /Choose/);
});

test('labels, accept list and sizes', () => {
  assert.equal(acceptFor(), '.pdf,.docx,.xlsx,.pptx,.csv,.png,.jpg,.jpeg');
  assert.equal(typesSentence(), 'PDF, Word, Excel, PowerPoint, CSV, PNG or JPG');
  assert.equal(fmtBytes(512), '512 B');
  assert.equal(fmtBytes(2048), '2 KB');
  assert.equal(fmtBytes(3.25 * 1024 * 1024), '3.3 MB');
  assert.equal(fmtBytes(10 * 1024 ** 3), '10.0 GB');
  assert.equal(typeLabel({ file_name: 'Cap table.xlsx' }), 'Excel');
  assert.equal(typeLabel({ file_name: 'x', mime_type: 'application/pdf' }), 'PDF');
  assert.equal(viewsInline({ mime_type: 'application/pdf' }), true);
  assert.equal(viewsInline({ mime_type: 'text/csv' }), false);
});

test('expiry states and the usage line', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');
  assert.equal(expiryState(null, now), null);
  assert.equal(expiryState('2026-10-01T00:00:00Z', now).state, 'expired');
  assert.deepEqual(expiryState('2026-10-15T00:00:00Z', now), { state: 'expiring', days: 10 });
  assert.equal(expiryState('2027-01-01T00:00:00Z', now).state, 'valid');
  assert.equal(usageLine({ used_bytes: 0, quota_bytes: 10 * 1024 ** 3 }), '0 B of 10.0 GB used');
  assert.equal(usageLine({ used_bytes: 5, quota_bytes: null }), null);
});

test('an item that is missing because its stored file expired is renewed through the file, not re-added', () => {
  const expired = { done: false, status: 'missing', document_status: 'expired', documents: [{ id: 'a', stored: true, status: 'uploaded', expires_at: '2026-01-01' }] };
  assert.equal(hasStoredFile(expired), true);
  assert.equal(showsMissingActions(expired), false);
  assert.equal(showsMissingActions({ done: false, documents: [] }), true);
  assert.equal(showsMissingActions({ done: false, documents: [{ status: 'self_declared', expires_at: '2026-01-01' }] }), true, 'expired "I have this" can be re-ticked with new dates');
  assert.equal(showsMissingActions({ done: true, documents: [] }), false);
});
