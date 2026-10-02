import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, EmptyState, PageHeader, Table, Tabs } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { apiFetch } from '../lib/auth';

const STATUSES = ['all', 'draft', 'active', 'on_hold', 'completed', 'cancelled'];
const STATUS = {
  draft: { label: 'Draft', tone: 'neutral' }, active: { label: 'Active', tone: 'ok' }, on_hold: { label: 'On hold', tone: 'warn' },
  completed: { label: 'Completed', tone: 'brand' }, cancelled: { label: 'Cancelled', tone: 'bad' },
};
const fmtGBP = (n) => (n == null ? '–' : `£${Number(n).toLocaleString('en-GB')}`);

/** Expert projects (the existing projects and allocations, D13). Budgets and AI Match are staff-only. */
export default function ProjectsPage() {
  const { staff } = useCompany();
  const [filter, setFilter] = useState('all');
  const q = useApi(() => apiFetch(filter === 'all' ? '/projects' : `/projects?status=${filter}`).then((d) => d.projects || []), [filter]);

  const columns = [
    { key: 'name', header: 'Project', render: (p) => <><strong>{p.name}</strong>{p.required_seniority && <span className="ui-muted"> · {p.required_seniority}</span>}</> },
    { key: 'client_name', header: 'Client' },
    { key: 'status', header: 'Status', render: (p) => <Badge tone={STATUS[p.status]?.tone || 'neutral'} dot>{STATUS[p.status]?.label || p.status}</Badge> },
    ...(staff ? [{ key: 'budget_gbp', header: 'Budget', numeric: true, render: (p) => fmtGBP(p.budget_gbp) }] : []),
    { key: 'skills', header: 'Skills needed', render: (p) => <div className="ui-tags">{(p.required_skills || []).slice(0, 4).map((s) => <span key={s} className="ui-tag">{s}</span>)}</div> },
    ...(staff ? [{ key: 'm', header: '', render: (p) => <Button as={Link} to={`/workspace/match?project_id=${p.id}`} variant="secondary" size="sm">Match advisors</Button> }] : []),
  ];

  return (
    <div>
      <SubNav section="experts" />
      <PageHeader title="Projects" subtitle="Work with advisors: each project, who is on it, and where it stands." />
      <Tabs variant="pill" label="Status" value={filter} onChange={setFilter} items={STATUSES.map((s) => ({ id: s, label: s === 'all' ? 'All' : STATUS[s].label }))} />
      {q.error ? <LoadError error={q.error} onRetry={q.reload} what="projects" /> : (
        <Table columns={columns} rows={q.data || []} loading={!q.data} rowKey="id"
          empty={<EmptyState compact icon="file" title="No projects in this view yet." body="Start one from an advisor you've matched." action={<Button as={Link} to="/experts" variant="secondary" size="sm">Find an expert</Button>} />} />
      )}
    </div>
  );
}
