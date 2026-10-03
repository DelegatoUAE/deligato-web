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


/** D14 source label. Stealth: "Conncct" appears only as the methodology name; an imported score says "Imported". */
export function readinessSource(out) {
  const embedded = out?.engine === 'embedded' || ['conncct_embedded', 'deligato_reference'].includes(out?.source);
  return embedded
    ? { key: 'embedded', label: 'Conncct method, assessed here', foot: 'Assessed here with the Conncct method on' }
    : { key: 'conncct', label: 'Imported score', foot: 'Imported, scored with the Conncct method on' };
}

/** Gaps (00 §3 K5): missing/unknown factors, or under 60% of their points; debt_type excluded. */
export function readinessGapFactors(r) {
  return (r?.factors || []).filter((f) => !['debt', 'debt_type'].includes(f.key)
    && (['missing', 'unknown'].includes(f.status) || (f.max ? Number(f.points) / Number(f.max) < 0.6 : false)));
}

/**
 * I-01/I-06: "Your gaps" in the readiness method's own order (improvements[],
 * by rank; never re-ranked here). Home's count and "Biggest" read this list,
 * so they always equal the Readiness page.
 */
export function readinessGaps(r) {
  return (r?.improvements || []).filter((i) => !['debt_type'].includes(i.factor)).slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
}

// I-06: plain factor names. The method's labels carry its internals
// ("Raise vs cost (Q2 ÷ Q3)"); founders see what the factor means.
const PLAIN_FACTOR = { raise_vs_cost: 'Raise vs yearly cost', dilution: 'Raise vs valuation (dilution)' };
export function factorName(f) {
  if (!f) return '';
  if (PLAIN_FACTOR[f.key || f.factor]) return PLAIN_FACTOR[f.key || f.factor];
  return String(f.label || f.key || f.factor || '').replace(/\s*\((?:Q\d+[^)]*)\)/g, '').trim();
}
/** A factor the questionnaire never asked: "Not asked yet", never "unknown". */
export const notAsked = (f) => f && (f.status === 'unknown' || f.status === 'missing');
