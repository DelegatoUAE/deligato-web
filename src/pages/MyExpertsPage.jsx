import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageHeader, SkeletonCards } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listExpertRequests } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate, humanise } from '../lib/format';

const STATUS_TONE = { requested: 'gold', confirmed: 'ok', scheduled: 'ok', completed: 'neutral', cancelled: 'outline' };

export default function MyExpertsPage() {
  const { companyId } = useCompany();
  const q = useApi(() => (companyId ? listExpertRequests(companyId).then((x) => x.requests || []) : []), [companyId]);
  const head = <><SubNav section="experts" /><PageHeader title="My experts" subtitle="Your requests for help, the advisors you've shortlisted, and where each stands." /></>;
  if (q.error) {
    return <div>{head}{isMissingEndpoint(q.error) ? <EmptyState icon="users" title="Expert requests aren't connected in this environment yet." body="They appear here once Expert Access is running." /> : <LoadError error={q.error} onRetry={q.reload} what="your requests" />}</div>;
  }
  if (!q.data) return <div>{head}<SkeletonCards count={3} height={80} /></div>;
  return (
    <div>
      {head}
      {q.data.length === 0 ? (
        <EmptyState icon="users" title="No requests yet." body="Describe what you need help with and we'll match advisors." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />
      ) : (
        <div className="ui-stack">
          {q.data.map((r) => (
            <Card key={r.id} title={r.topic || humanise(r.kind)} subtitle={`Requested ${fmtDate(r.created_at)}${r.kind === 'capital_assessment' ? ' · Capital Assessment' : ''}`}
              action={<Badge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status === 'requested' ? 'Awaiting confirmation' : humanise(r.status)}</Badge>}>
              {r.message && <p className="ui-muted">{r.message}</p>}
              {r.consultant_id && <Button as={Link} to={`/experts/${r.consultant_id}?request=${r.id}`} variant="secondary" size="sm">View advisor</Button>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
