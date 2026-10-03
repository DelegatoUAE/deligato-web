// Home "Your next best actions" (00-home-command-centre.md §4).
// PURE: no imports, no network, no Date.now() unless `now` is omitted. It can
// move server-side unchanged. Tested by home.test.js (node --test).

const ACTIVE = ['researching', 'intro_requested', 'contacted', 'in_conversation', 'diligence', 'term_sheet'];
const STALE_DAYS = 21;
const POOL_ORDER = { P: 0, U: 1, R: 2, M: 3 };
const DAY = 86400000;

const daysBetween = (a, b) => Math.floor((b - new Date(a).getTime()) / DAY);
const fmtN = (n) => Number(n).toLocaleString('en-US');

/**
 * inputs: {
 *   now?: number (ms), raiseTiming?: string,
 *   readiness?: payload readiness block | null, readinessSource?: 'conncct'|'embedded',
 *   capitalNeedConfirmed: bool, hasRun: bool,
 *   pipeline?: [{ id, stage, stage_entered_at?, updated_at?, name }],
 *   unlocks?: GET /capital/profiles/:id/unlocks body,
 *   newStrong?: { n, since } | null,
 *   dismissed?: Set<string> of `${pool}:${key}`,
 * }
 * → [{ pool, key, rank, title, why, cta, to, href?, bridge?: {kind, key}, dismissible }]
 */
export function rankActions(inputs = {}) {
  const now = inputs.now ?? Date.now();
  const dismissed = inputs.dismissed || new Set();
  const r = inputs.readiness || null;

  // 1. setup (never dismissible), at most 2; S2+S3 together only without S1
  const setup = [];
  if (!r) setup.push({ pool: 'S', key: 'S1', title: 'Get your Capital Readiness Score', why: '14 short questions. It shows how investors are likely to read your company.', cta: 'Get your score', to: '/capital/readiness/assess' });
  else if (r.provisional && inputs.readinessSource === 'conncct') setup.push({ pool: 'S', key: 'S1', title: 'Finish your readiness questions', why: 'Your score is provisional until every question is answered.', cta: 'See readiness', to: '/capital/readiness' });
  if (!inputs.capitalNeedConfirmed) setup.push({ pool: 'S', key: 'S2', title: "Confirm what you're raising", why: 'Amount, instrument and timing drive every route and match.', cta: 'Confirm your raise', to: '/capital/need' });
  if (!inputs.hasRun && (inputs.capitalNeedConfirmed || !setup.some((s) => s.key === 'S1'))) {
    setup.push({ pool: 'S', key: 'S3', title: 'Find your capital routes and matches', why: 'See which kinds of capital fit, then the providers inside them.', cta: 'Find capital', to: '/capital/find' });
  }
  let shownSetup = setup;
  if (setup.some((s) => s.key === 'S1') && setup.some((s) => s.key === 'S3')) shownSetup = setup.filter((s) => s.key !== 'S3');
  shownSetup = shownSetup.slice(0, 2).map((s) => ({ ...s, dismissible: false }));

  // 2. scored candidates
  const timing = inputs.raiseTiming;
  const close = timing === 'now' || timing === '0_3m';
  const far = timing === '6_12m' || timing === 'exploring';
  const cands = [];

  for (const p of inputs.pipeline || []) {
    if (!ACTIVE.includes(p.stage)) continue;
    const days = daysBetween(p.stage_entered_at || p.updated_at, now);
    if (!(days > STALE_DAYS)) continue;
    let score = 60 + Math.min(days - STALE_DAYS, 30) + (['diligence', 'term_sheet'].includes(p.stage) ? 10 : 0);
    if (close) score += 10;
    cands.push({ pool: 'P', key: String(p.id), raw: days, score: Math.min(score, 100), title: `Any news from ${p.name || 'this provider'}?`, why: `No update in ${days} days. Log a reply or move it on.`, cta: 'Update card', to: '/capital/pipeline' });
  }

  const u = inputs.unlocks;
  if (u) {
    const dom = u.blockers?.dominant_blocker;
    if (dom) {
      const relax = (u.unlocks || []).find((x) => x.kind === dom.dimension || x.field === dom.dimension);
      cands.push({
        pool: 'U', key: `dominant:${dom.dimension}`, raw: dom.also_involved, score: 78 + (close ? 5 : 0),
        title: `${dom.label || dom.dimension} is behind ${dom.share_of_excluded}% of your exclusions`,
        why: relax ? `${relax.label}: +${fmtN(relax.unlocks)} gained · −${fmtN(relax.loses)} lost · net ${relax.net > 0 ? '+' : ''}${fmtN(relax.net)}` : `It's a reason for ${fmtN(dom.also_involved)} of ${fmtN(u.blockers.excluded)} exclusions.`,
        cta: 'See options', to: '/capital/improve', bridge: { kind: 'match_blocker', key: dom.dimension },
      });
    }
    for (const x of u.unlocks || []) {
      if (!(x.net > 0)) continue;
      if (dom && (x.kind === dom.dimension || x.field === dom.dimension)) continue;
      cands.push({
        pool: 'U', key: `unlock:${x.kind}:${String(x.to)}`, raw: x.net, score: 50 + Math.min(25, Math.round(10 * Math.log10(1 + x.net))) + (close ? 5 : 0),
        title: x.label, why: `+${fmtN(x.unlocks)} gained · −${fmtN(x.loses)} lost · net +${fmtN(x.net)}`, cta: 'See options', to: '/capital/improve', bridge: { kind: 'match_blocker', key: x.kind },
      });
    }
    const res = (u.resolvable || [])[0];
    if (res) {
      cands.push({ pool: 'U', key: `resolve:${res.field}`, raw: res.moves_from_unknown, score: 48 + (close ? 5 : 0), title: `${res.label} so ${fmtN(res.moves_from_unknown)} providers can be properly checked`, why: "Some will fit, some won't. Your list may get shorter but more accurate.", cta: 'See how', to: '/capital/improve', bridge: { kind: 'match_blocker', key: 'profile' } });
    }
  }

  for (const f of r?.factors || []) {
    if (f.key === 'debt' || f.key === 'debt_type') continue;
    const unknown = f.status === 'unknown' || f.status === 'missing';
    const ratio = unknown ? 0 : f.max ? Number(f.points) / Number(f.max) : 1;
    if (!(unknown || ratio < 0.6)) continue;
    const imp = (r.improvements || []).find((i) => i.factor === f.key);
    const gap = 1 - ratio;
    cands.push({
      pool: 'R', key: f.key, raw: gap, score: 45 + Math.round(30 * gap) + (far ? 10 : 0),
      title: unknown ? `${f.label} isn't answered yet` : `${f.label} is a readiness gap (${f.points} of ${f.max})`,
      why: imp ? `Suggested: "${imp.action}"` : 'Investors read this factor closely.',
      cta: 'See readiness', to: '/capital/readiness#gaps', bridge: { kind: 'readiness_factor', key: f.key },
    });
  }

  if (inputs.newStrong && inputs.newStrong.n > 0) {
    const n = inputs.newStrong.n;
    cands.push({ pool: 'M', key: 'new-strong', raw: n, score: 55 + Math.min(20, 5 * n), title: `${n} new strong ${n === 1 ? 'match' : 'matches'}${inputs.newStrong.since ? ` since ${inputs.newStrong.since}` : ''}`, why: 'Strong fits from your latest run that you haven\'t opened yet.', cta: 'See matches', to: '/capital/matches?tier=strong' });
  }

  const live = cands.filter((c) => !dismissed.has(`${c.pool}:${c.key}`));
  live.sort((a, b) => b.score - a.score || POOL_ORDER[a.pool] - POOL_ORDER[b.pool] || b.raw - a.raw);

  // 3. fill remaining slots, at most 2 per pool
  const out = [...shownSetup];
  const perPool = {};
  for (const c of live) {
    if (out.length >= 3) break;
    if ((perPool[c.pool] || 0) >= 2) continue;
    perPool[c.pool] = (perPool[c.pool] || 0) + 1;
    out.push({ ...c, dismissible: true });
  }
  return out.map((a, i) => ({ ...a, rank: i + 1 }));
}

/** Readiness gaps count for the K5 tile. */
export function countGaps(r) {
  return (r?.factors || []).filter((f) => f.key !== 'debt_type'
    && (['missing', 'unknown'].includes(f.status) || (f.max ? Number(f.points) / Number(f.max) < 0.6 : false))).length;
}

export function partOfDay(date = new Date()) {
  const h = date.getHours();
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';
}
