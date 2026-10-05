import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Badge, Button, ConfirmDialog, EmptyState, FormField, Input, PageHeader, Select, Skeleton, Textarea, useToast,
} from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { FundraisingNotice, GateCard, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listDrafts, createDraft, updateDraft, markDraftSent, DRAFT_KINDS, DRAFT_STATUS, draftKindLabel, kindForRoute } from '../lib/fundraising';
import { listPipeline, updatePipelineItem, stageIndex, investorHref } from '../lib/capital';
import { fmtDate, humanise } from '../lib/format';
import { logEvent } from '../lib/events';

const EXAMPLE = {
  subject: 'Example: Seed round, $1.5M, B2B fintech in the GCC',
  body: 'Hi {first name},\n\nI run {company}, which automates reconciliation for SMEs in the Gulf. We have 64 paying customers and two bank channel partners.\n\nYour fund backs Seed B2B fintech in the GCC, so I thought it was worth a short note. We are raising $1.5M to grow sales and finish our compliance work.\n\nWould a 20-minute call in the next two weeks be useful?\n\n{Your name}',
};

function draftsThisMonth(drafts) {
  const now = new Date();
  return drafts.filter((d) => { const t = new Date(d.created_at); return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear(); }).length;
}

function Composer({ draft, meta, investor, companyId, onUpdated, onPipelineMoved }) {
  const toast = useToast();
  const [subject, setSubject] = useState(draft.subject || '');
  const [body, setBody] = useState(draft.body || '');
  const [mutual, setMutual] = useState('');
  const [busy, setBusy] = useState(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const locked = ['sent_by_founder', 'discarded'].includes(draft.status);
  const dirty = subject !== (draft.subject || '') || body !== (draft.body || '');
  const kind = draft.kind;
  const finalBody = mutual ? body.replace(/\{(mutual[^}]*|connection[^}]*|their name)\}/gi, mutual) : body;
  const investorName = investor?.name || 'this investor';

  async function save() {
    setBusy('save');
    try {
      const { draft: d } = await updateDraft(companyId, draft.id, { subject, body });
      onUpdated(d);
      toast.success('Draft saved.');
    } catch (e) { toast.error(`Couldn't save: ${e.message}`); } finally { setBusy(null); }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${finalBody}`);
      toast.success('Copied. Paste it into your email or message.');
      logEvent('outreach.draft_copied', { draft_id: draft.id, record_id: draft.record_id }, companyId);
    } catch { toast.error("Couldn't copy. Select the text and copy it yourself."); }
  }
  function openEmail() {
    logEvent('outreach.opened_in_email', { draft_id: draft.id, record_id: draft.record_id }, companyId);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
  }
  async function markSent() {
    setBusy('sent');
    try {
      if (dirty) await updateDraft(companyId, draft.id, { subject, body });
      const out = await markDraftSent(companyId, draft.id, draft.status);
      onUpdated(out.draft);
      const s = out.pipeline_suggestion;
      const target = kind === 'intro_request' ? 'intro_requested' : 'contacted';
      if (s?.pipeline_id && stageIndex(s.from) < stageIndex(target)) {
        await updatePipelineItem(s.pipeline_id, { stage: target }).then(() => onPipelineMoved?.()).catch(() => null);
      }
      toast.success(`Marked as sent. ${investorName} is now ${kind === 'intro_request' ? "'Intro requested'" : "'Contacted'"} in your pipeline.`);
    } catch (e) { toast.error(`Couldn't mark it as sent: ${e.message}`); } finally { setBusy(null); setConfirmSent(false); }
  }

  return (
    <section className="composer" aria-label="Draft">
      <div className="composer-head">
        <div>
          <h2>To: {investorName}</h2>
          <p className="ui-muted">{draftKindLabel(kind)}{investor?.contact_route ? ` · route: ${investor.contact_route}` : ''} · {DRAFT_STATUS[draft.status] || humanise(draft.status)}</p>
        </div>
        <Badge tone={draft.generated_by === 'ai' ? 'gold' : 'outline'}>{draft.generated_by === 'ai' ? 'AI-drafted' : 'Template'}</Badge>
      </div>
      {meta?.provider === 'template' && <Alert tone="info">Drafted from a template. AI drafting isn't available right now.</Alert>}
      {meta?.warning && <Alert tone="warn">{meta.warning}</Alert>}
      {kind === 'intro_request' && (
        <FormField label="Who do you know who knows them?" hint="Kept on this screen only; it's never sent to us or the AI.">
          <Input value={mutual} onChange={(e) => setMutual(e.target.value)} placeholder="Their name" />
        </FormField>
      )}
      <FormField label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={locked} /></FormField>
      <FormField label="Message"><Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} disabled={locked} /></FormField>
      {meta?.grounded_on?.length > 0 && <p className="ui-muted">Grounded on: {meta.grounded_on.map(humanise).join(', ')}.</p>}
      <div className="composer-actions">
        {!locked && <Button variant="secondary" onClick={save} disabled={!dirty} loading={busy === 'save'}>Save draft</Button>}
        <Button variant="secondary" onClick={copy} iconLeft="file">Copy</Button>
        <Button variant="secondary" onClick={openEmail}>Open in my email app</Button>
        {draft.status !== 'sent_by_founder' && !locked && <Button variant="primary" onClick={() => setConfirmSent(true)}>Mark as sent by me</Button>}
        {draft.status === 'sent_by_founder' && <Badge tone="ok">Marked sent {fmtDate(draft.sent_by_founder_at)}</Badge>}
      </div>
      <FundraisingNotice short />
      <ConfirmDialog open={confirmSent} tone="primary" title="Did you send this yourself?"
        body={`We'll move ${investorName} to '${kind === 'intro_request' ? 'Intro requested' : 'Contacted'}' in your pipeline.`}
        confirmLabel="Yes, I sent it" cancelLabel="Not yet" busy={busy === 'sent'} onConfirm={markSent} onCancel={() => setConfirmSent(false)} />
    </section>
  );
}

export default function OutreachPage() {
  const { companyId, entitlements, run } = useCompany();
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const recordParam = params.get('record');
  const quota = Number(entitlements?.outreach_drafts_per_month || 0);

  const draftsQ = useApi(() => listDrafts(companyId).then((x) => x.drafts || []), [companyId]);
  const pipeQ = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []).catch(() => []), [companyId]);
  const [metaById, setMetaById] = useState({});
  const [creating, setCreating] = useState(false);
  const [newKind, setNewKind] = useState(params.get('kind') || '');
  const [createError, setCreateError] = useState(null);
  const [blank, setBlank] = useState(false);

  // Investor names and routes from what the founder already has (no extra profile views).
  const known = new Map();
  for (const r of run?.results || []) known.set(r.record_id, { name: r.name, contact_route: r.contact_route });
  for (const p of pipeQ.data || []) known.set(p.record_id, { name: p.capital_sources?.name, contact_route: p.capital_sources?.contact_route, ...known.get(p.record_id) });
  const drafts = (draftsQ.data || []).filter((d) => d.status !== 'discarded');
  const used = draftsThisMonth(draftsQ.data || []);
  const left = Math.max(0, quota - used);
  const active = drafts.find((d) => d.id === draftId) || (!recordParam && !draftId ? drafts[0] : null);
  const target = recordParam ? known.get(recordParam) || { name: null, contact_route: null } : null;
  const route = target?.contact_route;
  const defaultKind = kindForRoute(route);

  async function generate() {
    setCreating(true);
    setCreateError(null);
    try {
      const out = await createDraft(companyId, { record_id: recordParam, kind: newKind || defaultKind || undefined });
      setMetaById((m) => ({ ...m, [out.draft.id]: out }));
      draftsQ.setData((l) => [out.draft, ...(l || [])]);
      navigate(`/capital/outreach/${out.draft.id}`, { replace: true });
    } catch (e) {
      if (e.code === 'invitation_only') setCreateError('This investor only reviews invited companies. Track them in your pipeline.');
      else if (e.upgradeRequired) setCreateError("You've used this month's drafts. You can still write your own message.");
      else setCreateError("Couldn't draft this. Try again or start from a blank template.");
    } finally { setCreating(false); }
  }

  const head = (
    <>
      <SubNav section="capital" />
      <PageHeader title="Outreach" subtitle="Drafts you send yourself. We never contact investors for you."
        meta={quota > 0 && <Badge tone="neutral">{left} of {quota} drafts left this month</Badge>} />
    </>
  );

  if (quota === 0) {
    return (
      <div>{head}
        <GateCard title="Outreach drafts are included in Capital Raising." body="Draft a first message to an investor you chose, through the route they accept. You edit it and send it yourself." />
        <section className="composer composer-example" aria-label="Example draft">
          <Badge tone="outline">Example</Badge>
          <h2>To: an example fund</h2>
          <p className="ui-strong">{EXAMPLE.subject}</p>
          <pre className="example-body">{EXAMPLE.body}</pre>
        </section>
        <FundraisingNotice />
      </div>
    );
  }
  if (draftsQ.error) return <div>{head}<LoadError error={draftsQ.error} onRetry={draftsQ.reload} what="your drafts" /></div>;

  return (
    <div className="outreach">
      {head}
      <div className="outreach-grid">
        <aside className="drafts" aria-label="Drafts">
          {draftsQ.data === undefined ? <Skeleton variant="text" lines={5} /> : drafts.length ? (
            <ul>
              {drafts.map((d) => (
                <li key={d.id}>
                  <Link to={`/capital/outreach/${d.id}`} className={`draft-link${active?.id === d.id ? ' is-active' : ''}`}>
                    <strong>{known.get(d.record_id)?.name || 'Investor'}</strong>
                    <span>{draftKindLabel(d.kind)} · {DRAFT_STATUS[d.status] || d.status} · {fmtDate(d.updated_at || d.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : recordParam ? <p className="ui-muted">No drafts yet.</p> : null /* the main column's empty state already says it */}
          <Button as={Link} to="/capital/pipeline" variant="ghost" size="sm" iconLeft="plus">New draft from pipeline</Button>
        </aside>

        <div>
          {recordParam && !draftId && (
            <section className="composer">
              <h2>New draft to {target?.name || 'this investor'}</h2>
              {route === 'Invitation only' ? (
                <Alert tone="info">This investor only reviews invited companies. Track them in your pipeline.</Alert>
              ) : blank ? (
                <Alert tone="info">Write your message in your own email app. Nothing is sent from here.</Alert>
              ) : (
                <>
                  {!route || route === 'Unknown' ? <Alert tone="warn">We don't know how this investor prefers to be contacted. Check their site first.</Alert> : null}
                  <FormField label="Kind of message">
                    <Select value={newKind || defaultKind || 'cold_email'} onChange={(e) => setNewKind(e.target.value)} options={DRAFT_KINDS.map((k) => ({ value: k.key, label: k.label }))} />
                  </FormField>
                  {creating && <p className="ui-muted">Drafting from your profile and their mandate…</p>}
                  {createError && <Alert tone="bad">{createError}</Alert>}
                  <div className="ui-row">
                    <Button variant="accent" onClick={generate} loading={creating} disabled={left === 0}>Draft it</Button>
                    <Button variant="ghost" onClick={() => setBlank(true)}>Start from blank</Button>
                    <Link to={investorHref(recordParam)}>View investor</Link>
                  </div>
                  {left === 0 && <p className="ui-muted">You've used this month's drafts. You can still write your own message.</p>}
                </>
              )}
            </section>
          )}
          {active && (draftId || !recordParam) && (
            <Composer key={active.id} draft={active} meta={metaById[active.id]} investor={known.get(active.record_id)} companyId={companyId}
              onUpdated={(d) => draftsQ.setData((l) => (l || []).map((x) => (x.id === d.id ? { ...x, ...d } : x)))} onPipelineMoved={pipeQ.reload} />
          )}
          {!active && !recordParam && draftsQ.data !== undefined && (
            <EmptyState icon="send" title="No drafts yet." body="Pick an investor from your pipeline or matches to draft a first message."
              action={<Button as={Link} to="/capital/pipeline" variant="primary">Open pipeline</Button>} />
          )}
          {draftId && !active && draftsQ.data !== undefined && <Alert tone="warn">That draft wasn't found. <Button variant="link" size="sm" onClick={() => toast.info('Choose a draft from the list.')}>Pick another</Button></Alert>}
        </div>
      </div>
    </div>
  );
}
