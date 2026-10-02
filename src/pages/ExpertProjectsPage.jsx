import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressSteps, SkeletonCards, Tabs } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { loadExpertActivity, projectStatus } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate } from '../lib/format';
import ProjectsPage from './ProjectsPage';

const STEPS = ['Requested', 'Confirmed', 'In progress', 'Completed'];

/** 23 · Projects with experts (founder view). Staff keep the legacy projects table. */
export default function ExpertProjectsPage() {
  const { companyId, staff } = useCompany();
  const q = useApi(() => (companyId && !staff ? loadExpertActivity(companyId) : []), [companyId, staff]);
  const [tab, setTab] = useState('all');
  if (staff) return <ProjectsPage />;
  const head = <><SubNav section="experts" /><PageHeader title="Projects" subtitle="Work you've started with an expert, and where it stands." /></>;
  if (q.error) return <div>{head}{isMissingEndpoint(q.error) ? <EmptyState icon="file" title="Projects aren't connected in this environment yet." /> : <LoadError error={q.error} onRetry={q.reload} what="your projects" />}</div>;
  if (!q.data) return <div>{head}<SkeletonCards count={2} height={120} /></div>;
  const projects = q.data.filter((r) => r.project).map((r) => ({ ...r.project, topic: r.topic, request_id: r.id, created_at: r.created_at, label: projectStatus(null, { status: 'proposed' }) }));
  const shown = tab === 'all' ? projects : projects.filter((p) => (tab === 'requested' ? p.label.startsWith('Requested') : tab === 'active' ? p.label === 'In progress' : p.label === 'Completed'));
  return (
    <div>
      {head}
      <Tabs variant="pill" label="Status" value={tab} onChange={setTab} items={[
        { id: 'active', label: 'Active', count: projects.filter((p) => p.label === 'In progress').length },
        { id: 'requested', label: 'Requested', count: projects.filter((p) => p.label.startsWith('Requested')).length },
        { id: 'completed', label: 'Completed', count: projects.filter((p) => p.label === 'Completed').length },
        { id: 'all', label: 'All', count: projects.length },
      ]} />
      {shown.length === 0 ? (
        <EmptyState icon="file" title="When you start a project with an expert, you can track it here." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />
      ) : (
        <div className="ui-stack">
          {shown.map((p) => (
            <Card key={p.project_id || p.request_id} title={p.topic} action={<Badge tone="gold">{p.label}</Badge>}>
              <p className="ui-muted">Requested {fmtDate(p.created_at)} · <Link to={`/experts/${p.consultant_id}?brief=${p.request_id}`}>Open the expert</Link></p>
              <ProgressSteps compact steps={STEPS.map((s, i) => ({ label: s, status: i === 0 ? 'current' : 'upcoming' }))} />
              <p className="ui-faint">The Conncct team confirms the project with you and the expert. Nobody is emailed by the system.</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
