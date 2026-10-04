// Display helpers shared by every screen. Copy rules: ia.md §7.

export function fmtUsd(n) {
  if (n === null || n === undefined || n === '') return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const strip = (s) => s.replace(/\.0$/, '');
  if (v >= 1e9) return `$${strip((v / 1e9).toFixed(1))}B`;
  if (v >= 1e6) return `$${strip((v / 1e6).toFixed(1))}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
}

/** Exact price as printed in the catalog (e.g. $6,999 · $54). */
export function fmtPrice(n) {
  if (n === null || n === undefined) return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function fmtInt(n) {
  if (n === null || n === undefined || n === '') return '–';
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('en-US') : '–';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(d) {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return String(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

export function fmtDateTime(d) {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return String(d);
  const hh = String(x.getHours()).padStart(2, '0');
  const mm = String(x.getMinutes()).padStart(2, '0');
  return `${fmtDate(x)}, ${hh}:${mm}`;
}

export function daysSince(d) {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - x.getTime()) / 86400000));
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function firstName(full) {
  if (!full) return null;
  return String(full).trim().split(/\s+/)[0] || null;
}

export function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export function humanise(code) {
  if (!code) return '';
  const s = String(code).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function plural(n, one, many) {
  return `${fmtInt(n)} ${n === 1 ? one : many || `${one}s`}`;
}

export const TIMINGS = [
  { key: 'now', label: 'Actively raising now' },
  { key: '0_3m', label: '0–3 months' },
  { key: '3_6m', label: '3–6 months' },
  { key: '6_12m', label: '6–12 months' },
  { key: 'exploring', label: 'Just exploring' },
];
export const timingLabel = (k) => TIMINGS.find((t) => t.key === k)?.label || null;

export const PAGE_SUFFIX = 'Deligato';

export const POSITIONING = 'Understand your business. Become capital ready. Find the right capital. Get the right expertise. Execute the raise.';

// D28 (stealth): server provenance text may still say "Conncct Verified";
// the founder UI shows "Research Verified". Applied wherever a server label is shown.
export const stealthLabel = (s) => (typeof s === 'string' ? s.replace(/Conncct Verified/g, 'Research Verified').replace(/Conncct research/g, 'our research team') : s);

// ---- I-10: codes to words -------------------------------------------
const REGION_WORDS = {
  GLOBAL: 'Global', MENA: 'MENA', GCC: 'GCC', NORTH_AMERICA: 'North America', LATAM: 'Latin America', LATIN_AMERICA: 'Latin America',
  EUROPE: 'Europe', EU: 'EU', UK: 'United Kingdom', SSA: 'Sub-Saharan Africa', AFRICA: 'Africa', ASIA: 'Asia', APAC: 'Asia-Pacific',
  SEA: 'Southeast Asia', SOUTH_ASIA: 'South Asia', CEE: 'Central and Eastern Europe', MEA: 'Middle East and Africa', EMEA: 'EMEA',
  NORDICS: 'Nordics', DACH: 'DACH', OCEANIA: 'Oceania', LEVANT: 'Levant', NORTH_AFRICA: 'North Africa', MIDDLE_EAST: 'Middle East',
};
let regionNames = null;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { regionNames = null; }

/** "AE" → "United Arab Emirates"; region codes → words; anything else as sent. */
export function countryName(code) {
  if (!code) return null;
  const c = String(code).trim();
  const up = c.toUpperCase();
  if (REGION_WORDS[up]) return REGION_WORDS[up];
  if (/^[A-Z]{2}$/.test(up)) {
    try { const n = regionNames?.of(up); if (n && n !== up) return n; } catch { /* fall through */ }
  }
  return c;
}

const joinWords = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * Server sentences sometimes carry mandate enums ("a GLOBAL/MENA/NORTH_AMERICA
 * mandate", "both cover GLOBAL/NORTH_AMERICA"). Show them as words. Only
 * all-caps region tokens are touched; nothing else in the sentence changes.
 */
export function wordsForCodes(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\b[A-Z][A-Z_]{1,}(?:\/[A-Z][A-Z_]{1,})+\b|\b[A-Z]+_[A-Z_]+\b|\b(?:GLOBAL|EUROPE|AFRICA|ASIA|LATAM|OCEANIA|NORDICS)\b/g, (m) => {
    const parts = m.split('/');
    if (!parts.every((p) => REGION_WORDS[p] || /^[A-Z]{2}$/.test(p))) return m;
    return joinWords(parts.map((p) => countryName(p)));
  });
}

/** AI sentences sometimes echo their citation ids ("(evidence_id: ev_stage)"); the chips carry them instead. */
export const stripEvidenceIds = (t) => (typeof t === 'string' ? t.replace(/\s*\((?:evidence[_ ]ids?|ids?)\s*:[^)]*\)/gi, '').replace(/\s+([.,;])/g, '$1') : t);

/** 22.4 → "22.4 months"; null stays null. */
export const fmtMonths = (m) => (m == null || !Number.isFinite(Number(m)) ? null : `${Math.round(Number(m) * 10) / 10} months`);

/**
 * Engine sentences (what changed, attention, timing, reassessment) carry ISO dates,
 * periods and timing codes ("On 2026-10-23.", "Figures for 2026-09", "not set → 3_6m").
 * Shown to a founder as words: "23 Oct 2026", "Sep 2026", "3–6 months" (D57: no codes).
 */
export function plainIntel(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+Z?)?\b/g, (m, y, mo, d) => `${Number(d)} ${MONTHS[Number(mo) - 1] || mo} ${y}`)
    .replace(/\b(\d{4})-(0[1-9]|1[0-2])\b/g, (m, y, mo) => `${MONTHS[Number(mo) - 1]} ${y}`)
    .replace(/\b(0_3m|3_6m|6_12m)\b/g, (m) => timingLabel(m) || m)
    .replace(/(→\s*)(now|exploring)\b/g, (m, a, k) => `${a}${timingLabel(k).toLowerCase()}`);
}

// R-F1 (Architecture, 5 Oct): founder-typed profile figures carry the declared
// provenance label, so they never read as Financial Health's computed values.
export const DECLARED_LABEL = 'You told us';
export const DECLARED_PROFILE_FIGURES = ['revenue_usd', 'burn_usd', 'runway_months'];
export const isDeclaredFigure = (field) => DECLARED_PROFILE_FIGURES.includes(field);
