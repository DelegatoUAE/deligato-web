import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  THEME_KEY, DEFAULT_PREFERENCE, readPreference, writePreference, systemPrefersDark, resolveTheme, applyTheme,
} from './theme.js';

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const broken = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
const media = (dark) => ({ matchMedia: (q) => ({ matches: q === '(prefers-color-scheme: dark)' && dark }) });

test('new users default to System', () => {
  assert.equal(DEFAULT_PREFERENCE, 'system');
  assert.equal(readPreference(memory()), 'system');
  assert.equal(readPreference(undefined), 'system');
});

test('System follows prefers-color-scheme', () => {
  assert.equal(resolveTheme('system', systemPrefersDark(media(true))), 'dark');
  assert.equal(resolveTheme('system', systemPrefersDark(media(false))), 'light');
});

test('an explicit choice wins over the OS setting', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('an explicit choice is remembered', () => {
  const s = memory();
  assert.equal(writePreference(s, 'dark'), true);
  assert.equal(s.m.get(THEME_KEY), 'dark');
  assert.equal(readPreference(s), 'dark');
  writePreference(s, 'system');
  assert.equal(readPreference(s), 'system');
});

test('junk in storage falls back to System, and junk is never written', () => {
  assert.equal(readPreference(memory({ [THEME_KEY]: 'purple' })), 'system');
  const s = memory();
  assert.equal(writePreference(s, 'purple'), false);
  assert.equal(s.m.size, 0);
});

test('storage failure: reading falls back to System, writing reports false and does not throw', () => {
  assert.equal(readPreference(broken), 'system');
  assert.equal(writePreference(broken, 'dark'), false);
});

test('matchMedia missing or throwing means light', () => {
  assert.equal(systemPrefersDark({}), false);
  assert.equal(systemPrefersDark(undefined), false);
  assert.equal(systemPrefersDark({ matchMedia() { throw new Error('nope'); } }), false);
});

test('applyTheme sets data-theme, data-theme-pref and color-scheme on <html>', () => {
  const attrs = {}; const style = {};
  const doc = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, style } };
  applyTheme(doc, 'system', 'dark');
  assert.deepEqual(attrs, { 'data-theme': 'dark', 'data-theme-pref': 'system' });
  assert.equal(style.colorScheme, 'dark');
});

// The index.html boot script must agree with resolveTheme in every case,
// including storage that throws, so there is never a flash of the wrong theme.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const boot = html.match(/<script id="theme-boot">([\s\S]*?)<\/script>/)?.[1];

function runBoot({ stored, dark, storageThrows = false, noMatchMedia = false }) {
  const attrs = {}; const style = {};
  const localStorage = storageThrows ? broken : memory(stored == null ? {} : { [THEME_KEY]: stored });
  const window = { localStorage, ...(noMatchMedia ? {} : media(dark)) };
  const document = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, style } };
  vm.runInNewContext(boot, { window, document });
  return { theme: attrs['data-theme'], pref: attrs['data-theme-pref'], scheme: style.colorScheme };
}

test('index.html boot script exists and runs before the app bundle', () => {
  assert.ok(boot, 'theme-boot script missing from index.html');
  assert.ok(html.indexOf('theme-boot') < html.indexOf('/src/main.jsx'));
  assert.ok(html.indexOf('theme-boot') < html.indexOf('</head>'));
  assert.ok(boot.includes(`'${THEME_KEY}'`), 'boot script uses a different storage key');
});

test('index.html boot script agrees with resolveTheme', () => {
  for (const stored of [null, 'light', 'dark', 'system', 'junk']) {
    for (const dark of [true, false]) {
      const got = runBoot({ stored, dark });
      const pref = readPreference(memory(stored == null ? {} : { [THEME_KEY]: stored }));
      const want = resolveTheme(pref, dark);
      assert.deepEqual(got, { theme: want, pref, scheme: want }, `stored=${stored} dark=${dark}`);
    }
  }
  assert.deepEqual(runBoot({ storageThrows: true, dark: true }), { theme: 'dark', pref: 'system', scheme: 'dark' });
  assert.deepEqual(runBoot({ stored: null, noMatchMedia: true }), { theme: 'light', pref: 'system', scheme: 'light' });
});
