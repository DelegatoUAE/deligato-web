import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, FormField, Modal, PageHeader, SkeletonCards, Textarea, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import ExpertCard from '../components/ExpertCard';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { matchExperts, listDirectory, requestExpertHelp, shortlistExpert, NEED_EXAMPLES, SKILL_NEED } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';

function CapitalAssessment({ companyId }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await requestExpertHelp({ company_id: companyId, kind: 'capital_assessment', topic: 'Capital Assessment', note });
      toast.success('Requested. An advisor will confirm a time with you. No payment is taken in this app.');
      setOpen(false);
    } catch (e) {
      toast.error(isMissingEndpoint(e) ? "Requests aren't connected in this environment yet." : `Couldn't send the request: ${e.message}`);
    } finally { setBusy(false); }
  }
  return (
    <Card className="assess" eyebrow="Start here" title="Capital Assessment · $99, credited against any package"
      action={<Button variant="secondary" onClick={() => setOpen(true)} disabled={!companyId}>Request a Capital Assessment</Button>}>
      <p>A 40-minute session with an advisor who reviews your readiness and maps your gaps.</p>
      <Modal open={open} onClose={() => setOpen(false)} title="Request a Capital Assessment" description="An internal request to the Conncct team, not to an investor. No payment is taken in this app."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={send}>Request from Conncct</Button></>}>
        <FormField label="Anything we should know?" optional><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
      </Modal>
    </Card>
  );
}

export default function ExpertsPage() {
  const { companyId, company } = useCompany();
  const [params] = useSearchParams();
  const toast = useToast();
  const skill = params.get('skill');
  const factor = params.get('factor') || null;
  const [need, setNeed] = useState(() => (skill && SKILL_NEED[skill]) || '');
  const [match, setMatch] = useState({ loading: false, data: null, error: null });
  const [shortlisted, setShortlisted] = useState({});
  const [busy, setBusy] = useState(null);
  const dirQ = useApi(() => listDirectory().then((x) => x.experts || []), []);

  async function find(e) {
    e?.preventDefault();
    if (!need.trim() && !factor) return;
    setMatch({ loading: true, data: null, error: null });
    try {
      const out = await matchExperts(companyId, { needText: need, factorKey: factor || undefined });
      setMatch({ loading: false, data: out, error: null });
    } catch (err) {
      setMatch({ loading: false, data: null, error: isMissingEndpoint(err) ? "Expert matching isn't connected in this environment yet. You can still browse advisors below." : err.message });
    }
  }
  async function onShortlist(expert) {
    const rid = match.data?.request_id;
    if (!rid) return;
    setBusy(expert.id);
    try {
      await shortlistExpert(companyId, rid, expert.id);
      setShortlisted((s) => ({ ...s, [expert.id]: true }));
      toast.success(`${expert.display_name || 'Advisor'} shortlisted. See them in My experts.`);
    } catch (err) { toast.error(`Couldn't shortlist: ${err.message}`); } finally { setBusy(null); }
  }

  const req = match.data?.requirement;
  return (
    <div className="experts">
      <SubNav section="experts" />
      <PageHeader title="Find an expert" subtitle="Advisors who help you close specific gaps before and during a raise. They help with your raise; they never run it for you." />
      <CapitalAssessment companyId={companyId} />
      <Card title="What do you need help with?">
        <form onSubmit={find} className="ui-stack">
          <Textarea rows={3} value={need} onChange={(e) => setNeed(e.target.value)} aria-label="What do you need help with?" placeholder="Describe the problem in a sentence or two." />
          <div className="ui-tags">
            {NEED_EXAMPLES.map((x) => <button key={x} type="button" className="ui-tag" onClick={() => setNeed(x)}>{x}</button>)}
          </div>
          {skill && <p className="ui-muted">From your readiness advice: <Badge tone="brand">{skill}</Badge></p>}
          <div className="ui-row">
            <Button type="submit" variant="accent" loading={match.loading} disabled={!companyId || (!need.trim() && !factor)}>Find matched experts</Button>
            <span className="ui-faint">We read your need with your company profile ({company?.stage || 'stage unknown'}, {company?.sector || 'sector unknown'}).</span>
          </div>
        </form>
      </Card>

      {match.loading && <SkeletonCards count={3} height={140} />}
      {match.error && <Alert tone="warn">{match.error}</Alert>}
      {match.data && (
        <section aria-labelledby="xm-h">
          <h2 id="xm-h" className="sec-h">Matched experts</h2>
          {req?.summary && <p className="ui-muted">We read this as: <strong>{req.summary}</strong>{req.labels?.length ? ` (${req.labels.join(', ')})` : ''}.</p>}
          {match.data.score_note && <p className="ui-faint">{match.data.score_note}</p>}
          {match.data.notice && <Alert tone="info">{match.data.notice}</Alert>}
          {match.data.results?.length ? (
            <div className="ui-grid ui-grid-3">
              {match.data.results.map((r) => (
                <ExpertCard key={r.expert.id} result={r} requestId={match.data.request_id} onShortlist={match.data.request_id ? onShortlist : null} shortlisted={shortlisted[r.expert.id]} busy={busy === r.expert.id} />
              ))}
            </div>
          ) : <EmptyState compact icon="users" title="No advisor lists this skill yet." body="Request a Capital Assessment and we'll route you." />}
        </section>
      )}

      <section aria-labelledby="dir-h">
        <h2 id="dir-h" className="sec-h">All advisors</h2>
        {dirQ.error ? (
          <Alert tone="warn">{isMissingEndpoint(dirQ.error) ? "The advisor directory isn't connected in this environment yet." : `Couldn't load advisors: ${dirQ.error.message}`}</Alert>
        ) : !dirQ.data ? <SkeletonCards count={3} height={120} /> : dirQ.data.length ? (
          <div className="ui-grid ui-grid-3">{dirQ.data.map((e) => <ExpertCard key={e.id} expert={e} />)}</div>
        ) : <EmptyState compact icon="users" title="No advisors listed yet." body="Request a Capital Assessment and we'll route you." />}
      </section>
      <p className="ui-faint">Looking for projects you've started? <Link to="/experts/projects">Open Projects</Link>.</p>
    </div>
  );
}
