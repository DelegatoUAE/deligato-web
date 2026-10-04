// What a staff member is shown when a screen crashes.
//
// Pure, so it is tested with the project's node:test runner. The boundary used
// to show every user the same sentence and swallow the cause, which made a
// crash on Home and a crash on Admin Overview indistinguishable (Bilal, 4 Oct).
//
// Deliberately narrow: the error name and message, the screen, and the HTTP
// status / code / request id when the throw came from an API call (lib/auth.js
// attaches those). The response BODY is never included — it can carry company
// data, and a diagnostic panel is not a reason to put customer information on
// screen.
const MAX = 300;

export function errorDetails(error, screen) {
  const rows = [
    ['Screen', screen || '—'],
    ['Error', `${error?.name || 'Error'}: ${String(error?.message ?? error).slice(0, MAX)}`],
  ];
  if (error?.status !== undefined && error?.status !== null) rows.push(['HTTP', String(error.status)]);
  if (error?.code) rows.push(['Code', String(error.code)]);
  const rid = error?.body?.error?.request_id || error?.body?.request_id;
  if (rid) rows.push(['Request id', String(rid)]);
  return rows;
}

export default errorDetails;

/**
 * What a signed-out visitor sees when an auth call fails (UAT F16). A 4xx
 * message is the API's own founder copy; a server fault or a network failure
 * never shows its internals (an env variable name, a stack line).
 */
export function publicAuthError(error, unavailable) {
  const status = Number(error?.status);
  if (!status || status >= 500) return unavailable;
  return error?.message || unavailable;
}
