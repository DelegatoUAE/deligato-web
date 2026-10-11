// Presentation of the four Home signals (11 Oct redesign): a status tone, an optional 0-100 bar
// and one action. Tones come only from what the API already says (the readiness band, missing
// record items, a confirmed raise); no new score or threshold is invented here (D40).

const READINESS_TONE = [
  [/exceptional|investor[- ]ready|^ready/i, 'ok'],
  [/semi|medium/i, 'warn'],
  [/high|critical|very/i, 'bad'],
];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n))));

/** { tone: ok|warn|bad|todo|neutral, pct: number|null, action: string } for one signal. */
export function signalStatus(kind, s) {
  if (!s) return { tone: 'todo', pct: null, action: 'Open' };
  if (kind === 'financial_health') {
    if (s.score == null) return { tone: s.status === 'not_applicable' ? 'neutral' : 'todo', pct: null, action: s.status === 'not_applicable' ? 'See Financial Health' : 'Do your first check-in' };
    return { tone: 'neutral', pct: Number.isFinite(Number(s.score)) ? clamp(s.score) : null, action: 'See Financial Health' };
  }
  if (kind === 'capital_readiness') {
    if (s.status !== 'scored') return { tone: 'todo', pct: null, action: 'Take the assessment' };
    const tone = (READINESS_TONE.find(([re]) => re.test(String(s.band || ''))) || [null, 'neutral'])[1];
    return { tone, pct: clamp(s.score), action: 'See your readiness' };
  }
  if (kind === 'company_record') {
    if (s.pct == null) return { tone: 'todo', pct: null, action: 'Start your record' };
    const f = s.freshness || {};
    const tone = f.expired || f.missing || f.expiring ? 'warn' : 'ok';
    return { tone, pct: clamp(s.pct), action: f.missing || f.expired || f.expiring ? 'Complete your record' : 'Open your record' };
  }
  if (kind === 'capital_need') {
    if (!s.confirmed && !s.raise_usd) return { tone: 'todo', pct: null, action: 'Confirm your raise' };
    return { tone: s.confirmed ? 'ok' : 'warn', pct: null, action: s.confirmed ? 'Review your raise' : 'Confirm your raise' };
  }
  return { tone: 'neutral', pct: null, action: 'Open' };
}

export const TONE_WORD = { ok: 'On track', warn: 'Needs attention', bad: 'Needs work', todo: 'To do', neutral: null };
