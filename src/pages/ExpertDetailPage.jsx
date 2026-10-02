import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Badge, Button, Card, EmptyState, FormField, Input, Modal, PageHeader, Skeleton, Tag, Textarea, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getExpert, requestExpertHelp, shortlistExpert, startExpertProject, AVAILABILITY, SENIORITY } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';

export default function ExpertDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const requestId = params.get('request');
  const { companyId } = useCompany();
  const toast = useToast();
  const q = useApi(() => getExpert(id, { companyId, requestId }).then((x) => x.expert), [id]);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ topic: '', note: '', times: '' });
  const [dates, setDates] = useState({ start_date: '', end_date: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  if (q.error) {
    if (q.error.status === 404 && !isMissingEndpoint(q.error)) return <EmptyState icon="users" title="We couldn't find this advisor." action={<Button as={Link} to="/experts" variant="primary">Back to experts</Button>} />;
    return <div><SubNav section="experts" />{isMissingEndpoint(q.error) ? <EmptyState icon="users" title="The advisor directory isn't connected in this environment yet." /> : <LoadError error={q.error} onRetry={q.reload} what="this advisor" />}</div>;
  }
  const e = q.data;
  if (!e) return <Skeleton h="280px" />;
  const av = AVAILABILITY[e.availability];

  async function run(fn, ok) {
    setBusy(true);
    try { const out = await fn(); setDone(ok); toast.success(ok); setDialog(null); return out; } catch (err) {
      toast.error(isMissingEndpoint(err) ? "This isn't connected in this environment yet." : err.message);
      return null;
    } finally { setBusy(false); }
  }

  return (
    <div>
      <SubNav section="experts" />
      <Link to="/experts" className="back">← Back to experts</Link>
      <PageHeader title={e.display_name || e.full_name} subtitle={[SENIORITY[e.seniority], e.location].filter(Boolean).join(' · ')}
        meta={av && <Badge tone={av.tone} dot>{av.label}</Badge>}
        actions={(
          <div className="ui-row">
            <Button variant="accent" onClick={() => setDialog('request')}>Request help</Button>
            {requestId && <Button variant="secondary" disabled={busy} onClick={() => run(() => shortlistExpert(companyId, requestId, e.id), 'Shortlisted.')}>Shortlist</Button>}
            {requestId && <Button variant="secondary" onClick={() => setDialog('project')}>Start project</Button>}
          </div>
        )} />
      <div className="ui-grid ui-grid-2">
        <Card title="About">
          <div className="ui-who"><Avatar name={e.full_name || 'Advisor'} size={48} /><div className="ui-who-text"><span className="ui-who-name">{e.full_name}</span><span className="ui-who-sub">{SENIORITY[e.seniority] || ''}</span></div></div>
          {e.bio ? <p>{e.bio}</p> : <p className="ui-faint">No bio on record.</p>}
        </Card>
        <Card title="Expertise">
          <div className="ui-tags">{(e.expertise || []).map((x) => <Tag key={x.key}>{x.label}</Tag>)}</div>
          <p className="ui-muted">{(e.skills || []).join(', ')}</p>
        </Card>
      </div>
      {done && <Alert tone="ok">{done}</Alert>}
      <p className="ui-faint">Advisors help you with your raise. They never fundraise for you. No payment is taken in this app.</p>

      <Modal open={dialog === 'request'} onClose={() => setDialog(null)} title={`Ask ${e.display_name || 'this advisor'} for help`} description="An internal request to the Conncct team, not to an investor."
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!form.topic.trim()}
          onClick={() => run(() => requestExpertHelp({ company_id: companyId, consultant_id: e.id, kind: 'expert_help', topic: form.topic, note: [form.note, form.times && `Preferred times: ${form.times}`].filter(Boolean).join('\n') }), 'Requested. An advisor will confirm a time with you. No payment is taken in this app.')}>Request from Conncct</Button></>}>
        <div className="ui-form">
          <FormField label="Topic" required wide><Input value={form.topic} onChange={(x) => setForm({ ...form, topic: x.target.value })} placeholder="e.g. Runway: Conncct factor 1/5" /></FormField>
          <FormField label="Short note (private)" optional wide><Textarea rows={3} value={form.note} onChange={(x) => setForm({ ...form, note: x.target.value })} /></FormField>
          <FormField label="Preferred times" optional wide><Input value={form.times} onChange={(x) => setForm({ ...form, times: x.target.value })} /></FormField>
        </div>
      </Modal>
      <Modal open={dialog === 'project'} onClose={() => setDialog(null)} title="Start a project" description="Creates a proposed project with this advisor. The Conncct team confirms it with you."
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => run(() => startExpertProject(companyId, requestId, e.id, dates), 'Project proposed. See it in Projects.')}>Start project</Button></>}>
        <div className="ui-form ui-form-2">
          <FormField label="Start" optional><Input type="date" value={dates.start_date} onChange={(x) => setDates({ ...dates, start_date: x.target.value })} /></FormField>
          <FormField label="End" optional><Input type="date" value={dates.end_date} onChange={(x) => setDates({ ...dates, end_date: x.target.value })} /></FormField>
        </div>
      </Modal>
    </div>
  );
}
