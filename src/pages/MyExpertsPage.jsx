import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageHeader, SkeletonCards } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { loadExpertActivity, projectStatus } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate, humanise } from '../lib/format';

/** 23 · My experts: every expert shortlisted or contacted, grouped by need. */
export default function MyExpertsPage() {
  const { companyId } = useCompany();
  const q = useApi(() => (companyId ? loadExpertActivity(companyId) : []), [companyId]);
  const head = <><SubNav section="experts" /><PageHeader title="My experts" subtitle="Experts you shortlisted or asked to talk to, and where each stands." /></>;
  if (q.error) {
    return <div>{head}{isMissingEndpoint(q.error) ? <EmptyState icon="users" title="Expert Access isn't connected in this environment yet." body="Your experts appear here once it is running." /> : <LoadError error={q.error} onRetry={q.reload} what="your experts" />}</div>;
  }
  if (!q.data) return <div>{head}<SkeletonCards count={3} height={80} /></div>;
  const rows = q.data.filter((r) => r.consultant_id || r.shortlisted.length || r.kind === 'capital_assessment');
  return (
    <div>
      {head}
      {rows.length === 0 ? (
        <EmptyState icon="users" title="Experts you shortlist will appear here." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />
      ) : (
        <div className="ui-stack">
          {rows.map((r) => (
            <Card key={r.id} title={r.topic || humanise(r.kind)} subtitle={`${r.kind === 'capital_assessment' ? 'Capital Assessment · ' : ''}${fmtDate(r.created_at)}`}
              action={<Badge tone={r.project ? 'ok' : r.consultant_id ? 'gold' : 'neutral'}>{r.project ? 'In a project' : r.consultant_id ? `Requested ${fmtDate(r.created_at)}` : r.status === 'requested' ? 'Awaiting confirmation' : humanise(r.status)}</Badge>}>
              <ul className="xmine">
                {r.consultant_id && <li><Link to={`/experts/${r.consultant_id}?brief=${r.id}`}>Expert you asked to talk to</Link> · {r.project ? projectStatus(null, { status: 'proposed' }) : 'conversation requested'}</li>}
                {r.shortlisted.filter((c) => c !== r.consultant_id).map((c) => {
                  const m = r.matched.find((x) => x.consultant_id === c);
                  return <li key={c}><Link to={`/experts/${c}?brief=${r.id}`}>Shortlisted expert</Link>{m?.score != null && <span className="ui-muted"> · {Math.round(m.score)} Expert fit for “{r.topic}”</span>}</li>;
                })}
              </ul>
              {!r.consultant_id && !r.shortlisted.length && r.matched.length > 0 && <Button as={Link} to={`/experts/results/${r.id}`} variant="link" size="sm">See the {r.matched.length} matched experts</Button>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
