const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'deligato.access_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable: session lasts for this tab only */ }
}

/**
 * Read either error shape the API returns (handoffs H5):
 *   { error: 'text' }                    legacy routes + /capital
 *   { error: { code, message, ... } }    /api/v1 modules
 * plus `upgrade_required: true` on the capital 402s.
 */
export function readError(body, status) {
  const e = body && typeof body === 'object' ? body.error : null;
  if (e && typeof e === 'object') {
    return { message: e.message || `Request failed (${status})`, code: e.code || null };
  }
  if (typeof e === 'string' && e) return { message: e, code: null };
  if (typeof body === 'string' && body && body.length < 300 && !body.startsWith('<')) return { message: body, code: null };
  return { message: `Request failed (${status})`, code: null };
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    const err = new Error("We couldn't reach the server. Check your connection and try again.");
    err.status = 0;
    err.code = 'network';
    throw err;
  }
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const { message, code } = readError(body, res.status);
    const err = new Error(message);
    err.status = res.status;
    err.code = code || (res.status === 402 ? 'upgrade_required' : null);
    err.upgradeRequired = res.status === 402 || Boolean(body && body.upgrade_required);
    err.body = body;
    throw err;
  }
  return body;
}

/** True when the endpoint is not there yet (404 with no module error code, or a module's own not_found for the route). */
export function isMissingEndpoint(err) {
  if (!err || err.status !== 404) return false;
  if (typeof err.body === 'string' || err.body == null) return true; // Express "Cannot GET" page
  return (err.code === 'not_found' || err.code === 'route_not_found') && /^no (such|route)/i.test(err.message || '');
}

export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.session.access_token);
  return data.user;
}

export async function signup({ email, password, full_name, role, organization }) {
  const data = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name, role, organization }),
  });
  setToken(data.session.access_token);
  return data.user;
}

export async function fetchMe() {
  return apiFetch('/auth/me');
}

export function logout() {
  setToken(null);
}

export const STAFF_ROLES = ['project_manager', 'employee', 'finance', 'executive_hr'];
export function isStaff(me) {
  return STAFF_ROLES.includes(me?.profile?.role);
}
