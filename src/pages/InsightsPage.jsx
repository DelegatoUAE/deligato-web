import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, SkeletonCards, StatTile, Table } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getInsights } from '../lib/learning';
import { isMissingEndpoint } from '../lib/auth';
import { passReasonLabel } from '../lib/fundraising';
import { tierLabel } from '../lib/capital';
import { fmtUsd, humanise, pct, plural } from '../lib/format';

const READINESS_LINK = { traction_insufficient: 'revenue', valuation: 'dilution', team: 'experience' };

/** 12 · Outcomes and insights, from outcome_events (GET /api/v1/learning/insights/:id). */
export default function InsightsPage() {
  const { companyId } = useCompany();
  const q = useApi(() => getInsights(companyId, 90), [companyId]);
  const head = <><SubNav section="capital" /><PageHeader title="Insights" subtitle="What is working in your raise, and whether our fit predictions held. Last 90 days." /></>;

  if (q.error) {
    return <div>{head}{isMissingEndpoint(q.error)
      ? <EmptyState icon="chart" title="Insights aren't connected in this environment yet." body="They appear once the learning service is running." />
      : <LoadError error={q.error} onRetry={q.reload} what="your insights" />}</div>;
  }
  const d = q.data;
  if (!d) return <div>{head}<SkeletonCards count={3} height={90} /></div>;
  const t = d.tiles || {};
  if (!t.contacted && !(d.funnel || []).some((f) => f.count > 0) && !d.feedback?.relevant && !d.feedback?.not_relevant) {
    return <div>{head}<EmptyState icon="chart" title="Insights appear once you've contacted a few investors and logged what happened." action={<Button as={Link} to="/capital/pipeline" variant="primary">Open pipeline</Button>} /></div>;
  }
  const passes = d.pass_reasons || [];
  const maxPass = Math.max(1, ...passes.map((p) => p.count));

  return (
    <div>
      {head}
      <section className="home-stats insights-stats">
        <StatTile label="Contacted" value={t.contacted ?? 0} />
        <StatTile label="Replied" value={t.replied ?? 0} foot={t.contacted ? `${pct(t.replied, t.contacted)}% of contacted` : ''} />
        <StatTile label="Meetings" value={t.meetings ?? 0} />
        <StatTile label="Term sheets" value={t.term_sheets ?? 0} foot={t.term_sheet_amount_usd ? fmtUsd(t.term_sheet_amount_usd) : ''} />
      </section>
      {d.sample?.small && t.contacted > 0 && <p className="ui-muted">Based on {plural(d.sample.contacted, 'investor')}. Treat as directional.</p>}
      <Card title="Funnel">
        <ol className="funnel">{(d.funnel || []).map((s) => <li key={s.stage}><span>{s.stage === 'saved' ? 'Shortlisted' : humanise(s.stage)}</span><strong>{s.count}</strong></li>)}</ol>
      </Card>
      {(d.tier_outcomes || []).length > 0 && (
        <Card title="Did our fit prediction hold?" subtitle="By the fit tier when you shortlisted each provider.">
          <Table dense rowKey="tier" rows={d.tier_outcomes} columns={[
            { key: 'tier', header: 'Fit when saved', render: (r) => tierLabel(r.tier) },
            { key: 'contacted', header: 'Contacted', numeric: true }, { key: 'replied', header: 'Replied', numeric: true },
            { key: 'meeting', header: 'Meeting', numeric: true }, { key: 'passed', header: 'Passed', numeric: true },
          ]} />
          {d.headline && <p className="ui-muted">{d.headline}</p>}
        </Card>
      )}
      <div className="ui-grid ui-grid-2">
        <Card title="Why investors passed">
          {passes.length ? (
            <ul className="bars">{passes.map((p) => (
              <li key={p.reason || p.reason_code}>
                <span className="bars-label">{passReasonLabel(p.reason || p.reason_code)}</span>
                <span className="bars-track"><i style={{ width: `${(p.count / maxPass) * 100}%` }} /></span>
                <span className="bars-n">{p.count}</span>
                {READINESS_LINK[p.reason || p.reason_code] && <span className="bars-link">{passReasonLabel(p.reason || p.reason_code)} links to your readiness {READINESS_LINK[p.reason || p.reason_code]} factor. <Link to="/capital/improve">See advice</Link></span>}
              </li>
            ))}</ul>
          ) : <p className="ui-muted">No passes recorded yet.</p>}
        </Card>
        <Card title="Your feedback on matches">
          <p>{d.feedback?.relevant ?? 0} relevant · {d.feedback?.not_relevant ?? 0} not relevant</p>
          {d.feedback?.top_reason && <p className="ui-muted">Top reason: {humanise(d.feedback.top_reason)}</p>}
          <p className="ui-muted">Corrections suggested: {d.corrections?.submitted ?? 0} ({d.corrections?.accepted ?? 0} accepted)</p>
        </Card>
      </div>
    </div>
  );
}
