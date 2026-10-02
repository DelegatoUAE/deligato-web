import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, SkeletonCards, StatTile, Table } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getMetrics, listFeedback } from '../lib/learning';
import { isMissingEndpoint } from '../lib/auth';
import { passReasonLabel } from '../lib/fundraising';
import { humanise, pct } from '../lib/format';

const READINESS_LINK = { traction_insufficient: 'revenue', valuation: 'dilution', team: 'experience', timing_fund_cycle: null };

export default function InsightsPage() {
  const { companyId, staff } = useCompany();
  const q = useApi(() => getMetrics(companyId), [companyId]);
  const fbQ = useApi(() => listFeedback(companyId).then((x) => x.feedback || []).catch(() => []), [companyId]);
  const head = <><SubNav section="capital" /><PageHeader title="Insights" subtitle="What is working in your raise, and whether our fit predictions held." /></>;

  if (q.error) {
    return <div>{head}{isMissingEndpoint(q.error)
      ? <EmptyState icon="chart" title="Insights aren't connected in this environment yet." body="They appear once the learning service is running." />
      : <LoadError error={q.error} onRetry={q.reload} what="your insights" />}</div>;
  }
  if (!q.data) return <div>{head}<SkeletonCards count={3} height={90} /></div>;

  const stages = q.data.funnel?.stages || [];
  const reached = (k) => stages.find((s) => s.stage === k)?.reached || 0;
  const contacted = reached('contacted');
  const replied = reached('replied');
  const passes = q.data.pass_reasons || [];
  const fb = fbQ.data || [];
  const up = fb.filter((f) => f.rating === 1).length;
  const down = fb.filter((f) => f.rating === -1).length;

  if (!contacted && !reached('saved') && !fb.length) {
    return <div>{head}<EmptyState icon="chart" title="Insights appear once you've contacted a few investors and logged what happened." action={<Button as={Link} to="/capital/pipeline" variant="primary">Open pipeline</Button>} /></div>;
  }

  return (
    <div>
      {head}
      <section className="home-stats">
        <StatTile label="Contacted" value={contacted} />
        <StatTile label="Replied" value={replied} foot={contacted ? `${pct(replied, contacted)}% of contacted` : ''} />
        <StatTile label="Meetings" value={reached('meeting')} />
        <StatTile label="Term sheets" value={reached('term_sheet')} />
      </section>
      {contacted > 0 && contacted < 10 && <p className="ui-muted">Based on {contacted} investors. Treat as directional.</p>}
      <Card title="Funnel">
        <ol className="funnel">{stages.map((s) => <li key={s.stage}><span>{humanise(s.stage)}</span><strong>{s.reached}</strong></li>)}</ol>
      </Card>
      <div className="ui-grid ui-grid-2">
        <Card title="Why investors passed">
          {passes.length ? (
            <ul className="bars">{passes.map((p) => (
              <li key={p.reason}><span className="bars-label">{passReasonLabel(p.reason)}</span><span className="bars-track"><i style={{ width: `${(p.count / passes[0].count) * 100}%` }} /></span><span className="bars-n">{p.count}</span>
                {READINESS_LINK[p.reason] && <span className="bars-link">{passReasonLabel(p.reason)} links to your Conncct {READINESS_LINK[p.reason]} factor. <Link to="/capital/improve">See advice</Link></span>}
              </li>
            ))}</ul>
          ) : <p className="ui-muted">No passes recorded yet.</p>}
        </Card>
        <Card title="Your feedback on matches">
          <p>{up} relevant · {down} not relevant</p>
          {q.data.feedback?.reasons?.[0] && <p className="ui-muted">Top reason: {humanise(q.data.feedback.reasons[0].reason)}</p>}
        </Card>
      </div>
      {q.data.by_fit_pattern?.length > 0 && (
        <Card title="Did our fit prediction hold?">
          <Table dense rowKey={(r) => r.pattern || r.key} columns={[
            { key: 'pattern', header: 'Fit at shortlist', render: (r) => humanise(r.pattern || r.key) },
            { key: 'contacted', header: 'Contacted', numeric: true }, { key: 'replied', header: 'Replied', numeric: true },
            { key: 'meeting', header: 'Meeting', numeric: true }, { key: 'passed', header: 'Passed', numeric: true },
          ]} rows={q.data.by_fit_pattern} />
        </Card>
      )}
      {staff && <p className="ui-faint">Model health (precision by tier, weight suggestions) is in the staff tools.</p>}
    </div>
  );
}
