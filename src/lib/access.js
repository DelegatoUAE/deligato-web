// Team & Access display rules (R-F2, R-BE-F7). The API is authoritative and
// answers 403 insufficient_role; these only hide controls that would fail.
// They mirror api middleware/company-access.js and modules/team (PURE).

/** Only an owner may remove the company. No `access_role` = an older API: today's behaviour. */
export const canDeleteCompany = (company) => !company?.access_role || company.access_role === 'owner';

export const ROLES = ['owner', 'admin', 'member', 'viewer'];
const RANK = { viewer: 1, member: 2, admin: 3, owner: 4 };
const rank = (r) => RANK[r] || 0;

export const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };
export const ROLE_HELP = {
  owner: 'Everything, including the plan, billing and deleting the company.',
  admin: 'Invites and manages teammates, and does everything a member can.',
  member: 'Works on the raise: matches, shortlist, pipeline, outreach drafts and the data room.',
  viewer: 'Can read everything, but cannot change anything.',
};
export const roleLabel = (r) => ROLE_LABEL[r] || 'Viewer';

/** Admin or owner: may see invites, invite, change roles and remove teammates. */
export const canManageTeam = (role) => rank(role) >= RANK.admin;

/** Roles this actor may hand out (in an invite or a role change). Only an owner grants owner. */
export function assignableRoles(actorRole) {
  if (!canManageTeam(actorRole)) return [];
  return actorRole === 'owner' ? ROLES : ROLES.filter((r) => r !== 'owner');
}

/**
 * May `actorRole` change this member's role? Never your own row here (leaving is separate),
 * an admin never touches an owner, and the last owner keeps the role.
 */
export function canChangeRole(actorRole, member, { self = false, owners = 1 } = {}) {
  if (!member || self || !canManageTeam(actorRole)) return false;
  if (member.role === 'owner') return actorRole === 'owner' && owners > 1;
  return true;
}

/** May `actorRole` remove this member? Anyone may leave, except the last owner. */
export function canRemoveMember(actorRole, member, { self = false, owners = 1 } = {}) {
  if (!member) return false;
  if (member.role === 'owner') return owners > 1 && (self || actorRole === 'owner');
  return self || canManageTeam(actorRole);
}

/**
 * Seats from the API: `limit` is entitlements.limits.seats (fair-use, configurable; never a
 * number written here). Used = members + pending invites, the API's own counter.
 * Returns null when the limit is not known (e.g. a teammate who cannot read the owner's plan).
 */
export function seatSummary(limit, members = 0, pending = 0) {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return null;
  const used = members + pending;
  return { limit, used, free: Math.max(0, limit - used), full: used >= limit };
}
