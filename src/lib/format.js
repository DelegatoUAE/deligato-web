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

/** Exact price as printed in the catalog ($6,999 · $7.99). */
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
