// Team & Access (api modules/team, mounted at /api/v1/team). The API is
// authoritative for every rule; access.js only hides controls that would fail.
import { apiFetch } from './auth';

const base = (companyId) => `/api/v1/team/${encodeURIComponent(companyId)}`;

export const getMembers = (companyId) => apiFetch(`${base(companyId)}/members`);
export const getInvites = (companyId) => apiFetch(`${base(companyId)}/invites`);
export const createInvite = (companyId, { email, role }) =>
  apiFetch(`${base(companyId)}/invites`, { method: 'POST', body: JSON.stringify({ email, role }) });
export const revokeInvite = (companyId, inviteId) =>
  apiFetch(`${base(companyId)}/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
export const changeMemberRole = (companyId, userId, role) =>
  apiFetch(`${base(companyId)}/members/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeMember = (companyId, userId) =>
  apiFetch(`${base(companyId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
export const acceptInvite = (token) =>
  apiFetch('/api/v1/team/invites/accept', { method: 'POST', body: JSON.stringify({ token }) });

// An invite link opened while signed out survives the sign-in / sign-up detour
// in this tab only (sessionStorage), and is cleared once used.
const PENDING_KEY = 'deligato.pending_invite';
const TOKEN_RE = /^inv_[A-Za-z0-9_-]{43}$/;
export const isInviteToken = (t) => typeof t === 'string' && TOKEN_RE.test(t);
export function rememberInvite(token) {
  if (!isInviteToken(token)) return;
  try { sessionStorage.setItem(PENDING_KEY, token); } catch { /* private mode: the link still works when reopened */ }
}
export function pendingInvite() {
  try { const t = sessionStorage.getItem(PENDING_KEY); return isInviteToken(t) ? t : null; } catch { return null; }
}
export function forgetInvite() {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
}
/** Where to go after signing in: a pending invite first, else `fallback`. */
export const afterSignIn = (fallback = '/') => { const t = pendingInvite(); return t ? `/invite/${t}` : fallback; };
