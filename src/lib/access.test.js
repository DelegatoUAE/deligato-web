import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteCompany } from './access.js';

test('Delete company shows for owners and older APIs only (R-F2)', () => {
  assert.equal(canDeleteCompany({ access_role: 'owner' }), true);
  assert.equal(canDeleteCompany({}), true);
  assert.equal(canDeleteCompany(undefined), true);
  assert.equal(canDeleteCompany({ access_role: 'member' }), false);
  assert.equal(canDeleteCompany({ access_role: 'viewer' }), false);
});
