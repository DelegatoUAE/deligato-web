import { Link } from 'react-router-dom';
import { Alert, Card, PageHeader, StatTile } from '../../design/ui';
import useApi from '../../lib/useApi';
import { getLearningMetrics, listAllocations, listCorrections, listExperts, listProjects } from '../../lib/admin';

const pct = (x) => (x == null ? '–' : `${Math.round(Number(x) * 100)}%`);
const settle = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));

/** Admin overview: what needs a staff decision today. Staff only (API-enforced). */
export default function AdminHomePage() {
  const q = useApi(() => Promise.all([
    settle(listCorrections('pending')), settle(listAllocations({ status: 'proposed' })),
    settle(listExperts()), settle(listProjects('active')), settle(getLearningMetrics()),
  ]), []);
  const [corr, alloc, experts, projects, metrics] = q.data || [];
  const val = (r, f) => (!q.data ? undefined : r?.ok ? f(r.v) : '–');
  const failed = (q.data || []).filter((r) => !r.ok);

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Admin overview" subtitle="What needs a staff decision. Founders never see this section." />
      {failed.length > 0 && <Alert tone="warn">{failed.length} of 5 sources didn't load: {failed.map((r) => r.e.message).join(' · ')}</Alert>}
      <section className="admin-stats">
        <StatTile as={Link} to="/admin/corrections" tone="navy" label="Corrections to review" loading={!q.data} value={val(corr, (v) => v.counts?.pending ?? 0)} foot="Founder and agent data fixes" />
        <StatTile as={Link} to="/admin/projects" label="Allocations to confirm" loading={!q.data} value={val(alloc, (v) => v.length)} foot="Proposed, waiting for staff" />
        <StatTile as={Link} to="/admin/projects" label="Active projects" loading={!q.data} value={val(projects, (v) => v.length)} />
        <StatTile as={Link} to="/admin/experts" label="Experts in the network" loading={!q.data} value={val(experts, (v) => v.length)} foot={val(experts, (v) => `${v.filter((x) => x.availability === 'available').length} available`)} />
        <StatTile as={Link} to="/admin/learning" label="Precision at 10" loading={!q.data} value={val(metrics, (v) => pct(v.precision_at_10?.precision))} foot={val(metrics, (v) => `${v.precision_at_10?.contacted ?? 0} contacted in top 10s`)} />
      </section>
      <div className="ui-grid ui-grid-2">
        <Card title="Review queue" subtitle="Accepting a correction never edits a record directly: accepted fixes are exported for the research pipeline.">
          <Link to="/admin/corrections">Open corrections</Link>
        </Card>
        <Card title="Expert work" subtitle="Confirm proposed allocations, move projects through their status, and match experts to a brief.">
          <div className="ui-row"><Link to="/admin/projects">Projects and allocations</Link><Link to="/admin/match">AI Match</Link></div>
        </Card>
      </div>
    </div>
  );
}
