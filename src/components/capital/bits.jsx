import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, Icon, Tooltip } from '../../design/ui';
import { MATCHING_UPGRADE, upgradeHref } from '../../lib/plan';

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
 * D68: the Free state wherever matching would be (Matches, Find Capital, profiles). Free has no
 * investor/provider matching; it says so plainly, points to Capital Raising, keeps the capital
 * routes one click away and, when the company saved investors earlier, links to them (read-only).
 */
export function MatchingUpgrade({ savedCount = 0, showRoutes = true }) {
  return (
    <Card className="match-upgrade" eyebrow="Capital Raising" title={MATCHING_UPGRADE.title}>
      <p>{MATCHING_UPGRADE.body}</p>
      {savedCount > 0 && <p className="ui-muted">{MATCHING_UPGRADE.readOnly}</p>}
      <div className="ui-row">
        <Button as={Link} to={upgradeHref('capital-raising')} variant="accent" iconRight="arrowRight">See Capital Raising</Button>
        {showRoutes && <Button as={Link} to="/capital/find" variant="secondary">See the capital routes that fit</Button>}
        {savedCount > 0 && <Button as={Link} to="/capital/saved" variant="link">View your {savedCount} saved {savedCount === 1 ? 'investor' : 'investors'}</Button>}
      </div>
    </Card>
  );
}

/** D68: one line above a Free company's earlier saves. */
export function ReadOnlyNote() {
  return <Alert tone="info" title="Read-only on Free">{MATCHING_UPGRADE.readOnly} <Link to={upgradeHref('capital-raising')}>See Capital Raising</Link>.</Alert>;
}

/** A locked feature: what it does, which package unlocks it, one CTA. */
export function GateCard({ title, body, code = 'capital-raising', cta = 'See plans', compact = false }) {
  return (
    <Card tone="outline" className={`gate${compact ? ' gate-compact' : ''}`}>
      <div className="gate-icon" aria-hidden="true"><Icon name="lock" /></div>
      <div className="gate-body">
        <h3 className="gate-title">{title}</h3>
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
