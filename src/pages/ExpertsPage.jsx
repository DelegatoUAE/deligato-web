import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, FormField, Modal, PageHeader, Select, Skeleton, Textarea, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import ExpertCard from '../components/ExpertCard';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getTaxonomy, interpretNeed, matchExperts, listDirectory, requestExpertHelp, saveBrief, ENGAGEMENT, URGENCY, SENIORITY } from '../lib/experts';
import { getUnlocks } from '../lib/capital';
import { readinessGapFactors } from '../lib/readiness';
import { BRIDGE_LABEL, expertBridge } from '../lib/expertise';
import { isMissingEndpoint } from '../lib/auth';
import { fmtUsd } from '../lib/format';

const EXAMPLES = ['a fractional CFO for 2 days a week', 'help with our cap table before a SAFE', 'UAE corporate tax registration'];

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
    <Card id="assessment" className="assess" title="Start here if you're not sure" action={<Button variant="secondary" onClick={() => setOpen(true)} disabled={!companyId}>Request a Capital Assessment</Button>}>
      <p><strong>Capital Assessment · $99, credited against any package</strong></p>
      <p className="ui-muted">A 40-minute session with an advisor who reviews your readiness and maps your gaps.</p>
      <Modal open={open} onClose={() => setOpen(false)} title="Request a Capital Assessment" description="A request to our team inside the platform. Nobody is emailed by the system, and no payment is taken in this app."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={send}>Request a Capital Assessment</Button></>}>
        <FormField label="Anything we should know?" optional><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
      </Modal>
    </Card>
  );
}

function BriefCard({ brief, taxonomy, company, onChange, onSee, seeing, onEdit }) {
  const req = brief.requirement;
  const labels = Object.fromEntries((taxonomy || []).map((t) => [t.key, t.label]));
  const lowConf = req.expertise.length === 1 && req.expertise[0] === 'other';
  const evid = Object.keys(req.evidence?.expertise || {}).length ? Object.values(req.evidence.expertise).flat().filter((x) => typeof x === 'string').slice(0, 4) : [];
  const set = (patch) => onChange({ ...brief, requirement: { ...req, ...patch } });
  const removeExp = (k) => set({ expertise: req.expertise.filter((x) => x !== k).length ? req.expertise.filter((x) => x !== k) : ['other'] });
  const addExp = (k) => k && set({ expertise: [...req.expertise.filter((x) => x !== 'other' && x !== k), k].slice(0, 3) });
  return (
    <Card className="brief" title="Here's what we understood" action={<Badge tone={brief.provider === 'heuristic' ? 'outline' : 'gold'}>{brief.provider === 'heuristic' ? 'Rules-based' : 'AI-refined'}</Badge>}>
      {lowConf && <Alert tone="info">We couldn't tell which kind of expert you need. Pick one:</Alert>}
      <dl className="facts brief-facts">
        <div><dt>Expertise</dt><dd>
          <div className="ui-tags">
            {req.expertise.filter((k) => k !== 'other').map((k) => (
              <span key={k} className="ui-tag">{labels[k] || k}<button type="button" className="ui-tag-x" aria-label={`Remove ${labels[k] || k}`} onClick={() => removeExp(k)}>×</button></span>
            ))}
            <Select aria-label="Add expertise" value="" onChange={(e) => addExp(e.target.value)} placeholder="+ add"
              options={(taxonomy || []).filter((t) => t.key !== 'other' && !req.expertise.includes(t.key)).map((t) => ({ value: t.key, label: t.label }))} />
          </div>
        </dd></div>
        <div><dt>Seniority</dt><dd><Select aria-label="Seniority" value={req.seniority} onChange={(e) => set({ seniority: e.target.value })} options={Object.entries(SENIORITY).map(([value, label]) => ({ value, label }))} /></dd></div>
        <div><dt>How you'd work</dt><dd><Select aria-label="How you'd work" value={req.engagement_type} onChange={(e) => set({ engagement_type: e.target.value })} options={Object.entries(ENGAGEMENT).map(([value, label]) => ({ value, label }))} /></dd></div>
        <div><dt>When</dt><dd><Select aria-label="When" value={req.urgency} onChange={(e) => set({ urgency: e.target.value })} options={Object.entries(URGENCY).map(([value, label]) => ({ value, label }))} /></dd></div>
        <div><dt>Where</dt><dd>{req.constraints?.countries?.length ? req.constraints.countries.join(', ') : 'Anywhere'}{req.constraints?.in_person ? ' · in person' : ''}</dd></div>
        <div><dt>Budget</dt><dd>{req.constraints?.budget_usd_per_day ? `up to ${fmtUsd(req.constraints.budget_usd_per_day)} a day` : 'Not stated'}</dd></div>
        <div><dt>For your company</dt><dd>{company ? [company.stage, company.sector, company.hq_country_iso2, company.raise_usd && `raising ${fmtUsd(company.raise_usd)}`].filter(Boolean).join(' · ') || 'Not on record' : 'Not on record'} <span className="ui-faint">(from your profile)</span></dd></div>
      </dl>
      <p className="ui-muted">{brief.gapLabel ? `Built from your ${brief.gapLabel} gap.` : evid.length ? `We read “${evid.join('”, “')}” from what you wrote.` : ''}</p>
      <div className="ui-row">
        {onEdit && <Button variant="ghost" onClick={onEdit}>Edit what I wrote</Button>}
        <Button variant="accent" onClick={onSee} loading={seeing} disabled={lowConf}>See matched experts</Button>
      </div>
    </Card>
  );
}

/** 20 · Find an Expert. Describe a need, or start from a gap; confirm the brief; then results (21). */
export default function ExpertsPage() {
  const { companyId, company, readiness, run, dataRoom } = useCompany();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const gapKind = params.get('gap_kind');
  const rawGap = params.get('gap_key') || params.get('factor');
  const gapKey = rawGap && gapKind === 'data_room' && !rawGap.startsWith('data_room:') ? `data_room:${rawGap}` : rawGap;
  const taxQ = useApi(() => getTaxonomy().then((x) => x.expertise || []).catch(() => []), []);
  const unlocksQ = useApi(() => (companyId && run ? getUnlocks(companyId).catch(() => null) : null), [companyId, run?.run_id]);
  const gapBriefQ = useApi(() => (gapKey && companyId ? interpretNeed(companyId, '', gapKey) : null), [gapKey, companyId]);
  const dirQ = useApi(() => listDirectory().then((x) => x.experts || []), []);
  const [need, setNeed] = useState('');
  const [brief, setBrief] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const taxonomy = taxQ.data || [];
  const gapBrief = gapKey && gapBriefQ.data ? { requirement: { ...gapBriefQ.data.requirement, factor_key: gapKey }, provider: gapBriefQ.data.provider, gapLabel: (readiness?.readiness?.factors || []).find((f) => f.key === gapKey)?.label || gapKey.replace(/^data_room:/, 'data room: ').replace(/_/g, ' '), factorKey: gapKey } : null;
  const shown = brief || gapBrief;

  async function interpret(e) {
    e?.preventDefault();
    if (!need.trim()) return;
    setBusy('interpret'); setError(null);
    try {
      const out = await interpretNeed(companyId, need);
      setBrief({ requirement: out.requirement, provider: out.provider, needText: need });
    } catch (err) {
      setError(isMissingEndpoint(err) ? "Expert matching isn't connected in this environment yet." : "Couldn't read that. Try rephrasing, or pick the kind of expert you need below.");
      setBrief({ requirement: { expertise: ['other'], seniority: 'senior', engagement_type: 'advisory', urgency: 'flexible', constraints: {}, evidence: {} }, provider: 'heuristic', needText: need });
    } finally { setBusy(null); }
  }
  async function see(b) {
    setBusy('match'); setError(null);
    try {
      const out = await matchExperts(companyId, { requirement: b.requirement, needText: b.needText, factorKey: b.factorKey, limit: 10 });
      const id = out.request_id || `local-${Date.now()}`;
      saveBrief(id, { ...out, needText: b.needText, gapLabel: b.gapLabel, provider: b.provider });
      navigate(`/experts/results/${id}`);
    } catch (err) {
      setError(isMissingEndpoint(err) ? "Expert matching isn't connected in this environment yet." : `Couldn't match experts: ${err.message}`);
    } finally { setBusy(null); }
  }

  // gap start cards (20 §4)
  const gapCards = [];
  for (const f of readinessGapFactors(readiness?.readiness).sort((a, b) => a.points / a.max - b.points / b.max).slice(0, 2)) {
    gapCards.push({ key: f.key, kind: 'readiness_factor', title: `${f.label} · readiness ${f.status === 'unknown' ? 'unknown' : `${f.points}/${f.max}`}` });
  }
  const dom = unlocksQ.data?.blockers?.dominant_blocker;
  if (dom) gapCards.push({ key: dom.dimension, kind: 'match_blocker', title: `${dom.label} · ${dom.share_of_excluded}% of exclusions` });
  const missingDr = (dataRoom?.categories || []).flatMap((c) => c.items).filter((i) => i.required_for_stage && !i.done);
  if (missingDr.length) gapCards.push({ key: missingDr[0].key, kind: 'data_room', title: `Data room · ${missingDr.length} missing` });

  return (
    <div className="experts">
      <SubNav section="experts" />
      <PageHeader title="Find an expert" subtitle="Tell us what you need help with. We'll match you with experts who fit your company." />
      {!shown && (
        <Card>
          <form onSubmit={interpret} className="ui-stack">
            <label className="ui-label" htmlFor="need">What do you need help with?</label>
            <Textarea id="need" rows={3} value={need} onChange={(e) => setNeed(e.target.value)} placeholder="For example: someone to rebuild our financial model before our seed round, part-time, in Dubai." />
            <p className="ui-muted need-try">Try: {EXAMPLES.map((x, i) => <span key={x}>{i ? ' · ' : ''}<button type="button" className="linkish" onClick={() => setNeed(x)}>“{x}”</button></span>)}</p>
            <div className="ui-row"><Button type="submit" variant="accent" loading={busy === 'interpret'} disabled={!need.trim()}>Find experts</Button></div>
          </form>
        </Card>
      )}
      {gapKey && gapBriefQ.loading && !gapBriefQ.data && <Skeleton h="220px" />}
      {gapKey && gapBriefQ.error && <Alert tone="warn">{isMissingEndpoint(gapBriefQ.error) ? "Expert matching isn't connected in this environment yet." : `Couldn't build a brief from that gap: ${gapBriefQ.error.message}`}</Alert>}
      {error && <Alert tone="warn">{error}</Alert>}
      {shown && (
        <BriefCard brief={shown} taxonomy={taxonomy} company={company}
          onChange={(b) => setBrief(b)} onSee={() => see(shown)} seeing={busy === 'match'}
          onEdit={shown === brief && brief?.needText ? () => setBrief(null) : gapKind ? () => navigate('/experts') : null} />
      )}

      {!shown && gapCards.length > 0 && (
        <section aria-labelledby="gap-h">
          <h2 id="gap-h" className="sec-h">Or start from a gap we found</h2>
          <div className="ui-grid ui-grid-3">
            {gapCards.slice(0, 3).map((g) => (
              <Card key={g.key} title={g.title} subtitle={BRIDGE_LABEL[expertBridge(g.kind, g.key)?.key] || 'Matched expertise'}>
                <Button as={Link} to={`/experts?gap_key=${encodeURIComponent(g.key)}&gap_kind=${g.kind}&from=experts`} variant="secondary" size="sm">Find experts for this</Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <CapitalAssessment companyId={companyId} />

      <section aria-labelledby="dir-h">
        <h2 id="dir-h" className="sec-h">Browse all experts</h2>
        {dirQ.error ? (
          <Alert tone="warn">{isMissingEndpoint(dirQ.error) ? "The expert directory isn't connected in this environment yet." : `Couldn't load experts: ${dirQ.error.message}`}</Alert>
        ) : !dirQ.data ? <Skeleton h="160px" /> : dirQ.data.length ? (
          <div className="ui-grid ui-grid-3">{dirQ.data.slice(0, 12).map((e) => <ExpertCard key={e.id} expert={e} />)}</div>
        ) : <p className="ui-muted">No experts listed yet. Request a Capital Assessment and we'll route you.</p>}
      </section>
    </div>
  );
}
