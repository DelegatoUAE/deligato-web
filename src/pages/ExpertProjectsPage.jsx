import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, PageHeader, ProgressSteps, SkeletonCards, Tabs, Textarea, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listProjects, updateProject } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate } from '../lib/format';
import ProjectsPage from './ProjectsPage';

const STEPS = ['Requested', 'Confirmed', 'In progress', 'Completed'];
const stepOf = (p) => (p.status === 'completed' ? 3 : ['active'].includes(p.status) ? 2 : p.allocation_status === 'confirmed' ? 1 : 0);
const LABEL = (p) => p.status_label || ({ draft: 'Requested · waiting for the expert to confirm', active: 'In progress', on_hold: 'Paused', completed: 'Completed', cancelled: 'Cancelled' }[p.status] || p.status);

/** 23 · Projects with experts (founder view). Staff keep the legacy projects table. */
export default function ExpertProjectsPage() {
  const { companyId, staff } = useCompany();
  const toast = useToast();
  const q = useApi(() => (companyId && !staff ? listProjects(companyId).then((x) => x.projects || []) : []), [companyId, staff]);
  const [tab, setTab] = useState('all');
  const [cancelling, setCancelling] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  if (staff) return <ProjectsPage />;
  const head = <><SubNav section="experts" /><PageHeader title="Projects" subtitle="Work you've started with an expert, and where it stands." /></>;
  if (q.error) return <div>{head}{isMissingEndpoint(q.error) ? <EmptyState icon="file" title="Projects aren't connected in this environment yet." /> : <LoadError error={q.error} onRetry={q.reload} what="your projects" />}</div>;
  if (!q.data) return <div>{head}<SkeletonCards count={2} height={120} /></div>;
  const projects = q.data;
  const groups = { active: projects.filter((p) => ['active', 'on_hold'].includes(p.status)), requested: projects.filter((p) => p.status === 'draft'), completed: projects.filter((p) => ['completed', 'cancelled'].includes(p.status)) };
  const shown = tab === 'all' ? projects : groups[tab];

  async function act(fn, ok) {
    setBusy(true);
    try { await fn(); toast.success(ok); q.reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); setCancelling(null); setOutcome(null); }
  }

  return (
    <div>
      {head}
      <Tabs variant="pill" label="Status" value={tab} onChange={setTab} items={[
        { id: 'active', label: 'Active', count: groups.active.length }, { id: 'requested', label: 'Requested', count: groups.requested.length },
        { id: 'completed', label: 'Completed', count: groups.completed.length }, { id: 'all', label: 'All', count: projects.length },
      ]} />
      {shown.length === 0 ? (
        <EmptyState icon="file" title="When you start a project with an expert, you can track it here." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />
      ) : (
        <div className="ui-stack">
          {shown.map((p) => (
            <Card key={p.id} title={p.title} action={<Badge tone={p.status === 'active' ? 'ok' : p.status === 'cancelled' ? 'outline' : 'gold'}>{LABEL(p)}</Badge>}>
              <p className="ui-muted">{p.expert ? <>with <Link to={`/experts/${p.expert.id}${p.request_id ? `?brief=${p.request_id}` : ''}`}>{p.expert.display_name}</Link></> : 'Expert not on record'}{p.start_date ? ` · starts ${fmtDate(p.start_date)}` : ''}</p>
              {p.status !== 'cancelled' && <ProgressSteps compact steps={STEPS.map((s, i) => ({ label: s, status: i < stepOf(p) ? 'done' : i === stepOf(p) ? 'current' : 'upcoming' }))} />}
              {p.status === 'active' && <p className="ui-faint">When the work is done, the expert or our team will mark it complete.</p>}
              <div className="ui-row">
                {['draft'].includes(p.status) && <Button variant="ghost" size="sm" onClick={() => setCancelling(p)}>Cancel request</Button>}
                {p.status === 'completed' && !p.outcome && <Button variant="secondary" size="sm" onClick={() => setOutcome({ p, rating: '', note: '' })}>How did it go?</Button>}
                {p.outcome && <span className="ui-muted">Outcome recorded.</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog open={Boolean(cancelling)} title="Cancel this request?" body="The expert and our team are told the project won't go ahead. Nothing is charged." confirmLabel="Cancel request" cancelLabel="Keep it" busy={busy}
        onConfirm={() => act(() => updateProject(companyId, cancelling.id, { status: 'cancelled' }), 'Request cancelled.')} onCancel={() => setCancelling(null)} />
      <Modal open={Boolean(outcome)} onClose={() => setOutcome(null)} title="How did it go?" description="This helps us match better. It isn't shared with the expert as a public review."
        footer={<><Button variant="ghost" onClick={() => setOutcome(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!outcome?.rating}
          onClick={() => act(() => updateProject(companyId, outcome.p.id, { outcome: { rating: outcome.rating, note: outcome.note || undefined }, rating: outcome.rating }), 'Outcome saved.')}>Save outcome</Button></>}>
        {outcome && (
          <div className="ui-stack">
            <div className="ui-row">{['helpful', 'partly_helpful', 'not_helpful'].map((r) => <label key={r} className="check"><input type="radio" name="rating" checked={outcome.rating === r} onChange={() => setOutcome({ ...outcome, rating: r })} /> {r === 'helpful' ? 'Helpful' : r === 'partly_helpful' ? 'Partly helpful' : 'Not helpful'}</label>)}</div>
            <Textarea rows={3} value={outcome.note} onChange={(e) => setOutcome({ ...outcome, note: e.target.value })} placeholder="Private note (optional)" aria-label="Private note" />
          </div>
        )}
      </Modal>
      <Alert tone="info">Projects are coordinated by our team inside the platform. Nobody is emailed by the system, and no payment is taken here.</Alert>
    </div>
  );
}
