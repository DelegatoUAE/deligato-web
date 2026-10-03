import { Link } from 'react-router-dom';
import { Avatar, Badge, Button, EmptyState, PageHeader, SkeletonCards } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listShortlist, listExpertRequests, SENIORITY } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate } from '../lib/format';

async function load(companyId) {
  const [s, r] = await Promise.all([listShortlist(companyId), listExpertRequests(companyId).catch(() => ({ requests: [] }))]);
  const requests = r.requests || [];
  const rows = new Map();
  for (const it of s.items || []) {
    rows.set(it.expert.id, { expert: it.expert, request_id: it.request_id, status: 'shortlisted', at: it.shortlisted_at, topic: requests.find((x) => x.id === it.request_id)?.topic });
  }
  for (const q of requests.filter((x) => x.consultant_id)) {
    const cur = rows.get(q.consultant_id) || { expert: { id: q.consultant_id }, request_id: q.id };
    rows.set(q.consultant_id, { ...cur, status: 'requested', at: q.created_at, topic: cur.topic || q.topic });
  }
  return { rows: [...rows.values()], assessments: requests.filter((x) => x.kind === 'capital_assessment') };
}

/** 23 · My experts: everyone shortlisted or asked to talk, once each, with their status. */
export default function MyExpertsPage() {
  const { companyId } = useCompany();
  const q = useApi(() => (companyId ? load(companyId) : { rows: [], assessments: [] }), [companyId]);
  const head = <><SubNav section="experts" /><PageHeader title="My experts" subtitle="Experts you shortlisted or asked to talk to, and where each stands." /></>;
  if (q.error) {
    return <div>{head}{isMissingEndpoint(q.error) ? <EmptyState icon="users" title="Expert Access isn't connected in this environment yet." /> : <LoadError error={q.error} onRetry={q.reload} what="your experts" />}</div>;
  }
  if (!q.data) return <div>{head}<SkeletonCards count={3} height={72} /></div>;
  const { rows, assessments } = q.data;
  return (
    <div>
      {head}
      {assessments.length > 0 && <p className="ui-muted">Capital Assessment requested {fmtDate(assessments[0].created_at)} · awaiting confirmation</p>}
      {rows.length === 0 ? (
        <EmptyState icon="users" title="Experts you shortlist will appear here." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />
      ) : (
        <ul className="saved">
          {rows.map((r) => (
            <li key={r.expert.id} className="saved-row xmine-row">
              <Avatar name={r.expert.full_name || r.expert.display_name || 'Expert'} size={40} />
              <div className="saved-main">
                <Link className="mrow-name" to={`/experts/${r.expert.id}${r.request_id ? `?brief=${r.request_id}` : ''}`}>{r.expert.display_name || r.expert.full_name || 'Expert'}</Link>
                <span className="mrow-meta">{[SENIORITY[r.expert.seniority], r.expert.location, r.topic && `for “${r.topic}”`].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="ui-row">
                <Badge tone={r.status === 'requested' ? 'gold' : 'neutral'}>{r.status === 'requested' ? `Requested ${fmtDate(r.at)}` : `Shortlisted ${fmtDate(r.at)}`}</Badge>
                <Button as={Link} size="sm" variant="secondary" to={`/experts/${r.expert.id}${r.request_id ? `?brief=${r.request_id}` : ''}`}>Open</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
