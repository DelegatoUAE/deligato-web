// Readiness display helpers. The band comes from Conncct; nothing is derived here.
// Band key (R1–R7, from Conncct) → design tone. Deligato never derives a band.
const TONE = { R1: 'critical', R2: 'very-high', R3: 'high', R4: 'medium', R5: 'semi', R6: 'ready', R7: 'exceptional' };
const BY_NAME = {
  'critical risk': 'critical', 'very high risk': 'very-high', 'high risk': 'high', 'medium risk': 'medium',
  'semi-ready': 'semi', 'investor-ready': 'ready', exceptional: 'exceptional',
};

export function bandOf(r) {
  const b = r?.band;
  if (!b) return { name: null, tone: null, description: null };
  if (typeof b === 'string') return { name: b, tone: BY_NAME[b.toLowerCase()] || null, description: null };
  return { name: b.name || null, tone: TONE[b.key] || BY_NAME[String(b.name || '').toLowerCase()] || null, description: b.description || null };
}

export function provisionalText(r) {
  if (!r?.provisional) return null;
  const c = r.completeness;
  return c && c.required ? `provisional (${c.answered}/${c.required} answered)` : 'provisional';
}

/** "Investor-Ready" or "High Risk · provisional (10/12 answered)". */
export function bandLabel(r) {
  const { name } = bandOf(r);
  const p = provisionalText(r);
  return p ? `${name} · ${p}` : name;
}

