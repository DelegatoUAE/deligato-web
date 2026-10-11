import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteCompany, canManageTeam, assignableRoles, canChangeRole, canRemoveMember, seatSummary, roleLabel } from './access.js';

test('Delete company shows for owners and older APIs only (R-F2)', () => {
  assert.equal(canDeleteCompany({ access_role: 'owner' }), true);
  assert.equal(canDeleteCompany({}), true);
  assert.equal(canDeleteCompany(undefined), true);
  assert.equal(canDeleteCompany({ access_role: 'member' }), false);
  assert.equal(canDeleteCompany({ access_role: 'viewer' }), false);
});

test('Team management: admin and owner only, mirroring api company-access LEVELS', () => {
  assert.equal(canManageTeam('owner'), true);
  assert.equal(canManageTeam('admin'), true);
  assert.equal(canManageTeam('member'), false);
  assert.equal(canManageTeam('viewer'), false);
  assert.equal(canManageTeam(null), false);
});

test('Only an owner can hand out the owner role; members and viewers hand out nothing', () => {
  assert.deepEqual(assignableRoles('owner'), ['owner', 'admin', 'member', 'viewer']);
  assert.deepEqual(assignableRoles('admin'), ['admin', 'member', 'viewer']);
  assert.deepEqual(assignableRoles('member'), []);
  assert.deepEqual(assignableRoles('viewer'), []);
});

test('Role changes: never your own row, an admin never touches an owner, the last owner keeps the role', () => {
  const owner = { role: 'owner' }; const member = { role: 'member' };
  assert.equal(canChangeRole('owner', member), true);
  assert.equal(canChangeRole('admin', member), true);
  assert.equal(canChangeRole('member', member), false);
  assert.equal(canChangeRole('viewer', member), false);
  assert.equal(canChangeRole('admin', owner, { owners: 2 }), false);
  assert.equal(canChangeRole('owner', owner, { owners: 1 }), false);
  assert.equal(canChangeRole('owner', owner, { owners: 2 }), true);
  assert.equal(canChangeRole('owner', member, { self: true }), false);
});

test('Removal: admins remove non-owners, anyone may leave, the last owner may not', () => {
  const owner = { role: 'owner' }; const viewer = { role: 'viewer' };
  assert.equal(canRemoveMember('admin', viewer), true);
  assert.equal(canRemoveMember('member', viewer), false);
  assert.equal(canRemoveMember('viewer', viewer, { self: true }), true);
  assert.equal(canRemoveMember('admin', owner, { owners: 2 }), false);
  assert.equal(canRemoveMember('owner', owner, { owners: 2 }), true);
  assert.equal(canRemoveMember('owner', owner, { self: true, owners: 1 }), false);
});

test('Seats come only from the API limit: no number when it is unknown', () => {
  assert.equal(seatSummary(undefined, 1, 0), null);
  assert.equal(seatSummary(null, 1, 0), null);
  assert.deepEqual(seatSummary(5, 2, 1), { limit: 5, used: 3, free: 2, full: false });
  assert.deepEqual(seatSummary(1, 1, 0), { limit: 1, used: 1, free: 0, full: true });
  assert.equal(roleLabel('admin'), 'Admin');
});
