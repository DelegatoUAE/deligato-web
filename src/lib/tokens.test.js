// D54 appearance: the token set is the only place colour lives.
// 1. Every text / control pair meets WCAG AA in light, dark and on the navy chrome.
// 2. The prefers-color-scheme fallback block is identical to [data-theme="dark"].
// 3. No hard-coded colour outside tokens.css, except the listed brand-chrome lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const CSS = readFileSync(join(SRC, 'design/tokens.css'), 'utf8');

function block(css, selector) {
  const i = css.indexOf(selector);
  assert.ok(i >= 0, `missing block ${selector}`);
  let depth = 0;
  const open = css.indexOf('{', i);
  for (let j = open; j < css.length; j += 1) {
    if (css[j] === '{') depth += 1;
    if (css[j] === '}') { depth -= 1; if (depth === 0) return css.slice(open + 1, j); }
  }
  throw new Error(`unclosed ${selector}`);
}
const decls = (body) => {
  const out = {};
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};

const ROOT = decls(block(CSS, ':root {'));
const NAVY = decls(block(CSS, '.ui-on-navy {'));
const DARK_BODY = block(CSS, ":root[data-theme='dark'] {");
const DARK = decls(DARK_BODY);
const MEDIA_BODY = block(block(CSS, '@media (prefers-color-scheme: dark)'), ':root:not([data-theme]) {');

const THEMES = {
  light: { ...ROOT },
  dark: { ...ROOT, ...DARK },
  navy: { ...ROOT, ...NAVY },
};

function resolve(theme, value, depth = 0) {
  if (depth > 20) throw new Error(`var loop at ${value}`);
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, name, fb) => {
    const v = THEMES[theme][name] ?? fb;
    if (v == null) throw new Error(`${theme}: undefined ${name}`);
    return resolve(theme, v, depth + 1);
  });
}
function rgba(str) {
  const s = str.trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  if (s === 'transparent') return [0, 0, 0, 0];
  throw new Error(`not a colour: ${s}`);
}
const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
const lum = (c) => {
  const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** colour of a stack of tokens painted bottom-up, e.g. ['--bg', '--surface', '--ok-tint'] */
function paint(theme, stack) {
  let c = [255, 255, 255, 1];
  for (const t of stack) c = over(rgba(resolve(theme, `var(${t})`)), c);
  return c;
}
export function contrast(theme, fg, stack) {
  const bg = paint(theme, stack);
  return ratio(over(rgba(resolve(theme, `var(${fg})`)), bg), bg);
}

const S = ['--bg', '--surface'];
const TEXT = 4.5; const UI = 3;
// [label, foreground, background stack, minimum]
const PAIRS = [
  ['body text on page', '--text', ['--bg'], TEXT],
  ['body text on card', '--text', S, TEXT],
  ['heading on card', '--text-strong', S, TEXT],
  ['soft text on card', '--text-soft', S, TEXT],
  ['soft text on page', '--text-soft', ['--bg'], TEXT],
  ['soft text on inset', '--text-soft', [...S, '--surface-2'], TEXT],
  ['soft text on modal', '--text-soft', ['--bg', '--surface-raised'], TEXT],
  ['faint text on card', '--text-faint', S, TEXT],
  ['faint text on page', '--text-faint', ['--bg'], TEXT],
  ['faint text on sunken', '--text-faint', ['--bg-sunken'], TEXT],
  ['link on card', '--text-link', S, TEXT],
  ['gold words on card', '--text-accent', S, TEXT],
  ['text on hover row', '--text', [...S, '--surface-hover'], TEXT],
  ['text on selected row', '--text', [...S, '--surface-selected'], TEXT],
  ['text on warm panel', '--text', ['--bg', '--surface-warm'], TEXT],
  ['primary button label', '--on-brand-fill', ['--brand-fill'], TEXT],
  ['primary button hover', '--on-brand-fill', ['--brand-fill-hover'], TEXT],
  ['gold button label', '--text-on-gold', ['--accent'], TEXT],
  ['danger button label', '--on-bad-solid', ['--bad-solid'], TEXT],
  ['neutral badge', '--on-brand-tint', [...S, '--brand-tint'], TEXT],
  ['gold badge', '--on-gold-tint', [...S, '--gold-tint'], TEXT],
  ...['ok', 'warn', 'bad', 'info'].flatMap((h) => [
    [`${h} badge`, `--${h}-fg`, [...S, `--${h}-tint`], TEXT],
    [`${h} alert`, `--${h}-fg-strong`, [...S, `--${h}-bg`], TEXT],
    [`${h} text on card`, `--${h}-fg`, S, TEXT],
    [`${h} toast mark`, `--on-${h}-solid`, [`--${h}-solid`], UI],
    [`${h} solid mark on card`, `--${h}-solid`, S, UI],
  ]),
  ['fit yes chip', '--fit-yes-fg', [...S, '--fit-yes-bg'], TEXT],
  ['fit partial chip', '--fit-partial-fg', [...S, '--fit-partial-bg'], TEXT],
  ['fit no chip', '--fit-no-fg', [...S, '--fit-no-bg'], TEXT],
  ['fit unknown chip', '--fit-unknown-fg', S, TEXT],
  ['fit yes mark', '--fit-yes-mark', S, UI],
  ['fit yes glyph', '--fit-yes-on-mark', ['--fit-yes-mark'], UI],
  ['fit partial mark', '--fit-partial-mark', S, UI],
  ['fit no mark', '--fit-no-mark', S, UI],
  ['fit unknown mark', '--fit-unknown-mark', S, UI],
  ['input edge', '--border-control', S, UI],
  ['focus ring', '--border-focus', S, UI],
  ['match segment', '--brand-fill', S, UI],
  ['toast text', '--toast-fg', ['--toast-bg'], TEXT],
  ['toast detail', '--toast-fg-soft', ['--toast-bg'], TEXT],
  ['tooltip', '--tip-fg', ['--tip-bg'], TEXT],
  ...['critical', 'very-high', 'high', 'medium', 'semi', 'ready', 'exceptional'].map((b) => [`band chip ${b}`, '--on-band', [`--band-${b}`], TEXT]),
];

for (const theme of ['light', 'dark']) {
  test(`WCAG AA contrast: ${theme} theme`, () => {
    const fails = PAIRS
      .map(([label, fg, stack, min]) => [label, contrast(theme, fg, stack), min])
      .filter(([, r, min]) => r < min)
      .map(([label, r, min]) => `${label}: ${r.toFixed(2)} < ${min}`);
    assert.deepEqual(fails, []);
  });
}

test('WCAG AA contrast: navy brand chrome (sidebar, auth panel, dial)', () => {
  const NAVY_PAIRS = [
    ['text', '--text', ['--surface'], TEXT], ['soft text', '--text-soft', ['--surface'], TEXT],
    ['gold words', '--text-accent', ['--surface'], TEXT], ['link', '--text-link', ['--surface'], TEXT],
    ['button on navy', '--on-brand-fill', ['--brand-fill'], TEXT],
    ['fit yes chip', '--fit-yes-fg', ['--surface', '--fit-yes-bg'], TEXT],
    ['fit no chip', '--fit-no-fg', ['--surface', '--fit-no-bg'], TEXT],
  ];
  const fails = NAVY_PAIRS.filter(([, fg, st, min]) => contrast('navy', fg, st) < min).map(([l, fg, st]) => `${l}: ${contrast('navy', fg, st).toFixed(2)}`);
  assert.deepEqual(fails, []);
});

test('dark theme re-points every semantic colour the light theme defines', () => {
  const isColour = (k) => { try { rgba(resolve('light', ROOT[k])); return true; } catch { return false; } };
  const semantic = Object.keys(ROOT).filter((k) => /^--(bg|surface|border|text|brand-(fill|mid|muted|tint)|on-|accent|gold-(tint|wash|line)|track|ok-|warn-|bad-|info-|fit-|scrim|toast|tip|chrome)/.test(k)
    && !/^--(ok|warn|bad|info)-\d/.test(k) && isColour(k));
  const missing = semantic.filter((k) => !(k in DARK) && !/unknown-bg|border-focus/.test(k));
  assert.deepEqual(missing, []);
});

test('System fallback (prefers-color-scheme) matches the explicit dark block exactly', () => {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  assert.equal(norm(MEDIA_BODY), norm(DARK_BODY));
});

test('fit states stay distinguishable from each other in both themes', () => {
  for (const theme of ['light', 'dark']) {
    const marks = ['yes', 'partial', 'no', 'unknown'].map((s) => paint(theme, [...S, `--fit-${s}-mark`]));
    for (let i = 0; i < marks.length; i += 1) {
      for (let j = i + 1; j < marks.length; j += 1) {
        const d = Math.hypot(marks[i][0] - marks[j][0], marks[i][1] - marks[j][1], marks[i][2] - marks[j][2]);
        assert.ok(d > 60, `${theme}: fit marks ${i}/${j} too close (${d.toFixed(0)})`);
      }
    }
  }
});

// ---- no hard-coded colours outside tokens.css ------------------------------
// Literal colours are allowed only in tokens.css and on these lines, which
// draw the fixed navy brand chrome (5 Oct landing: product-view frame and sidebar, journey strip,
// navy compare column and step badges, the always-navy evidence band and its fixed source chips)
// (white type and white hairlines on navy,
// gold glows) and look the same in both themes. Everything else uses tokens.
const ALLOWED_FILES = new Set(['design/tokens.css', 'design/Showcase.jsx', 'design/showcase.css', 'lib/tokens.test.js',
  // the readiness dial's gold arc gradient: always drawn on the navy dial
  'design/ui/ScoreRing.jsx']);
const COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(\s*\d|\b(?:white|black)\s*[;}]/i;
// raw scale steps (--navy-200, --gold-dark, --ok-600, --cream-2...) do not change with the theme
const RAW = /var\(--(?:navy|gold|cream|n|ok|warn|bad|info)(?:-(?:\d+|dark|2))?\s*[,)]/;
const CHROME = /^\s*\.(ui-on-navy|ui-panel-navy|ui-dial|ui-bandstrip|ui-shell-(side|brand|user|foot)|ui-wordmark|ui-navitem|ui-shell-section-title|ui-stat-navy|signout|ms-(tile|label|low \.ms-tile)|ui-match-seg|ui-btn-(primary|accent|gold)\b|coswitch|tabbar|ms-tile|login-|mcompare-bar|aiconsent-ic|lp-step-icon|appearance-swatch|lp-(header|wordmark|nav|signin|burger|hero(?!-card-(tag|title|foot))|proof|trust-navy|final|footer|section-navy|skip|asof|eyebrow-gold|lede|step-icon|app|journey-strip|js-n|compare-dg|step-n|step-visual|v-num|section-ink|evi|prov|btn-outline)|applayout|ui-conf|ui-badge-neutral|ui-progress-brand)/;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('no hard-coded colours or raw scale steps outside tokens (brand-chrome lines excepted)', () => {
  const offenders = [];
  for (const file of walk(SRC).filter((f) => /\.(css|jsx?)$/.test(f))) {
    const rel = relative(SRC, file).split('\\').join('/');
    if (ALLOWED_FILES.has(rel) || rel.endsWith('.test.js')) continue;
    let rule = '';
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
      if (code.includes('{')) rule = code;           // the rule a multi-line body belongs to
      if (!COLOUR.test(code) && !RAW.test(code)) return;
      if (rel.endsWith('.css') && (CHROME.test(code) || CHROME.test(rule))) return;
      offenders.push(`${rel}:${i + 1}: ${code.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(offenders, []);
});
