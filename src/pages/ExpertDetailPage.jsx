import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Badge, Button, Card, EmptyState, FormField, Input, Modal, Skeleton, Textarea, Tooltip, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import ExpertFitRow from '../components/ExpertFitRow';
import { ExpertScore } from '../components/ExpertCard';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getExpert, readBrief, requestExpertHelp, shortlistExpert, startExpertProject, listExpertRequests, AVAILABILITY, SENIORITY } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';
import { firstName } from '../lib/format';

/** 22 · Expert profile. Fit is shown only with a brief in context (a score belongs to one need). */
export default function ExpertDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const briefId = params.get('brief') || params.get('request');
  const { company, companyId } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const q = useApi(() => getExpert(id, { companyId, requestId: briefId }).then((x) => x.expert), [id, briefId]);
  const reqQ = useApi(() => (companyId ? listExpertRequests(companyId).then((x) => x.requests || []).catch(() => []) : []), [companyId]);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(null);
  const [proj, setProj] = useState({ title: '', scope: '', start_date: '', end_date: '' });
  const [busy, setBusy] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);

  if (q.error) {
    if (q.error.status === 404 && !isMissingEndpoint(q.error)) return <EmptyState icon="users" title="We couldn't find this expert." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />;
    return <div><SubNav section="experts" />{isMissingEndpoint(q.error) ? <EmptyState icon="users" title="The expert directory isn't connected in this environment yet." /> : <LoadError error={q.error} onRetry={q.reload} what="this expert" />}</div>;
  }
  const e = q.data;
  if (!e) return <Skeleton h="320px" />;

  const brief = briefId ? readBrief(briefId) : null;
  const fit = brief?.results?.find((r) => r.expert.id === e.id) || null;
  const req = brief?.requirement;
  const av = AVAILABILITY[e.availability];
  const onLeave = e.availability === 'leave';
  const fname = firstName(e.full_name) || 'the expert';
  const myRequests = (reqQ.data || []).filter((r) => r.consultant_id === e.id);
  const conversation = myRequests.find((r) => r.status !== 'cancelled');
  const projectReq = conversation || (briefId && !String(briefId).startsWith('local-') ? { id: briefId } : null);

  async function run(fn, ok) {
    setBusy(true);
    try { const out = await fn(); if (ok) toast.success(ok); setDialog(null); return out; } catch (err) {
      toast.error(isMissingEndpoint(err) ? "This isn't connected in this environment yet." : err.message);
      return null;
    } finally { setBusy(false); }
  }
  const openRequest = () => {
    setForm({ topic: req ? (req.labels || []).join(' + ') : brief?.gapLabel ? `${brief.gapLabel} gap` : '', note: '', times: '' });
    setDialog('request');
  };

  return (
    <div className="xprofile">
      <SubNav section="experts" />
      <Link to={briefId ? `/experts/results/${briefId}` : '/experts'} className="back">← {briefId ? 'Matched experts' : 'Find an expert'}</Link>
      <Card className="xhead">
        <div className="xhead-main">
          <Avatar name={e.full_name || 'Expert'} size={56} />
          <div>
            <h1>{e.full_name}{e.seniority ? ` · ${SENIORITY[e.seniority]}` : ''}</h1>
            <p className="ui-muted">{[e.location, av?.label].filter(Boolean).join(' · ')} {onLeave && <Badge tone="neutral">On leave at the moment</Badge>}</p>
            <div className="ui-tags">{(e.skills || []).map((s) => <span key={s} className="ui-tag">{s}</span>)}<span className="xprov">Expert stated</span></div>
          </div>
          {fit && <ExpertScore score={fit.expert_match_score} confidence={fit.data_confidence} />}
        </div>
        <div className="ui-row xhead-actions">
          {shortlisted ? <Badge tone="ok">Shortlisted</Badge> : (
            <Button variant="secondary" disabled={busy || !projectReq} title={!projectReq ? 'Search for a need first, then shortlist.' : undefined}
              onClick={async () => { if (await run(() => shortlistExpert(companyId, projectReq.id, e.id), 'Shortlisted. See them in My experts.')) setShortlisted(true); }}>+ Shortlist</Button>
          )}
          {conversation
            ? <Badge tone="gold">Requested · waiting for confirmation</Badge>
            : <Tooltip text={onLeave ? 'On leave at the moment' : 'A short call to see if it fits'}><Button variant="primary" disabled={onLeave || !companyId} onClick={openRequest}>Request a conversation</Button></Tooltip>}
          {conversation
            ? <Button variant="secondary" onClick={() => { setProj({ title: `${(req?.labels || ['Expert help'])[0]} for ${company?.name || 'your company'}`, scope: brief?.needText || conversation.message || '', start_date: '', end_date: '' }); setDialog('project'); }}>Start a project</Button>
            : <Tooltip text="Request a conversation first, so you can agree the scope."><Button variant="ghost" disabled>Start a project</Button></Tooltip>}
        </div>
      </Card>

      <div className="ui-grid ui-grid-2">
        <Card title={req ? `How ${fname} fits your need: ${[(req.labels || []).join(' + '), SENIORITY[req.seniority]].filter(Boolean).join(' · ')}` : 'How they fit'}>
          {fit ? (
            <>
              {brief?.gapLabel && <p className="ui-muted">You came here from: {brief.gapLabel} gap.</p>}
              <ExpertFitRow fits={fit.fits} expanded />
              {fit.seniority_fit && <p className="ui-muted">Seniority: {SENIORITY[e.seniority] || 'not on record'}; you asked for {SENIORITY[req?.seniority] || 'any'}.</p>}
            </>
          ) : <p className="ui-muted">Search for a need to see how {fname} fits. <Link to="/experts">Find an expert</Link></p>}
        </Card>
        <Card title="About">
          {e.bio ? <p>{e.bio}</p> : <p className="ui-faint">Not on record.</p>}
          {(e.expertise || []).length > 0 && <div className="ui-tags">{e.expertise.map((x) => <span key={x.key} className="ui-tag">{x.label}</span>)}</div>}
        </Card>
        <Card title="What we don't know">
          <ul className="plain-list unknown-list">
            {!e.bio && <li>Background: not on record</li>}
            <li>Languages: not on record</li>
            <li>Price: agreed directly with the expert</li>
          </ul>
        </Card>
        <Card title="Working together">
          <ol className="plain-list">
            <li>Request a conversation: a short call to see if it's a fit. No commitment.</li>
            <li>Agree the scope with the expert.</li>
            <li>Start a project here so you can track it and record the outcome.</li>
          </ol>
          <p className="ui-faint">Requests go to our team inside the platform. Nobody is emailed by the system, and no payment is taken here.</p>
        </Card>
      </div>

      <Modal open={dialog === 'request'} onClose={() => setDialog(null)} title={`Request a conversation with ${fname}`} description="Our team will confirm a time with you both."
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!form?.topic?.trim()}
          onClick={async () => {
            const out = await run(() => requestExpertHelp({ company_id: companyId, consultant_id: e.id, kind: 'expert_help', topic: form.topic, note: [form.note, form.times && `Preferred times: ${form.times}`].filter(Boolean).join('\n') }), `Requested. We'll confirm a time with you and ${fname}.`);
            if (out) reqQ.reload();
          }}>Request a conversation</Button></>}>
        {form && (
          <div className="ui-form">
            <FormField label="Topic" required wide><Input value={form.topic} onChange={(x) => setForm({ ...form, topic: x.target.value })} /></FormField>
            <FormField label="Short note (private)" optional wide><Textarea rows={3} value={form.note} onChange={(x) => setForm({ ...form, note: x.target.value })} /></FormField>
            <FormField label="Preferred times" optional wide><Input value={form.times} onChange={(x) => setForm({ ...form, times: x.target.value })} /></FormField>
          </div>
        )}
      </Modal>
      <Modal open={dialog === 'project'} onClose={() => setDialog(null)} title="Start a project" description={`Records the project so you can track it with ${fname}. Our team confirms it with you both.`}
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button><Button variant="primary" loading={busy}
          onClick={async () => { const out = await run(() => startExpertProject(companyId, projectReq.id, e.id, { start_date: proj.start_date || undefined, end_date: proj.end_date || undefined }), 'Project requested.'); if (out) navigate('/experts/projects'); }}>Start project</Button></>}>
        <div className="ui-form">
          <FormField label="Title" wide><Input value={proj.title} onChange={(x) => setProj({ ...proj, title: x.target.value })} /></FormField>
          <FormField label="Scope" wide hint="3 to 5 lines on what you agreed."><Textarea rows={4} value={proj.scope} onChange={(x) => setProj({ ...proj, scope: x.target.value })} /></FormField>
          <FormField label="Start" optional><Input type="date" value={proj.start_date} onChange={(x) => setProj({ ...proj, start_date: x.target.value })} /></FormField>
          <FormField label="End" optional><Input type="date" value={proj.end_date} onChange={(x) => setProj({ ...proj, end_date: x.target.value })} /></FormField>
        </div>
        <Alert tone="info">Title and scope are kept on this screen for now; the project is created from your request.</Alert>
      </Modal>
    </div>
  );
}
