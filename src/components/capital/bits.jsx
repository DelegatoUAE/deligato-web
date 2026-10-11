import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, Icon, ProgressBar, Tooltip } from '../../design/ui';
import { basicMatching, canCompare, capacityLine, nextPlanFor, upgradeHref } from '../../lib/plan';
import { ladderPlan, useLadder } from '../../lib/ladder';
import { fmtInt } from '../../lib/format';
import { headingTag, useHeadingLevel } from '../../design/ui/heading-context.js';

export const FUNDRAISING_LINE = 'We help you with fundraising. We never fundraise for you.';

export function FundraisingNotice({ short = false }) {
  return <p className="fr-notice">{short ? 'You stay in control of every contact.' : FUNDRAISING_LINE}</p>;
}

/** "Imported" tag on values that arrived from a readiness partner (stealth: no partner name, no external link). */
export function ConncctSourceTag({ label = 'Imported' }) {
  return (
    <span className="srctag">
      <Badge tone="outline" size="sm">{label}</Badge>
    </span>
  );
}

/**
 * D73 (supersedes the D68/D69 locked teaser): every plan sees real ranked matches up to its limit
 * (Free 5, Capital Intelligence 50, Capital Raising 200). This line says how many this plan shows
 * and, when a higher plan shows more, names it with ITS number from the public catalog. No number is
 * typed here; without the catalog the line just says less.
 */
export function MoreMatchesNote({ shown, eligible, ents, tier, compact = false }) {
  const catalog = useLadder();
  const next = nextPlanFor(tier);
  const nextPlan = next ? ladderPlan(catalog, next) : null;
  const max = Number.isInteger(ents?.max_results) ? ents.max_results : null;
  const more = Number.isFinite(eligible) && Number.isFinite(shown) && eligible > shown;
  if (!more && !nextPlan) return null;
  const nextMax = nextPlan?.display?.max_results;
  const lead = Number.isFinite(shown)
    ? `Showing your top ${fmtInt(shown)} ranked ${shown === 1 ? 'match' : 'matches'}${more ? ` of ${fmtInt(eligible)} that pass your filters` : ''}.`
    : max ? `Your plan shows your top ${fmtInt(max)} ranked matches per run.` : null;
  const extra = basicMatching(ents) ? ' with full explanations and contact routes' : canCompare(ents) ? '' : ' with comparison, meeting prep and export';
  return (
    <div className={`plan-note${compact ? ' is-compact' : ''}`} role="note">
      <p>{lead}{nextPlan && nextMax ? ` ${nextPlan.name} shows ${String(nextMax).replace(/^Up to/, 'up to')} per run${extra}.` : ''}</p>
      {nextPlan && <Button as={Link} to={upgradeHref(next)} variant="secondary" size="sm" iconRight="arrowRight">See {nextPlan.name}</Button>}
    </div>
  );
}

/** D73: the plan's explanation, AI and outreach levels, in the API's own words (shown honestly, never inflated). */
export function PlanLevels({ display }) {
  const rows = [['Explanations', display?.match_explanation_level], ['AI', display?.ai_level], ['Outreach', display?.outreach_level]]
    .filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <p className="plan-levels" aria-label="What your plan includes here">
      {rows.map(([k, v]) => <span key={k} className="plan-level"><span className="plan-level-k">{k}</span> {/^not included$/i.test(v) ? 'Not on your plan' : v}</span>)}
    </p>
  );
}

/**
 * D73 active-capacity meter for the shortlist or the active pipeline, from GET /capital/pipeline
 * `capacity` ({ used, limit }). Over or at the limit says what frees a slot; nothing is ever deleted.
 */
export function CapacityMeter({ cap, bucket, upgrade = null }) {
  if (!cap) return null;
  const c = capacityLine(cap, bucket);
  const tone = c.state === 'over' ? 'bad' : c.state === 'full' ? 'warn' : 'gold';
  return (
    <div className={`cap-meter is-${c.state}`} data-bucket={bucket}>
      {c.limit > 0
        ? <ProgressBar value={Math.min(c.used, c.limit)} max={c.limit} tone={tone} label={bucket === 'shortlist' ? 'Shortlist' : 'Active pipeline'} valueText={c.text} />
        : <p className="cap-meter-text"><strong>{bucket === 'shortlist' ? 'Shortlist' : 'Active pipeline'}</strong> {c.text}</p>}
      {c.hint && (
        <p className="cap-meter-hint">{c.hint}{upgrade && (c.state === 'full' || c.state === 'over' || c.state === 'none') ? <> <Link to={upgradeHref(upgrade)}>See plans</Link></> : null}</p>
      )}
    </div>
  );
}

/** D73: items whose bucket is not on the plan (e.g. active items on Free) stay visible, read-only. */
export function ReadOnlyNote({ upgrade = 'capital-intelligence' }) {
  return (
    <Alert tone="info" title="Some saved investors are read-only on your plan">
      You can view them, move them to closed, passed or rejected, or remove them. They stay in your history. <Link to={upgradeHref(upgrade)}>See plans</Link>.
    </Alert>
  );
}

/** A locked feature: what it does, which package unlocks it, one CTA. */
export function GateCard({ title, body, code = 'capital-raising', cta = 'See plans', compact = false }) {
  const level = useHeadingLevel();
  return (
    <Card tone="outline" className={`gate${compact ? ' gate-compact' : ''}`}>
      <div className="gate-icon" aria-hidden="true"><Icon name="lock" /></div>
      <div className="gate-body">
        {createElement(headingTag(level), { className: 'gate-title' }, title)}
        {body && <p>{body}</p>}
      </div>
      <Button as={Link} to={upgradeHref(code)} variant="secondary" size="sm">{cta}</Button>
    </Card>
  );
}

export function ProviderBadge({ provider }) {
  const ai = provider && provider !== 'heuristic' && provider !== 'template';
  const tip = ai
    ? 'An AI model re-ranked your top 40 for relevance. Eligibility and confidence are rules-based and can\'t be changed by the model.'
    : 'Ranked by our matching rules. AI refinement wasn\'t used for this run.';
  return (
    <Tooltip text={ai ? 'AI re-ranked your top 40; eligibility stays rules-based' : 'Ranked by our matching rules'}>
      <Badge tone={ai ? 'gold' : 'outline'} title={tip} tabIndex={0}>{ai ? 'AI-refined' : 'Rules-based'}</Badge>
    </Tooltip>
  );
}

/** A card-level failure with a Retry (dashboard cards fail independently). */
export function LoadError({ error, onRetry, what = 'this' }) {
  return (
    <Alert tone="bad" action={onRetry ? <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button> : null}>
      Couldn't load {what}. {error?.status === 0 ? error.message : ''}
    </Alert>
  );
}

/** An endpoint that another workstream hasn't shipped yet. Honest, no fake data. */
export function NotAvailableYet({ title, body, action }) {
  return <EmptyState icon="info" title={title} body={body} action={action} compact />;
}
