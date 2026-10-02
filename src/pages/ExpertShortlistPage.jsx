import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, EmptyState, PageHeader, Select, SkeletonCards, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import ExpertCard from '../components/ExpertCard';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { readBrief, saveBrief, getExpertRequest, matchExperts, shortlistExpert, ENGAGEMENT, URGENCY, SENIORITY } from '../lib/experts';
import { isMissingEndpoint } from '../lib/auth';

const REASON = {
  expertise_not_covered: 'expertise not covered', on_leave: 'on leave', booked_for_urgent_need: 'booked, and you need someone this week',
  above_budget: 'above your budget', not_local_for_in_person: 'not local, and you asked for in person', not_evaluated: 'not enough on record to evaluate',
};

/** Re-run the match for a brief when the session copy is gone (page reload). */
async function loadBrief(companyId, briefId) {
  const cached = readBrief(briefId);
  if (cached) return cached;
  const { request } = await getExpertRequest(companyId, briefId);
  const out = await matchExperts(companyId, { needText: request.message || request.topic, factorKey: request.readiness_factor_key || undefined, limit: 10 });
  const data = { ...out, request_id: briefId, needText: request.message };
  saveBrief(briefId, data);
  return data;
}

/** 21 · Matched experts for one need. */
export default function ExpertShortlistPage() {
  const { briefId } = useParams();
  const { companyId } = useCompany();
  const toast = useToast();
  const q = useApi(() => loadBrief(companyId, briefId), [briefId, companyId]);
  const [shortlisted, setShortlisted] = useState({});
  const [busy, setBusy] = useState(null);
  const [sort, setSort] = useState('fit');
  const [avail, setAvail] = useState('');

  const head = <><SubNav section="experts" /><Link to="/experts" className="back">← Find an expert</Link><PageHeader title="Matched experts" /></>;
  if (q.error) {
    return <div>{head}{q.error.status === 404 && !isMissingEndpoint(q.error)
      ? <EmptyState icon="search" title="We couldn't find this search." action={<Button as={Link} to="/experts" variant="primary">Find an expert</Button>} />
      : <Alert tone="bad">{isMissingEndpoint(q.error) ? "Expert matching isn't connected in this environment yet." : q.error.message}</Alert>}</div>;
  }
  if (!q.data) return <div>{head}<p className="ui-muted">Matching against our expert network…</p><SkeletonCards count={3} height={150} /></div>;

  const d = q.data;
  const req = d.requirement || {};
  const counts = d.counts || {};
  const excluded = Object.entries(counts.excluded || {}).filter(([, n]) => n > 0);
  let results = (d.results || []).filter((r) => !avail || r.expert.availability === avail);
  if (sort === 'available') results = results.slice().sort((a, b) => (a.expert.availability === 'available' ? 0 : 1) - (b.expert.availability === 'available' ? 0 : 1));
  const realBrief = !String(briefId).startsWith('local-');

  async function onShortlist(expert) {
    setBusy(expert.id);
    try {
      await shortlistExpert(companyId, briefId, expert.id);
      setShortlisted((s) => ({ ...s, [expert.id]: true }));
      toast.push({ tone: 'ok', message: `${expert.display_name || 'Expert'} shortlisted.`, action: <Link to="/experts/mine">My experts</Link> });
    } catch (e) { toast.error(`Couldn't shortlist: ${e.message}`); } finally { setBusy(null); }
  }

  return (
    <div className="experts">
      {head}
      <p className="brief-line">
        For: {[(req.labels || req.expertise || []).join(' + '), SENIORITY[req.seniority], ENGAGEMENT[req.engagement_type], URGENCY[req.urgency], (req.constraints?.countries || []).join(', ')].filter(Boolean).join(' · ')}
        {' '}<Button as={Link} to="/experts" variant="link" size="sm">Edit brief</Button>
      </p>
      {counts.pool != null && (
        <p className="ui-muted">{counts.eligible ?? results.length} experts fit of {counts.pool} in our network{excluded.length ? ` · ${excluded.reduce((n, [, v]) => n + v, 0)} not shown: ${excluded.map(([k, n]) => `${REASON[k] || k.replace(/_/g, ' ')} (${n})`).join(', ')}` : ''}</p>
      )}
      {d.score_note && <p className="ui-faint">{d.score_note}</p>}
      {d.degraded && d.notice && <Alert tone="info">{d.notice}</Alert>}
      {(counts.pool != null && counts.pool < 10) || (counts.eligible != null && counts.eligible < 3) ? <Alert tone="info">Our expert network is still small for this need. Treat these as a starting point.</Alert> : null}
      {results.length > 0 && (
        <div className="ui-row mfilters">
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={[{ value: 'fit', label: 'Best fit' }, { value: 'available', label: 'Available first' }]} />
          <Select aria-label="Availability" value={avail} onChange={(e) => setAvail(e.target.value)} placeholder="Any availability" options={[{ value: 'available', label: 'Available' }, { value: 'partial', label: 'Partially available' }]} />
        </div>
      )}
      {(d.results || []).length === 0 ? (
        <EmptyState icon="users" title="No expert in our network fits this brief yet."
          body={excluded[0] ? (excluded[0][0] === 'expertise_not_covered' ? 'Try a broader expertise.' : excluded[0][0] === 'above_budget' ? 'Raise or remove your budget.' : excluded[0][0] === 'booked_for_urgent_need' ? "Change 'When' to Soon." : '') : ''}
          action={<div className="ui-row"><Button as={Link} to="/experts" variant="primary">Edit brief</Button><Button as={Link} to="/experts#assessment" variant="secondary">Request a Capital Assessment</Button></div>} />
      ) : (
        <div className="xresults">
          {results.map((r) => (
            <ExpertCard key={r.expert.id} result={r} requestId={briefId} onShortlist={realBrief ? onShortlist : null} shortlisted={shortlisted[r.expert.id]} busy={busy === r.expert.id} />
          ))}
        </div>
      )}
      <p className="ui-muted">Not quite right? <Link to="/experts">Edit brief</Link> · or <Link to="/experts#assessment">request a Capital Assessment</Link> and we'll route you.</p>
    </div>
  );
}
