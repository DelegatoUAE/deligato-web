// How Ask AI says what an answer is based on. Pure (node:test).
// It printed internal paths: "Next top.label (…, from company_intelligence)",
// "Factors.runway.points (2, from readiness)". A founder should read where a
// fact came from, not our field names (D57, seen in real use 4 Oct).
const SOURCE = {
  company: 'your profile', company_profile: 'your profile', readiness: 'Capital Readiness',
  company_intelligence: 'your Home priorities', financial_health: 'Financial Health', snapshot: 'Financial Health',
  company_record: 'Company Record', pipeline: 'your pipeline', match_run: 'your latest matches',
  fact: 'your check-in', profile_event: 'your profile history', readiness_history: 'Capital Readiness history',
};
const FIELD = {
  'next_top.label': 'Top priority', 'top[0].name': 'Top match', new_eligible: 'New verified fits',
  target_funding_date: 'Target funding date', runway_months: 'Runway', raise_usd: 'Raise amount',
  hq_country: 'HQ country', 'vitals.runway_months': 'Runway',
};
const TAIL = new Set(['points', 'label', 'name', 'value', 'score']);
const words = (s) => String(s).replace(/\[\d+\]/g, '').replace(/_/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());

export function fieldWords(field) {
  if (!field) return '';
  if (FIELD[field]) return FIELD[field];
  const parts = String(field).split('.').filter(Boolean);
  while (parts.length > 1 && TAIL.has(parts[parts.length - 1])) parts.pop();
  if (parts[0] === 'factors' && parts.length > 1) parts.shift();
  return words(parts[parts.length - 1] || field);
}

export function citeText(c = {}) {
  const f = fieldWords(c.field);
  const v = c.value === null || c.value === undefined || c.value === '' ? '' : String(c.value);
  const src = c.source ? SOURCE[c.source] || words(c.source).toLowerCase() : '';
  // The top priority's value repeats the action it explains; say where it is from instead.
  if (c.field === 'next_top.label') return `${f}, from ${src || 'your Home priorities'}`;
  return `${f}${v ? `: ${v}` : ''}${src ? `, from ${src}` : ''}`;
}

export default citeText;
