import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Drawer, EmptyState, Modal, PageHeader, Select, SkeletonCards, Table, useToast } from '../design/ui';
import FitPills from '../components/capital/FitPills';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import MatchScore from '../components/capital/MatchScore';
import { GateCard, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listPipeline, updatePipelineItem, removeFromPipeline, investorHref, tierLabel, ticketRange, savedFitLabel } from '../lib/capital';
import { recordOutcome } from '../lib/fundraising';
import { FEEDBACK_DOWN_REASONS } from '../lib/learning';
import { fmtDate } from '../lib/format';
import { ShortlistSummary } from '../components/capital/AiBlocks';

const nameOf = (p) => p.capital_sources?.name || p.record_id;

/** Saved investors: shortlisted, not yet worked in the pipeline. */
export default function SavedPage() {
  const { companyId, entitlements, run, reloadPipeline } = useCompany();
  const toast = useToast();
  const q = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []), [companyId]);
  const [busy, setBusy] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [reason, setReason] = useState('wrong_geography');
  const [picked, setPicked] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [sort, setSort] = useState('date');
  const byRecord = new Map((run?.results || []).map((r) => [r.record_id, r]));
  const canDraft = Number(entitlements?.outreach_drafts_per_month || 0) > 0;

  async function toPipeline(p) {
    setBusy(p.id);
    try {
      const { item } = await updatePipelineItem(p.id, { stage: 'researching' });
      q.setData((l) => l.map((x) => (x.id === p.id ? { ...x, ...item } : x)));
      reloadPipeline();
      toast.push({ tone: 'ok', message: 'Moved to your pipeline.', action: <Link to="/capital/pipeline">Open pipeline</Link> });
    } catch (e) { toast.error(`Couldn't move it: ${e.message}`); } finally { setBusy(null); }
  }
  async function remove() {
    const p = removing;
    setBusy(p.id);
    try {
      await recordOutcome(companyId, { record_id: p.record_id, pipeline_item_id: p.id, outcome: 'not_fit', reason_code: reason }).catch(() => null);
      await removeFromPipeline(p.id);
      reloadPipeline();
      q.setData((l) => l.filter((x) => x.id !== p.id));
      toast.success(`${nameOf(p)} removed.`);
    } catch (e) { toast.error(`Couldn't remove: ${e.message}`); } finally { setBusy(null); setRemoving(null); }
  }

  const head = <><SubNav section="capital" /><PageHeader title="Shortlist" subtitle="Providers you shortlisted from your matches, to compare and decide who to approach first." /></>;
  if (q.error?.status === 402) return <div>{head}<GateCard title="Save investors and track your raise." body="Included in Capital Raising." /></div>;
  if (q.error) return <div>{head}<LoadError error={q.error} onRetry={q.reload} what="your shortlist" /></div>;
  if (!q.data) return <div>{head}<SkeletonCards count={3} height={72} /></div>;
  const saved = q.data.filter((p) => p.stage === 'shortlisted').slice().sort((a, b) => (sort === 'score'
    ? (b.match_score_at_add ?? -1) - (a.match_score_at_add ?? -1)
    : sort === 'deadline' ? String(a.capital_sources?.deadline || '9999').localeCompare(String(b.capital_sources?.deadline || '9999'))
      : new Date(b.created_at) - new Date(a.created_at)));
  const toggle = (id) => setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= 3 ? l : [...l, id]));
  const compareRows = saved.filter((p) => picked.includes(p.id));

  return (
    <div>
      {head}
      {saved.length === 0 ? (
        <EmptyState icon="bell" title="Nothing shortlisted yet." body="Shortlist investors from your matches to keep them here." action={<Button as={Link} to="/capital/matches" variant="primary">Open matches</Button>} />
      ) : (
        <>
        <div className="ui-row saved-tools">
          <span className="ui-muted">{saved.length} saved. Move one to your pipeline when you start working it.</span>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={[{ value: 'date', label: 'Date shortlisted' }, { value: 'score', label: 'Match score when shortlisted' }, { value: 'deadline', label: 'Next deadline' }]} />
          <Button variant="secondary" size="sm" disabled={picked.length < 2} onClick={() => setComparing(true)}>Compare {picked.length || ''} selected</Button>
        </div>
        {saved.length > 0 && <ShortlistSummary companyId={companyId} recordIds={saved.map((p) => p.record_id)} />}
        <ul className="saved">
          {saved.map((p) => (
            <li key={p.id} className="saved-row">
              <label className="saved-pick"><input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`Compare ${nameOf(p)}`} /></label>
              <span title="Match score when you shortlisted it"><MatchScore score={p.match_score_at_add} confidence={p.capital_sources?.data_confidence} size="sm" /></span>
              <div className="saved-main">
                <Link to={investorHref(p.record_id)} className="mrow-name">{nameOf(p)}</Link>
                <span className="mrow-meta">{[p.capital_sources?.type, p.capital_sources?.country, savedFitLabel(p, byRecord.get(p.record_id)), fmtDate(p.created_at) && `shortlisted ${fmtDate(p.created_at)}`].filter(Boolean).join(' · ')}</span>
                {byRecord.get(p.record_id) && <FitPills fits={byRecord.get(p.record_id).fits} result={byRecord.get(p.record_id)} />}
                {p.capital_sources?.deadline && <span className="ui-muted">Next step: applications close {fmtDate(p.capital_sources.deadline)}.</span>}
              </div>
              <div className="ui-row">
                <Button size="sm" variant="primary" onClick={() => toPipeline(p)} loading={busy === p.id}>Move to pipeline</Button>
                {canDraft && <Button as={Link} size="sm" variant="ghost" to={`/capital/outreach?record=${encodeURIComponent(p.record_id)}`}>Prepare outreach</Button>}
                <Button size="sm" variant="ghost" onClick={() => setRemoving(p)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} size="sm" title="Remove from your shortlist?" description="Tell us why. It improves your future matches. You can shortlist it again from your matches."
        footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" loading={Boolean(busy)} onClick={remove}>Remove</Button></>}>
        <Select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={FEEDBACK_DOWN_REASONS.map((x) => ({ value: x.key, label: x.label }))} />
      </Modal>
      <Drawer open={comparing} onClose={() => setComparing(false)} title="Compare shortlisted providers" width="760px">
        <Table dense rowKey="key" columns={[{ key: 'label', header: '' }, ...compareRows.map((p) => ({ key: p.id, header: nameOf(p) }))]}
          rows={[
            ['Match at save', (p) => p.match_score_at_add ?? 'Not on record'],
            ['Confidence', (p) => byRecord.get(p.record_id)?.data_confidence || p.capital_sources?.data_confidence || 'Not on record'],
            ['Fit when saved', (p) => (p.fit_tier_at_add ? tierLabel(p.fit_tier_at_add) : 'Not on record')],
            ['Fit', (p) => (byRecord.get(p.record_id) ? <FitPills fits={byRecord.get(p.record_id).fits} result={byRecord.get(p.record_id)} /> : 'Not in your latest run')],
            ['Ticket', (p) => ticketRange(byRecord.get(p.record_id)?.ticket_min_usd, byRecord.get(p.record_id)?.ticket_max_usd) || 'Not on record'],
            ['Stages', (p) => (byRecord.get(p.record_id)?.stages || []).join(', ') || 'Not on record'],
            ['Contact route', (p) => p.capital_sources?.contact_route || 'Not on record'],
          ].map(([label, fn]) => ({ key: label, label, ...Object.fromEntries(compareRows.map((p) => [p.id, fn(p)])) }))} />
      </Drawer>
    </div>
  );
}
