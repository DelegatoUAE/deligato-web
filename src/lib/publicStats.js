// D33 / I-02: the landing page's numbers come live from a public, read-only
// counts endpoint (GET /public/stats, requested in
// BUILD/requests/improve-web-public-stats.md). Never hand-typed: if the
// endpoint is missing, slow or malformed, the numbers are hidden.
// Pure; tested in publicStats.test.js.

// `from` lists the field names accepted, newest first: the live API (api/lib/public-stats.js)
// sends `providers` and `verified`; the original request named them capital_providers / primary_verified.
const FIELDS = [
  { key: 'capital_providers', from: ['providers', 'capital_providers'], label: 'capital providers' },
  { key: 'countries', from: ['countries'], label: 'countries' },
  { key: 'gcc_hq', from: ['gcc_hq'], label: 'headquartered in the GCC' },
  { key: 'primary_verified', from: ['verified', 'primary_verified'], label: "checked against the provider's own website or register" },
];

const okInt = (v) => Number.isInteger(v) && v > 0;

/**
 * → { asOf: 'YYYY-MM-DD', items: [{ key, value, label }] } or null.
 * Only fields that are positive integers are shown; no date, no numbers.
 */
export function normaliseStats(body) {
  if (!body || typeof body !== 'object') return null;
  const asOf = typeof body.as_of === 'string' && !Number.isNaN(Date.parse(body.as_of)) ? body.as_of.slice(0, 10) : null;
  if (!asOf) return null;
  const items = FIELDS
    .map((f) => ({ key: f.key, label: f.label, value: f.from.map((k) => body[k]).find(okInt) }))
    .filter((f) => f.value !== undefined);
  return items.length ? { asOf, items } : null;
}

/** Fetch with a short timeout; any failure resolves to null (the strip hides). */
export async function loadPublicStats(baseUrl, { timeoutMs = 3500, fetchImpl = globalThis.fetch } = {}) {
  if (!fetchImpl) return null;
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(`${baseUrl}/public/stats`, { signal: ctrl?.signal, credentials: 'omit' });
    if (!res.ok) return null;
    return normaliseStats(await res.json());
  } catch {
    return null;
  } finally {
    if (t) clearTimeout(t);
  }
}
