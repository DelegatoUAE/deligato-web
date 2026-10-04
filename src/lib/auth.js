const ENV = (import.meta && import.meta.env) || {};
const API_URL = ENV.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'deligato.access_token';
const REFRESH_KEY = 'deligato.refresh_token';
const EXPIRES_KEY = 'deligato.expires_at';
// Renew this many seconds before the access token expires.
const REFRESH_LEEWAY_S = 60;

function store(key, value) {
  try {
    if (value) localStorage.setItem(key, String(value));
    else localStorage.removeItem(key);
  } catch { /* storage unavailable: session lasts for this tab only */ }
}
function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function getToken() {
  return read(TOKEN_KEY);
}

// Access token only (dev persona sign-in). Clearing it clears the whole session.
export function setToken(token) {
  store(TOKEN_KEY, token);
  if (!token) { store(REFRESH_KEY, null); store(EXPIRES_KEY, null); }
}

// Incident 4 Oct 2026: Supabase access tokens last ~1 hour. Only the access
// token was kept, so an hour after sign-in every call failed and the founder
// was signed out. Keep the refresh token and renew before expiry.
export function setSession(session) {
  if (!session || !session.access_token) { setToken(null); return; }
  store(TOKEN_KEY, session.access_token);
  store(REFRESH_KEY, session.refresh_token || null);
  store(EXPIRES_KEY, session.expires_at || null);
}

let refreshing = null;
// One renewal at a time; every caller waiting on it gets the same answer.
// Resolves true when a new session is stored; false (session cleared) when the
// refresh token is spent; throws on a network error (session kept).
export function refreshSession() {
  const refreshToken = read(REFRESH_KEY);
  if (!refreshToken) return Promise.resolve(false);
  if (!refreshing) {
    refreshing = (async () => {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (body && body.session && body.session.access_token) { setSession(body.session); return true; }
      }
      if (res.status === 400 || res.status === 401) {
        // Another tab may already have rotated it: use theirs if it is newer.
        if (read(REFRESH_KEY) !== refreshToken) return true;
        setToken(null);
        return false;
      }
      const err = new Error(`Session refresh failed (${res.status})`);
      err.status = res.status;
      throw err;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

function expiresSoon(nowS = Date.now() / 1000) {
  const exp = Number(read(EXPIRES_KEY));
  return Boolean(exp) && exp - nowS < REFRESH_LEEWAY_S;
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

const isAuthPath = (path) => /^\/auth\/(login|signup|refresh|forgot-password|reset-password|dev-)/.test(path);

export async function apiFetch(path, options = {}, { retried = false } = {}) {
  if (!isAuthPath(path) && read(REFRESH_KEY) && expiresSoon()) {
    try { await refreshSession(); } catch { /* offline: try the call anyway */ }
  }
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
  if (res.status === 401 && !retried && token && !isAuthPath(path) && read(REFRESH_KEY)) {
    const renewed = await refreshSession().catch(() => false);
    if (renewed) return apiFetch(path, options, { retried: true });
  }
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
  setSession(data.session);
  return data.user;
}

export async function signup({ email, password, full_name, role, organization }) {
  const data = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name, role, organization }),
  });
  setSession(data.session);
  return data.user;
}

export async function fetchMe() {
  return apiFetch('/auth/me');
}

export function logout() {
  setToken(null);
}

// Same list the API trusts (api/modules/experts/access.js). `is_admin` comes
// from GET /auth/me (S2), computed server-side with isAdmin(req).
export const STAFF_ROLES = ['project_manager', 'executive_hr', 'finance', 'admin'];
export function isStaff(me) {
  return me?.is_admin === true || STAFF_ROLES.includes(me?.profile?.role);
}
