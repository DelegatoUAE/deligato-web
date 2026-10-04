import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert, Badge, Button, ConfirmDialog, Drawer, EmptyState, FormField, Input, KanbanBoard, KanbanCard, KanbanColumn, Modal,
  PageHeader, Select, Skeleton, Tabs, Textarea, useToast,
} from '../design/ui';
import SubNav from '../components/SubNav';
import { MeetingPrep } from '../components/capital/AiBlocks';
import { useCompany } from '../components/company-context';
import MatchScore from '../components/capital/MatchScore';
import { GateCard, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { listPipeline, updatePipelineItem, removeFromPipeline, PIPELINE_STAGES, ACTIVE_STAGES, stageLabel, investorHref, tierLabel } from '../lib/capital';
import { recordOutcome, createActivity, getTimeline, PASS_REASONS, passReasonLabel } from '../lib/fundraising';
import { apiFetch } from '../lib/auth';
import { daysSince, fmtDate, todayIso, humanise } from '../lib/format';
import { gateFor } from '../lib/plan';

const OUTCOME_STAGES = ['passed', 'not_now', 'term_sheet', 'closed_won'];
const TONE = { shortlisted: 'neutral', researching: 'neutral', intro_requested: 'info', contacted: 'info', in_conversation: 'navy', diligence: 'navy', term_sheet: 'gold', closed_won: 'ok', passed: 'bad', not_now: 'neutral' };
const nameOf = (p) => p.capital_sources?.name || p.name || p.record_id;
const enteredAt = (p) => p.stage_entered_at || p.updated_at || p.created_at;

/** Outcome events that a plain stage move writes (journey.md step 12). */
async function eventForMove(companyId, item, to) {
  if (to === 'in_conversation') return recordOutcome(companyId, { record_id: item.record_id, pipeline_item_id: item.id, outcome: 'replied' });
  if (to === 'contacted' || to === 'intro_requested') {
    return apiFetch('/api/v1/learning/outcomes', { method: 'POST', body: JSON.stringify({ company_id: companyId, record_id: item.record_id, event: 'contacted', metadata: { pipeline_item_id: item.id, match_score_at_add: item.match_score_at_add, fit_tier_at_add: item.fit_tier_at_add || null, via: 'pipeline' } }) });
  }
  return null;
}

function OutcomeDialog({ state, onCancel, onSave, busy }) {
  const { item, to } = state;
  const [form, setForm] = useState({ outcome: to === 'not_now' ? 'not_now' : to, reason: to === 'not_now' ? 'timing_fund_cycle' : '', amount: '', instrument: '', date: todayIso(), note: '' });
  const needReason = ['passed', 'not_now'].includes(form.outcome);
  const needAmount = ['term_sheet', 'closed_won'].includes(form.outcome);
  const valid = (!needReason || form.reason) && (!needAmount || Number(form.amount) > 0) && (form.outcome !== 'closed_won' || form.instrument);
  return (
    <Modal open onClose={onCancel} title={`What happened with ${nameOf(item)}?`} description="Outcomes help Conncct learn which matches lead somewhere. They never change your results on their own, and your note stays private."
      footer={<><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant="primary" onClick={() => onSave(form)} loading={busy} disabled={!valid}>Save outcome</Button></>}>
      <div className="ui-form">
        {needReason && (
          <FormField label="Outcome" wide>
            {() => (
              <div className="ui-row">
                {['passed', 'not_now'].map((o) => (
                  <label key={o} className="check"><input type="radio" name="oc" checked={form.outcome === o} onChange={() => setForm({ ...form, outcome: o, reason: o === 'not_now' ? 'timing_fund_cycle' : form.reason })} /> {o === 'passed' ? 'Passed' : 'Not now'}</label>
                ))}
              </div>
            )}
          </FormField>
        )}
        {needReason && (
          <FormField label="Main reason" required>
            <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Choose a reason" options={PASS_REASONS.map((r) => ({ value: r.key, label: r.label }))} />
          </FormField>
        )}
        {needAmount && (
          <FormField label="Amount" required><Input prefix="$" numeric value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, '') })} /></FormField>
        )}
        {needAmount && (
          <FormField label="Instrument" required={form.outcome === 'closed_won'} optional={form.outcome !== 'closed_won'}>
            <Select value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })} placeholder="Choose" options={['Equity', 'SAFE', 'Convertible note', 'Venture debt', 'Revenue-based', 'Grant', 'Loan']} />
          </FormField>
        )}
        <FormField label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField>
        <FormField label="Note (private)" optional wide><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></FormField>
      </div>
    </Modal>
  );
}

function ItemDrawer({ item, companyId, onClose, onChanged, onMove, onRemove }) {
  const toast = useToast();
  const [form, setForm] = useState({ next_action: item.next_action || '', next_action_date: item.next_action_date || '', owner_note: item.owner_note || '' });
  const [busy, setBusy] = useState(null);
  const tl = useApi(() => getTimeline(companyId, item.record_id).catch(() => null), [item.id]);

  async function save() {
    setBusy('save');
    try {
      const { item: next } = await updatePipelineItem(item.id, { ...form, next_action_date: form.next_action_date || null });
      onChanged(next);
      toast.success('Saved.');
    } catch (e) { toast.error(`Couldn't save: ${e.message}`); } finally { setBusy(null); }
  }
  async function log(kind) {
    setBusy(kind);
    try {
      if (kind === 'meeting') await createActivity(companyId, { kind: 'meeting', record_id: item.record_id, title: 'Meeting', occurred_at: new Date().toISOString() }).catch(() => null);
      await recordOutcome(companyId, { record_id: item.record_id, pipeline_item_id: item.id, outcome: kind === 'meeting' ? 'meeting' : 'replied' });
      toast.success(kind === 'meeting' ? 'Meeting logged.' : 'Reply logged.');
      tl.reload();
    } catch (e) { toast.error(`Couldn't log that: ${e.message}`); } finally { setBusy(null); }
  }

  const events = tl.data?.events || tl.data?.timeline || [];
  return (
    <Drawer open onClose={onClose} title={nameOf(item)} description={`${stageLabel(item.stage)} · ${daysSince(enteredAt(item)) ?? 0} days in stage`}
      footer={<><Button variant="danger" onClick={() => onRemove(item)}>Remove from pipeline</Button><Button variant="primary" onClick={save} loading={busy === 'save'}>Save</Button></>}>
      <div className="ui-stack">
        <FormField label="Stage">
          <Select value={item.stage} onChange={(e) => onMove(item, e.target.value)} options={PIPELINE_STAGES.map((s) => ({ value: s.key, label: s.label }))} />
        </FormField>
        <div className="ui-form ui-form-2">
          <FormField label="Next action"><Input value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} placeholder="e.g. Send deck" /></FormField>
          <FormField label="By"><Input type="date" value={form.next_action_date || ''} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} /></FormField>
        </div>
        <FormField label="Private notes"><Textarea rows={3} value={form.owner_note} onChange={(e) => setForm({ ...form, owner_note: e.target.value })} /></FormField>
        <div className="ui-row">
          <Button variant="secondary" size="sm" onClick={() => log('meeting')} loading={busy === 'meeting'}>Log a meeting</Button>
          <Button variant="secondary" size="sm" onClick={() => log('reply')} loading={busy === 'reply'}>Log a reply</Button>
        </div>
        <MeetingPrep key={item.record_id} companyId={companyId} recordId={item.record_id} compact />
        <div className="ui-row">
          <Link to={investorHref(item.record_id)}>Open investor profile</Link>
          <Link to={`/capital/outreach?record=${encodeURIComponent(item.record_id)}`}>Drafts for this investor</Link>
        </div>
        <div>
          <h4 className="sub-h">History</h4>
          {tl.data === undefined ? <Skeleton variant="text" lines={3} /> : events.length ? (
            <ul className="timeline">{events.slice(0, 20).map((ev, i) => (
              <li key={ev.id || i}><span>{fmtDate(ev.at || ev.occurred_at || ev.created_at)}</span> {humanise(ev.event || ev.kind || ev.type)}{ev.reason ? ` · ${passReasonLabel(ev.reason)}` : ''}</li>
            ))}</ul>
          ) : <p className="ui-faint">No history yet.</p>}
        </div>
      </div>
    </Drawer>
  );
}

export default function PipelinePage() {
  const { companyId, reloadPipeline } = useCompany();
  const toast = useToast();
  const q = useApi(() => listPipeline(companyId).then((x) => x.pipeline || []), [companyId]);
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'board'));
  const [showClosed, setShowClosed] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [removing, setRemoving] = useState(null);

  const items = q.data || [];
  const boardRef = useRef(null);
  const firstStage = items.find((p) => p.stage !== 'shortlisted')?.stage;
  // Bring the first column with cards into view (later stages sit off to the right).
  useEffect(() => {
    const col = boardRef.current?.querySelector('.ui-kcol .ui-kcard')?.closest('.ui-kcol');
    col?.scrollIntoView?.({ block: 'nearest', inline: 'start' });
  }, [firstStage, view, showClosed]);
  const replace = (next) => q.setData((l) => (l || []).map((x) => (x.id === next.id ? { ...x, ...next } : x)));

  async function applyMove(item, to, extra) {
    const prev = item.stage;
    replace({ ...item, stage: to });
    try {
      const { item: next } = await updatePipelineItem(item.id, { stage: to });
      replace(next);
      reloadPipeline();
      if (extra) await extra();
      else await eventForMove(companyId, item, to).catch(() => null);
    } catch (e) {
      replace({ ...item, stage: prev });
      toast.error(e.upgradeRequired ? (e.code === 'fair_use_limit' ? gateFor(e).message : 'Pipeline tracking is included in Capital Raising.') : "Couldn't move this. Try again.");
    }
  }

  function move(item, to) {
    if (!to || to === item.stage) return;
    if (OUTCOME_STAGES.includes(to)) { setOutcome({ item, to }); return; }
    applyMove(item, to);
  }

  async function saveOutcome(form) {
    const { item, to } = outcome;
    setBusy(true);
    const target = form.outcome === 'not_now' ? 'not_now' : to === 'not_now' && form.outcome === 'passed' ? 'passed' : to;
    await applyMove(item, target, async () => {
      try {
        await recordOutcome(companyId, {
          record_id: item.record_id, pipeline_item_id: item.id, outcome: form.outcome,
          reason_code: form.reason || undefined, amount_usd: form.amount ? Number(form.amount) : undefined,
          instrument: form.instrument || undefined,
          occurred_on: form.date || undefined, note: form.note || undefined,
        });
        toast.success('Outcome saved.');
      } catch (e) {
        toast.error(`Stage moved, but the outcome wasn't saved: ${e.message}`);
      }
    });
    setBusy(false);
    setOutcome(null);
  }

  async function remove() {
    const item = removing;
    setBusy(true);
    try {
      await removeFromPipeline(item.id);
      q.setData((l) => (l || []).filter((x) => x.id !== item.id));
      setOpenId(null);
      toast.success(`${nameOf(item)} removed from your pipeline.`);
    } catch (e) { toast.error(`Couldn't remove: ${e.message}`); } finally { setBusy(false); setRemoving(null); }
  }

  if (q.error?.status === 402) {
    return (
      <div><SubNav section="capital" /><PageHeader title="Pipeline" />
        <div className="gated-blur" aria-hidden="true"><div className="ui-kanban">{ACTIVE_STAGES.slice(0, 4).map((s) => <div key={s} className="ui-kcol"><div className="ui-kcol-head"><h3 className="ui-kcol-title">{stageLabel(s)}</h3></div></div>)}</div></div>
        <GateCard title="Track your raise in one place." body="Included in Capital Raising." />
      </div>
    );
  }
  if (q.error) return <div><SubNav section="capital" /><PageHeader title="Pipeline" /><LoadError error={q.error} onRetry={q.reload} what="your pipeline" /></div>;

  const tracked = items.filter((p) => p.stage !== 'shortlisted');
  // "1 in conversation" was said of a provider in diligence (seen in real use):
  // say what is true, and never leave a closed deal unmentioned.
  const conv = items.filter((p) => ['in_conversation', 'diligence', 'term_sheet'].includes(p.stage)).length;
  const won = items.filter((p) => p.stage === 'closed_won').length;
  const headline = [`${tracked.length} ${tracked.length === 1 ? 'provider' : 'providers'}`, conv ? `${conv} in active talks` : null, won ? `${won} closed` : null].filter(Boolean).join(' · ');
  // Saved (shortlisted) lives on its own screen (18); the board starts at Researching.
  const boardStages = PIPELINE_STAGES.filter((s) => s.key !== 'shortlisted');
  const columns = showClosed ? boardStages : boardStages.filter((s) => ACTIVE_STAGES.includes(s.key));
  const savedN = items.filter((p) => p.stage === 'shortlisted').length;
  const openItem = items.find((x) => x.id === openId);

  const card = (p) => {
    const days = daysSince(enteredAt(p)) ?? 0;
    const stale = ACTIVE_STAGES.includes(p.stage) && days >= 21;
    const overdue = p.next_action_date && p.next_action_date < todayIso();
    return (
      <KanbanCard key={p.id} title={nameOf(p)} stale={stale} dragging={dragId === p.id}
        draggable onDragStart={(e) => { setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDragId(null); setOverStage(null); }}
        onClick={() => setOpenId(p.id)}
        leading={<MatchScore score={p.match_score_at_add} confidence={p.capital_sources?.data_confidence} size="sm" />}
        meta={[p.fit_tier_at_add && tierLabel(p.fit_tier_at_add), p.capital_sources?.type].filter(Boolean).join(' · ')}
        footer={(
          <>
            {p.next_action && <Badge tone={overdue ? 'bad' : 'gold'} dot size="sm">{p.next_action}{p.next_action_date ? ` · ${fmtDate(p.next_action_date)}` : ''}</Badge>}
            <span className="ui-faint">{days} days here</span>
            {stale && <Badge tone="warn" size="sm">No update in {days} days</Badge>}
          </>
        )}
      />
    );
  };

  return (
    <div className="pipeline">
      <SubNav section="capital" />
      <PageHeader title="Pipeline" subtitle={headline}
        meta={savedN > 0 && <Link to="/capital/saved">{savedN} saved, not in your pipeline yet</Link>}
        actions={<Tabs variant="pill" label="View" value={view} onChange={setView} items={[{ id: 'board', label: 'Board' }, { id: 'list', label: 'List' }]} />} />
      {q.data === undefined ? <Skeleton h="300px" /> : tracked.length === 0 ? (
        <EmptyState icon="kanban" title="Nothing tracked yet." body={savedN ? "Move a saved provider into your pipeline when you start working on it." : "Shortlist investors from your matches to start."} action={<Button as={Link} to={savedN ? "/capital/saved" : "/capital/matches"} variant="primary">{savedN ? "Open saved" : "Open matches"}</Button>} />
      ) : view === 'board' ? (
        <>
          <div ref={boardRef}><KanbanBoard label="Fundraising pipeline">
            {columns.map((s) => {
              const list = items.filter((p) => p.stage === s.key);
              return (
                <KanbanColumn key={s.key} title={s.label} count={list.length} tone={TONE[s.key]} isOver={overStage === s.key} empty="Drop an investor here"
                  onDragOver={(e) => { e.preventDefault(); setOverStage(s.key); }} onDragLeave={() => setOverStage(null)}
                  onDrop={(e) => { e.preventDefault(); const it = items.find((x) => x.id === dragId); setOverStage(null); if (it) move(it, s.key); }}>
                  {list.map(card)}
                </KanbanColumn>
              );
            })}
          </KanbanBoard></div>
          <Button variant="link" size="sm" onClick={() => setShowClosed((v) => !v)}>{showClosed ? 'Hide closed, passed and not now' : 'Show closed, passed and not now'}</Button>
        </>
      ) : (
        <div className="plist">
          {boardStages.map((s) => {
            const list = items.filter((p) => p.stage === s.key);
            if (!list.length) return null;
            return (
              <section key={s.key}>
                <h2 className="plist-h">{s.label} <span>{list.length}</span></h2>
                <ul>
                  {list.map((p) => (
                    <li key={p.id} className="plist-row">
                      <MatchScore score={p.match_score_at_add} size="sm" />
                      <button type="button" className="plist-name" onClick={() => setOpenId(p.id)}>{nameOf(p)}</button>
                      <label className="ui-sr" htmlFor={`mv-${p.id}`}>Move {nameOf(p)} to</label>
                      <Select id={`mv-${p.id}`} value={p.stage} onChange={(e) => move(p, e.target.value)} options={PIPELINE_STAGES.map((x) => ({ value: x.key, label: x.label }))} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="ui-faint">Drag a card, or open it and use Stage, to move it. Passed, Not now, Term sheet and Closed ask what happened.</p>

      {outcome && <OutcomeDialog state={outcome} busy={busy} onCancel={() => setOutcome(null)} onSave={saveOutcome} />}
      {openItem && <ItemDrawer key={openItem.id} item={openItem} companyId={companyId} onClose={() => setOpenId(null)} onChanged={replace} onMove={move} onRemove={setRemoving} />}
      <ConfirmDialog open={Boolean(removing)} title={`Remove ${removing ? nameOf(removing) : ''}?`} body="This removes the investor and its next action from your pipeline. Outcomes you've recorded are kept." confirmLabel="Remove from pipeline" busy={busy} onConfirm={remove} onCancel={() => setRemoving(null)} />
      {items.some((p) => p.stage === 'term_sheet') && <Alert tone="ok">You have a term sheet in play. Get legal advice before you sign anything.</Alert>}
    </div>
  );
}
