// Appearance: Light / Dark / System (D54).
// Pure helpers, no React, so node --test can cover them. The boot script in
// index.html repeats resolve() in plain ES5 so the right theme is on <html>
// before the first paint; theme.test.js runs that script and checks it agrees.
//
// Storage: localStorage only for now. There is no server field for this yet
// (PATCH /users/me accepts full_name, organization, avatar_url); the request is
// BUILD/requests/web-appearance-api.md. Every storage access is wrapped,
// because private windows and blocked site data make it throw.

export const THEME_KEY = 'deligato.theme';
export const PREFERENCES = ['light', 'dark', 'system'];
export const DEFAULT_PREFERENCE = 'system';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export const isPreference = (v) => PREFERENCES.includes(v);

/** The stored choice, or 'system' when nothing valid is stored or storage throws. */
export function readPreference(storage) {
  try {
    const v = storage?.getItem(THEME_KEY);
    return isPreference(v) ? v : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

/** Remembers an explicit choice. Returns false when storage is unavailable (the choice still applies for this visit). */
export function writePreference(storage, pref) {
  if (!isPreference(pref)) return false;
  try {
    storage.setItem(THEME_KEY, pref);
    return true;
  } catch {
    return false;
  }
}

/** Whether the OS asks for dark. False when matchMedia is missing or throws. */
export function systemPrefersDark(win) {
  try {
    return Boolean(win?.matchMedia?.(DARK_QUERY)?.matches);
  } catch {
    return false;
  }
}

/** 'light' | 'dark' for a preference and the current OS setting. */
export function resolveTheme(pref, systemDark) {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}

/** Puts the theme on <html>: data-theme drives the tokens, data-theme-pref is for QA and the toggle. */
export function applyTheme(doc, pref, resolved) {
  const el = doc?.documentElement;
  if (!el) return;
  el.setAttribute('data-theme', resolved);
  el.setAttribute('data-theme-pref', pref);
  el.style.colorScheme = resolved;
}

export const PREFERENCE_LABELS = { light: 'Light', dark: 'Dark', system: 'System' };
