import { useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, FormField, Modal, PageHeader, Skeleton, StatTile, Table, Textarea, useToast } from '../../design/ui';
import useApi from '../../lib/useApi';
import { getLearningMetrics, reviewWeightSuggestion } from '../../lib/admin';
import { fmtDate } from '../../lib/format';

const pct = (x) => (x == null ? '–' : `${Math.round(Number(x) * 1000) / 10}%`);
const nice = (s) => String(s || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Admin · Learning: how matches turn into outcomes across all companies. Read-only; weight suggestions take a review mark and never apply themselves. */
export default function AdminLearningPage() {
  const toast = useToast();
  const q = useApi(() => getLearningMetrics(), []);
  const [rev, setRev] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const m = q.data;

  async function mark() {
    setBusy(true);
    try { await reviewWeightSuggestion(rev.s.file, rev.status, note.trim() || undefined); toast.success(`Marked ${rev.status}. Nothing changes until an engineer edits the scoring.`); setRev(null); q.reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (q.error) return <div><PageHeader eyebrow="Admin" title="Learning" /><Alert tone="bad">{q.error.message}</Alert></div>;
  if (!m) return <div><PageHeader eyebrow="Admin" title="Learning" /><Skeleton h="320px" /></div>;
  const stages = m.funnel?.stages || [];
  const top = Math.max(1, ...stages.map((s) => s.reached || 0));
  const p10 = m.precision_at_10 || {};
  const fb = m.feedback || {};
  const sugg = m.weight_suggestions || [];

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Learning" subtitle="Capital matching outcomes across all companies, by company and investor pair. Expert outcomes are kept separate." />
      <section className="admin-stats">
        <StatTile tone="navy" label="Precision at 10" value={pct(p10.precision)} foot={`${p10.replied ?? 0} replied of ${p10.contacted ?? 0} contacted`} />
        <StatTile label="Pairs tracked" value={m.funnel?.pairs ?? 0} foot="Company × investor" />
        <StatTile label="Thumbs up" value={pct(fb.up_rate)} foot={`${fb.up ?? 0} up · ${fb.down ?? 0} down`} />
        <StatTile label="Expert funnel" value={m.experts?.available ? 'Live' : 'Off'} foot={m.experts?.available ? 'Tracked separately' : 'Expert events not available'} />
      </section>

      <div className="ui-grid ui-grid-2">
        <Card title="Capital funnel" subtitle={p10.definition}>
          <ol className="admin-funnel">
            {stages.map((s) => (
              <li key={s.stage}>
                <span className="admin-funnel-label">{nice(s.stage)}</span>
                <span className="admin-funnel-bar"><span style={{ width: `${Math.max(2, (100 * (s.reached || 0)) / top)}%` }} /></span>
                <span className="admin-funnel-n">{s.reached}</span>
                <span className="ui-faint admin-funnel-conv">{s.conversion_from_previous == null ? '' : pct(s.conversion_from_previous)}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Why investors passed" subtitle="Founder-reported reasons on passed and not-a-fit outcomes.">
          {(m.pass_reasons || []).length ? (
            <ul className="admin-list">{m.pass_reasons.map((r) => <li key={r.reason}><span>{nice(r.reason)}</span><strong>{r.count}</strong></li>)}</ul>
          ) : <p className="ui-muted">No pass reasons recorded yet.</p>}
        </Card>
      </div>

      <Card title="Outcomes by match score band">
        <Table dense columns={[
          { key: 'band', header: 'Band', render: (r) => nice(r.band) },
          { key: 'pairs', header: 'Pairs', numeric: true },
          { key: 'contacted', header: 'Contacted', numeric: true },
          { key: 'reply_rate', header: 'Reply rate', numeric: true, render: (r) => (r.contacted ? pct(r.reply_rate) : '–') },
          { key: 'meeting_rate', header: 'Meeting rate', numeric: true, render: (r) => (r.contacted ? pct(r.meeting_rate) : '–') },
        ]} rows={m.by_score_band || []} rowKey="band" empty={<p className="ui-muted">No outcomes yet.</p>} />
        <p className="ui-faint">Small numbers: read rates with their counts. Rates are over contacted pairs.</p>
      </Card>

      <Card title="Weight suggestions" subtitle="Produced by the evaluation run. A review mark is logged only; a weight changes when an engineer edits the scoring code.">
        {sugg.length === 0 ? <EmptyState compact icon="info" title="No weight suggestions yet." body="They appear after an evaluation run writes one." /> : (
          <Table dense columns={[
            { key: 'file', header: 'Run', render: (s) => fmtDate(s.generated_at) || s.file },
            { key: 'any_change', header: 'Suggests a change', render: (s) => (s.any_change ? 'Yes' : 'No') },
            { key: 'calibration', header: 'Calibration', render: (s) => s.calibration || '–' },
            { key: 'status', header: 'Review', render: (s) => <Badge tone={s.status === 'approved' ? 'ok' : s.status === 'rejected' ? 'bad' : 'gold'} size="sm">{nice(s.status)}</Badge> },
            { key: 'x', header: '', render: (s) => (s.status === 'proposed' ? <div className="ui-row admin-row-actions"><Button size="sm" variant="secondary" onClick={() => { setNote(''); setRev({ s, status: 'approved' }); }}>Approve</Button><Button size="sm" variant="ghost" onClick={() => { setNote(''); setRev({ s, status: 'rejected' }); }}>Reject</Button></div> : null) },
          ]} rows={sugg} rowKey="file" />
        )}
      </Card>

      <Modal open={Boolean(rev)} onClose={() => setRev(null)} title={rev?.status === 'approved' ? 'Approve this suggestion?' : 'Reject this suggestion?'}
        description="This records your review only. Nothing in matching changes automatically."
        footer={<><Button variant="ghost" onClick={() => setRev(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={mark}>{rev?.status === 'approved' ? 'Approve' : 'Reject'}</Button></>}>
        <FormField label="Note" optional><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
      </Modal>
    </div>
  );
}
