// "Your next best actions" (Home) and gap → expertise mapping (D13).
// Pure functions over data the screens already hold; nothing is invented.
import { filterLabel, ACTIVE_STAGES } from './capital';
import { fmtInt, daysSince } from './format';

/** Conncct readiness factor → the expertise that helps close it (13-expert-support.md skills). */
export const FACTOR_EXPERTISE = {
  runway: 'Fractional CFO',
  profitability: 'Fractional CFO',
  debt: 'Fractional CFO',
  debt_type: 'Fractional CFO',
  raise_vs_cost: 'Financial model',
  revenue: 'Financial model',
  dilution: 'Valuation',
  milestone: 'Pitch & narrative',
};

export function expertiseForFactor(key) {
  return FACTOR_EXPERTISE[key] || null;
}

export function readinessGaps(readiness) {
  return (readiness?.factors || []).filter((f) => f.status && f.status !== 'met');
}

const STALE_DAYS = 21;
export function staleItems(pipeline) {
  return (pipeline || []).filter((p) => ACTIVE_STAGES.includes(p.stage)
    && daysSince(p.stage_entered_at || p.updated_at) >= STALE_DAYS);
}

/**
 * Up to `limit` actions, highest priority first. Each:
 * { id, title, detail, to | href, cta, source: 'raise'|'match'|'readiness'|'pipeline', expertise? }
 */
export function nextBestActions({ company, capitalNeedConfirmed, run, unlocks, readiness, pipeline, limit = 3 }) {
  const out = [];
  if (!company) return out;

  if (!capitalNeedConfirmed) {
    out.push({ id: 'confirm-need', source: 'raise', title: "Confirm what you're raising", detail: 'Amount, instrument, investor types, markets and timing. It takes a minute and drives every match.', to: '/capital/find', cta: 'Find the right capital' });
  } else if (!run) {
    out.push({ id: 'first-run', source: 'match', title: 'Find your capital matches', detail: 'Check every verified capital source against your company and raise.', to: '/capital/find', cta: 'Find the right capital' });
  }

  const stale = staleItems(pipeline)[0];
  if (stale) {
    const name = stale.capital_sources?.name || stale.name || 'this investor';
    out.push({ id: `stale-${stale.id}`, source: 'pipeline', title: `Any news from ${name}?`, detail: `No update in ${daysSince(stale.stage_entered_at || stale.updated_at)} days.`, to: '/capital/pipeline', cta: 'Log an update' });
  }

  const dom = unlocks?.blockers?.dominant_blocker;
  if (dom) {
    out.push({ id: 'dominant', source: 'match', title: `${dom.label || filterLabel(dom.dimension)} is behind ${dom.share_of_excluded}% of your exclusions`, detail: `It's a reason for ${fmtInt(dom.also_involved)} of ${fmtInt(unlocks.blockers.excluded)} exclusions. See what changing it would open, and what it would cost.`, to: '/capital/improve', cta: 'See options' });
  } else if (unlocks) {
    const top = (unlocks.unlocks || []).find((u) => u.net > 0);
    if (top) {
      out.push({ id: `unlock-${top.kind}`, source: 'match', title: top.label, detail: `+${fmtInt(top.unlocks)} gained · −${fmtInt(top.loses)} lost · net ${top.net > 0 ? '+' : ''}${fmtInt(top.net)}`, to: '/capital/improve', cta: 'See options' });
    } else if (unlocks.resolvable?.[0]) {
      const r = unlocks.resolvable[0];
      out.push({ id: `resolve-${r.field}`, source: 'match', title: `${r.label} so ${fmtInt(r.moves_from_unknown)} investors can be properly checked`, detail: "Some will fit, some won't. Your list may get shorter but more accurate.", to: '/capital/improve', cta: 'See how' });
    }
  }

  const strong = run ? run.results.filter((r) => r.fit_tier === 'strong').length : 0;
  if (strong > 0 && pipeline && pipeline.length === 0) {
    out.push({ id: 'shortlist', source: 'match', title: 'Save your strongest matches', detail: `${strong} strong ${strong === 1 ? 'fit' : 'fits'} in your latest run. Saving one starts your pipeline.`, to: '/capital/matches', cta: 'Review matches' });
  }

  const improvements = (readiness?.improvements || []).slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  for (const imp of improvements.slice(0, 2)) {
    const factor = readiness.factors?.find((f) => f.key === imp.factor);
    out.push({
      id: `imp-${imp.factor}-${imp.rank ?? ''}`,
      source: 'readiness',
      title: imp.label || imp.action,
      detail: `Conncct suggests: ${imp.action}${imp.impact_points ? ` (Conncct estimate +${imp.impact_points})` : ''}${factor ? ` · ${factor.label} ${factor.points}/${factor.max}` : ''}`,
      href: 'conncct',
      cta: 'Improve in Conncct ↗',
      expertise: expertiseForFactor(imp.factor),
      factor: imp.factor,
    });
  }

  if (!out.length && run) {
    out.push({ id: 'review', source: 'match', title: 'Review your matches', detail: 'See who fits, and why.', to: '/capital/matches', cta: 'Open matches' });
  }
  // Raise and pipeline items first, then alternate match-gap and readiness
  // so the top three always mix both kinds of advice.
  const first = out.filter((a) => a.source === 'raise' || a.source === 'pipeline');
  const match = out.filter((a) => a.source === 'match');
  const ready = out.filter((a) => a.source === 'readiness');
  const mixed = [...first];
  while (match.length || ready.length) {
    if (match.length) mixed.push(match.shift());
    if (ready.length) mixed.push(ready.shift());
  }
  return mixed.slice(0, limit);
}
