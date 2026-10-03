import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, PageHeader, Select, Table, Tabs, useToast } from '../../design/ui';
import useApi from '../../lib/useApi';
import { ALLOCATION_STATUS, PROJECT_STATUS, listAllocations, listProjects, updateAllocation, updateProject } from '../../lib/admin';
import { fmtDate } from '../../lib/format';

const P_LABEL = { draft: 'Draft', active: 'Active', on_hold: 'On hold', completed: 'Completed', cancelled: 'Cancelled' };
const P_TONE = { draft: 'neutral', active: 'ok', on_hold: 'warn', completed: 'brand', cancelled: 'bad' };
const A_LABEL = { proposed: 'Proposed', confirmed: 'Confirmed', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };
const A_TONE = { proposed: 'gold', confirmed: 'info', active: 'ok', completed: 'brand', cancelled: 'outline' };
// The next staff step for an allocation.
const NEXT = { proposed: ['confirmed', 'Confirm'], confirmed: ['active', 'Start'], active: ['completed', 'Complete'] };
const fmtGBP = (n) => (n == null ? '–' : `£${Number(n).toLocaleString('en-GB')}`);

/** Admin · Projects and allocations: staff confirm, start and complete. Founders only see their own linked projects elsewhere. */
export default function AdminProjectsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('allocations');
  const [pStatus, setPStatus] = useState('');
  const [aStatus, setAStatus] = useState('proposed');
  const pq = useApi(() => listProjects(pStatus), [pStatus]);
  const aq = useApi(() => listAllocations({ status: aStatus }), [aStatus]);
  const [busy, setBusy] = useState(null);

  async function run(key, fn, ok) {
    setBusy(key);
    try { await fn(); toast.success(ok); pq.reload(); aq.reload(); } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }

  const allocCols = [
    { key: 'consultant', header: 'Expert', render: (a) => (a.consultant ? <><strong>{a.consultant.full_name}</strong>{a.consultant.seniority && <div className="ui-faint">{a.consultant.seniority}</div>}</> : 'Unknown expert') },
    { key: 'project', header: 'Project', render: (a) => <><strong>{a.project?.name || 'Unknown project'}</strong>{a.project?.client_name && <span className="ui-muted"> · {a.project.client_name}</span>}</> },
    { key: 'match_score', header: 'Match', numeric: true, render: (a) => (a.match_score != null ? a.match_score : '–') },
    { key: 'status', header: 'Status', render: (a) => <Badge tone={A_TONE[a.status] || 'neutral'} dot size="sm">{A_LABEL[a.status] || a.status}</Badge> },
    { key: 'allocated_at', header: 'Proposed', render: (a) => fmtDate(a.allocated_at) || '–' },
    { key: 'x', header: '', render: (a) => (
      <div className="ui-row admin-row-actions">
        {NEXT[a.status] && <Button size="sm" variant="primary" loading={busy === `a${a.id}`} onClick={() => run(`a${a.id}`, () => updateAllocation(a.id, { status: NEXT[a.status][0] }), `${A_LABEL[NEXT[a.status][0]]}.`)}>{NEXT[a.status][1]}</Button>}
        {!['completed', 'cancelled'].includes(a.status) && <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => run(`c${a.id}`, () => updateAllocation(a.id, { status: 'cancelled' }), 'Allocation cancelled.')}>Cancel</Button>}
      </div>
    ) },
  ];
  const projCols = [
    { key: 'name', header: 'Project', render: (p) => <><strong>{p.name}</strong>{p.client_name && <span className="ui-muted"> · {p.client_name}</span>}</> },
    { key: 'budget_gbp', header: 'Budget', numeric: true, render: (p) => fmtGBP(p.budget_gbp) },
    { key: 'dates', header: 'Dates', render: (p) => [fmtDate(p.start_date), fmtDate(p.end_date)].filter(Boolean).join(' to ') || '–' },
    { key: 'status', header: 'Status', render: (p) => (
      <Select aria-label={`Status of ${p.name}`} value={p.status} disabled={busy === `p${p.id}`}
        onChange={(e) => run(`p${p.id}`, () => updateProject(p.id, { status: e.target.value }), `${p.name}: ${P_LABEL[e.target.value]}.`)}
        options={PROJECT_STATUS.map((s) => ({ value: s, label: P_LABEL[s] }))} />
    ) },
    { key: 'm', header: '', render: (p) => <Button as={Link} to={`/admin/match?project_id=${p.id}`} size="sm" variant="secondary">Match experts</Button> },
  ];

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Projects and allocations" subtitle="Confirm who works on what, and move projects to completed. Completing a project records the outcome for learning." />
      <Tabs variant="pill" label="View" value={tab} onChange={setTab} items={[{ id: 'allocations', label: 'Allocations' }, { id: 'projects', label: 'Projects' }]} />
      {tab === 'allocations' ? (
        <>
          <div className="admin-filters"><Select aria-label="Allocation status" value={aStatus} onChange={(e) => setAStatus(e.target.value)} placeholder="All statuses" options={ALLOCATION_STATUS.map((s) => ({ value: s, label: A_LABEL[s] }))} /></div>
          {aq.error && <Alert tone="bad">{aq.error.message}</Alert>}
          <Table className="admin-table" columns={allocCols} rows={aq.data || []} loading={!aq.data && !aq.error} rowKey="id"
            empty={<EmptyState compact icon="check" title={aStatus === 'proposed' ? 'Nothing waiting for confirmation.' : 'No allocations in this view.'} body="Propose one from AI Match." />} />
        </>
      ) : (
        <>
          <div className="admin-filters"><Select aria-label="Project status" value={pStatus} onChange={(e) => setPStatus(e.target.value)} placeholder="All statuses" options={PROJECT_STATUS.map((s) => ({ value: s, label: P_LABEL[s] }))} /></div>
          {pq.error && <Alert tone="bad">{pq.error.message}</Alert>}
          <Table className="admin-table" columns={projCols} rows={pq.data || []} loading={!pq.data && !pq.error} rowKey="id"
            empty={<EmptyState compact icon="file" title="No projects in this view." />} />
          <p className="ui-faint">Status badges: {PROJECT_STATUS.map((s) => <Badge key={s} tone={P_TONE[s]} size="sm">{P_LABEL[s]}</Badge>)}</p>
        </>
      )}
    </div>
  );
}
