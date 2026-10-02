import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, Icon, Tooltip } from '../../design/ui';

export const FUNDRAISING_LINE = 'We help you with fundraising. We never fundraise for you.';

export function FundraisingNotice({ short = false }) {
  return <p className="fr-notice">{short ? 'You stay in control of every contact.' : FUNDRAISING_LINE}</p>;
}

/** "From Conncct" + "Update in Conncct ↗" on read-only imported values. */
export function ConncctSourceTag({ href, label = 'From Conncct', link = true }) {
  return (
    <span className="srctag">
      <Badge tone="outline" size="sm">{label}</Badge>
      {link && href && <a href={href} target="_blank" rel="noreferrer" className="srctag-link">Update in Conncct ↗</a>}
    </span>
  );
}

export function ConncctLink({ href, children = 'Update in Conncct ↗', variant = 'secondary', size = 'sm' }) {
  return (
    <Button as="a" href={href} target="_blank" rel="noreferrer" variant={variant} size={size}>{children}</Button>
  );
}

/** A locked feature: what it does, which package unlocks it, one CTA. */
export function GateCard({ title, body, code = 'investor-ready', cta = 'See packages', compact = false }) {
  return (
    <Card tone="outline" className={`gate${compact ? ' gate-compact' : ''}`}>
      <div className="gate-icon" aria-hidden="true"><Icon name="lock" /></div>
      <div className="gate-body">
        <h3 className="gate-title">{title}</h3>
        {body && <p>{body}</p>}
      </div>
      <Button as={Link} to={`/packages?highlight=${code}`} variant="secondary" size="sm">{cta}</Button>
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
