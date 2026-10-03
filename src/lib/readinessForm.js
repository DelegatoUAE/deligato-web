// I-09 / I-06: readiness questionnaire helpers. Pure (no React, no network);
// tested in readinessForm.test.js. Nothing here scores: answers go to the
// readiness method unchanged. These only prefill, remember and display.

/** Runway in months → the method's own option label. */
export function runwayOption(months) {
  const m = Number(months);
  if (months === null || months === undefined || months === '' || !Number.isFinite(m) || m < 0) return null;
  if (m >= 24) return '24 months and over';
  if (m >= 18) return '18–24 months';
  if (m >= 12) return '12–18 months';
  if (m >= 6) return '6–12 months';
  return 'under 6 months';
}

/** Raise in USD → the method's own option label. */
export function raiseOption(usd) {
  const v = Number(usd);
  if (usd === null || usd === undefined || usd === '' || !Number.isFinite(v) || v <= 0) return null;
  if (v < 100e3) return 'Under 100k';
  if (v < 250e3) return '100k – 250k';
  if (v < 500e3) return '250k – 500k';
  if (v < 1e6) return '500k – 1M';
  if (v < 2e6) return '1M – 2M';
  if (v < 5e6) return '2M – 5M';
  return '5M+';
}

/**
 * Answers we already know from the company profile and capital need.
 * Only sets an answer when the label exists in the question's options.
 * → { answers, fromProfile: [keys] }
 */
export function prefillAnswers(company, questions = []) {
  const optionValues = (key) => {
    const q = questions.find((x) => x.key === key);
    return (q?.opts || q?.options || []).map((o) => (typeof o === 'string' ? o : o.value));
  };
  const answers = {};
  const fromProfile = [];
  const put = (key, v) => {
    if (v && optionValues(key).includes(v)) { answers[key] = v; fromProfile.push(key); }
  };
  put('runway', runwayOption(company?.runway_months));
  put('raise_amount', raiseOption(company?.raise_usd));
  return { answers, fromProfile };
}

/** Sentence case for option labels ("Mostly Stable" → "Mostly stable"). Acronyms and "I" stay. */
export function sentenceCase(label) {
  if (typeof label !== 'string' || !label) return label;
  const words = label.split(' ');
  return words.map((w, i) => {
    if (i === 0) return w;
    if (w === 'I' || w.startsWith("I'") || /^[A-Z0-9]{2,}[a-z]?$/.test(w) || /\d/.test(w)) return w;
    return /^[A-Z][a-z]/.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w;
  }).join(' ');
}

/** Founder-facing hints: no "Q2 ÷ Q3" internals of the method. */
export const PLAIN_HINTS = {
  raise_amount: 'In US dollars, for this round.',
  annual_operating_cost: 'In US dollars, per year: what it costs to run the company (your yearly burn).',
  valuation: 'In US dollars. Your last priced valuation or SAFE cap.',
};

/** True when the hint leaks method internals ("Q2", "→", "÷"). */
export const internalHint = (h) => typeof h === 'string' && /\bQ\d+\b|→|÷/.test(h);

const KEY = (companyId) => `deligato.readiness.draft.${companyId}`;
/** Autosave: localStorage may be blocked or full; never throw. */
export function loadDraft(companyId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY(companyId));
    const d = raw ? JSON.parse(raw) : null;
    return d && typeof d.answers === 'object' ? d : null;
  } catch { return null; }
}
export function saveDraft(companyId, draft, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY(companyId), JSON.stringify({ ...draft, saved_at: new Date().toISOString() })); return true; } catch { return false; }
}
export function clearDraft(companyId, storage = globalThis.localStorage) {
  try { storage?.removeItem(KEY(companyId)); } catch { /* nothing to clear */ }
}
