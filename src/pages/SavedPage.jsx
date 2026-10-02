import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ConfirmDialog, EmptyState, PageHeader, SkeletonCards, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import MatchScore from '../components/capital/MatchScore';
import { GateCard, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listPipeline, updatePipelineItem, removeFromPipeline, investorHref, tierLabel } from '../lib/capital';
import { fmtDate } from '../lib/format';

const nameOf = (p) => p.capital_sources?.name || p.record_id;

/** Saved investors: shortlisted, not yet worked in the pipeline. */
export default function SavedPage() {
  const { companyId, entitlements } = useCompany();
  const toast = useToast();
  const q = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []), [companyId]);
  const [busy, setBusy] = useState(null);
  const [removing, setRemoving] = useState(null);
  const canDraft = Number(entitlements?.outreach_drafts_per_month || 0) > 0;

  async function toPipeline(p) {
    setBusy(p.id);
    try {
      const { item } = await updatePipelineItem(p.id, { stage: 'researching' });
      q.setData((l) => l.map((x) => (x.id === p.id ? { ...x, ...item } : x)));
      toast.success(`${nameOf(p)} moved to Researching in your pipeline.`);
    } catch (e) { toast.error(`Couldn't move it: ${e.message}`); } finally { setBusy(null); }
  }
  async function remove() {
    const p = removing;
    setBusy(p.id);
    try {
      await removeFromPipeline(p.id);
      q.setData((l) => l.filter((x) => x.id !== p.id));
      toast.success(`${nameOf(p)} removed.`);
    } catch (e) { toast.error(`Couldn't remove: ${e.message}`); } finally { setBusy(null); setRemoving(null); }
  }

  const head = <><SubNav section="capital" /><PageHeader title="Saved" subtitle="Investors you've saved from your matches. Move one into your pipeline when you start working on it." /></>;
  if (q.error?.status === 402) return <div>{head}<GateCard title="Save investors and track your raise." body="Included from Investor-Ready." /></div>;
  if (q.error) return <div>{head}<LoadError error={q.error} onRetry={q.reload} what="your saved investors" /></div>;
  if (!q.data) return <div>{head}<SkeletonCards count={3} height={72} /></div>;
  const saved = q.data.filter((p) => p.stage === 'shortlisted');

  return (
    <div>
      {head}
      {saved.length === 0 ? (
        <EmptyState icon="bell" title="Nothing saved yet." body="Save investors from your matches to keep them here." action={<Button as={Link} to="/capital/matches" variant="primary">Open matches</Button>} />
      ) : (
        <ul className="saved">
          {saved.map((p) => (
            <li key={p.id} className="saved-row">
              <MatchScore score={p.match_score_at_add} confidence={p.capital_sources?.data_confidence} size="sm" />
              <div className="saved-main">
                <Link to={investorHref(p.record_id)} className="mrow-name">{nameOf(p)}</Link>
                <span className="mrow-meta">{[p.capital_sources?.type, p.capital_sources?.country, p.fit_tier_at_add && tierLabel(p.fit_tier_at_add), `saved ${fmtDate(p.created_at)}`].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="ui-row">
                <Button size="sm" variant="primary" onClick={() => toPipeline(p)} loading={busy === p.id}>Move to pipeline</Button>
                {canDraft && <Button as={Link} size="sm" variant="ghost" to={`/capital/outreach?record=${encodeURIComponent(p.record_id)}`}>Prepare outreach</Button>}
                <Button size="sm" variant="ghost" onClick={() => setRemoving(p)}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={Boolean(removing)} title={`Remove ${removing ? nameOf(removing) : ''}?`} body="It leaves your saved list. You can save it again from your matches." confirmLabel="Remove" busy={Boolean(busy)} onConfirm={remove} onCancel={() => setRemoving(null)} />
    </div>
  );
}
