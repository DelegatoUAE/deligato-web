// Badge silently renders an UNSTYLED pill for an unknown tone. Wave 1 of the
// Admin portal shipped tone="danger" (not a tone) on its most urgent flags, so
// the flags that most needed colour had none. Found only by looking at the
// running app; this keeps it from coming back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const badge = readFileSync(join(SRC, 'design/ui/Badge.jsx'), 'utf8');
const TONES = new Set(badge.match(/tone: ([a-z |]+)/)[1].split('|').map((s) => s.trim()));

test('every Badge tone used by the Admin screens is a real tone', () => {
  assert.ok(TONES.has('bad') && TONES.has('warn') && !TONES.has('danger'));
  const files = [join(SRC, 'lib/admin.js'), ...readdirSync(join(SRC, 'pages/admin')).map((f) => join(SRC, 'pages/admin', f))];
  const bad = [];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    // literal tone="x" on a Badge, quoted values inside *_TONE maps, and the
    // result branches (after ? or :) of a tone ternary
    for (const m of s.matchAll(/<Badge[^>]*\btone="([a-z]+)"/g)) if (!TONES.has(m[1])) bad.push(`${f}: ${m[1]}`);
    for (const m of s.matchAll(/_TONE = \{([^}]*)\}/g)) for (const v of m[1].matchAll(/'([a-z]+)'/g)) if (!TONES.has(v[1])) bad.push(`${f}: ${v[1]}`);
    for (const m of s.matchAll(/<Badge[^>]*tone=\{[^}]*\}/g)) for (const v of m[0].matchAll(/[?:]\s*'([a-z]+)'/g)) if (!TONES.has(v[1])) bad.push(`${f}: ${v[1]}`);
  }
  assert.deepEqual(bad, []);
});
