import { Link, useParams } from 'react-router-dom';
import { Alert, Avatar, Badge, Card, PageHeader, Skeleton } from '../design/ui';
import { apiFetch } from '../lib/auth';
import useApi from '../lib/useApi';
import { AVAILABILITY, SENIORITY } from '../lib/experts';

/** Staff · one expert's admin record (founders use /experts/:id, which never shows rates). */
export default function ConsultantDetailPage() {
  const { id } = useParams();
  const q = useApi(() => apiFetch(`/consultants/${id}`).then((d) => d.consultant || d), [id]);
  if (q.error) return <Alert tone="bad">{q.error.message}</Alert>;
  const c = q.data;
  if (!c) return <Skeleton h="240px" />;
  const av = AVAILABILITY[c.availability];
  return (
    <div>
      <Link to="/workspace/experts" className="back">← Expert admin</Link>
      <PageHeader eyebrow="Workspace" title={c.full_name} subtitle={[SENIORITY[c.seniority], c.location].filter(Boolean).join(' · ')} meta={av && <Badge tone={av.tone} dot>{av.label}</Badge>} />
      <div className="ui-grid ui-grid-2">
        <Card title="Profile">
          <div className="ui-who"><Avatar name={c.full_name} size={48} /><div className="ui-who-text"><span className="ui-who-name">{c.full_name}</span><span className="ui-who-sub">{c.email || 'Email not on record'}</span></div></div>
          {c.bio ? <p>{c.bio}</p> : <p className="ui-faint">No bio on record.</p>}
        </Card>
        <Card title="Skills and rate">
          <div className="ui-tags">{(c.skills || []).map((s) => <span key={s} className="ui-tag">{s}</span>)}</div>
          <p className="ui-muted">{c.daily_rate_gbp ? `£${c.daily_rate_gbp} a day` : 'Rate not set'} · staff only</p>
        </Card>
      </div>
    </div>
  );
}
