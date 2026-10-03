import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, FormField, Modal, PageHeader, Table, Tabs, Textarea, useToast } from '../../design/ui';
import useApi from '../../lib/useApi';
import { CORRECTION_STATUS, exportCorrections, listCorrections, reviewCorrection } from '../../lib/admin';
import { fmtDate } from '../../lib/format';

const LABEL = { pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', applied: 'Applied' };
const TONE = { pending: 'gold', accepted: 'ok', rejected: 'bad', applied: 'brand' };
const show = (v) => (v == null || v === '' ? <span className="unknown-pill">empty</span> : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Admin · Data corrections: review what founders and research agents say is wrong with a capital record. */
export default function AdminCorrectionsPage() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  // The API's counts follow the status filter, so totals for the tabs come from an unfiltered call.
  const q = useApi(() => Promise.all([listCorrections(status), listCorrections(undefined, 0, 1)]).then(([page, all]) => ({ ...page, counts: all.counts })), [status]);
  const [review, setReview] = useState(null); // {c, decision}
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const [exp, setExp] = useState(null);
  const counts = q.data?.counts || {};

  async function decide() {
    if (review.decision === 'rejected' && !note.trim()) return;
    setBusy('review');
    try {
      await reviewCorrection(review.c.id, review.decision, note.trim());
      toast.success(review.decision === 'accepted' ? 'Accepted. It goes out in the next export.' : 'Rejected.');
      setReview(null); setNote(''); q.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function doExport(dryRun) {
    setBusy(dryRun ? 'dry' : 'export');
    try { const out = await exportCorrections(dryRun); setExp({ ...out, dryRun }); if (!dryRun) q.reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }

  const columns = [
    { key: 'record', header: 'Record', render: (c) => <><Link to={`/capital/matches/${c.record_id}`}>{c.record_name || c.record_id}</Link><div className="ui-faint">{c.record_id}</div></> },
    { key: 'field', header: 'Field', render: (c) => <code>{c.field}</code> },
    { key: 'change', header: 'Change', render: (c) => <div className="corr-change"><span className="corr-old">{show(c.current_value)}</span><span aria-hidden="true">→</span><strong>{show(c.proposed_value)}</strong></div> },
    { key: 'why', header: 'Why', render: (c) => <>{c.reason || <span className="ui-faint">No reason given</span>}{c.evidence_url && <div><a href={c.evidence_url} target="_blank" rel="noreferrer noopener">Evidence ↗</a></div>}</> },
    { key: 'source', header: 'From', render: (c) => <><strong className="corr-from">{c.source === 'agent' ? 'Research agent' : 'Founder'}</strong>{c.agent && <div className="ui-faint">{c.agent}</div>}<div className="ui-faint">{fmtDate(c.created_at)}</div></> },
    { key: 'status', header: 'Status', render: (c) => <><Badge tone={TONE[c.status]} dot size="sm">{LABEL[c.status] || c.status}</Badge>{c.reviewer_note && <div className="ui-faint">{c.reviewer_note}</div>}</> },
    { key: 'x', header: '', render: (c) => (c.status === 'pending' ? (
      <div className="ui-row admin-row-actions">
        <Button size="sm" variant="primary" onClick={() => { setNote(''); setReview({ c, decision: 'accepted' }); }}>Accept</Button>
        <Button size="sm" variant="ghost" onClick={() => { setNote(''); setReview({ c, decision: 'rejected' }); }}>Reject</Button>
      </div>
    ) : null) },
  ];

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Data corrections" subtitle="Fixes to capital records, from founders and research agents. Accepting never edits a record here: accepted fixes are exported for the research pipeline."
        actions={<div className="ui-row"><Button variant="secondary" loading={busy === 'dry'} onClick={() => doExport(true)}>Preview export</Button><Button variant="primary" loading={busy === 'export'} disabled={!counts.accepted} onClick={() => doExport(false)}>Export accepted ({counts.accepted || 0})</Button></div>} />
      <Tabs variant="pill" label="Status" value={status} onChange={setStatus} items={CORRECTION_STATUS.map((s) => ({ id: s, label: `${LABEL[s]} ${counts[s] ?? ''}`.trim() }))} />
      {exp && (
        <Alert tone={exp.dryRun ? 'info' : 'ok'}>
          {exp.dryRun ? 'Preview: ' : 'Exported: '}{exp.count ?? exp.patch?.count ?? 0} change{(exp.count ?? 0) === 1 ? '' : 's'} from {exp.accepted ?? 0} accepted correction{exp.accepted === 1 ? '' : 's'}{exp.path ? ` → ${exp.path.split('/').slice(-2).join('/')}` : ''}.{!exp.dryRun && exp.marked_applied != null ? ` ${exp.marked_applied} marked applied.` : ''}
        </Alert>
      )}
      {q.error && <Alert tone="bad">{q.error.message}</Alert>}
      <Table className="admin-table" columns={columns} rows={q.data?.corrections || []} loading={!q.data && !q.error} rowKey="id"
        empty={<EmptyState compact icon="check" title={status === 'pending' ? 'Nothing to review.' : `No ${LABEL[status].toLowerCase()} corrections.`} />} />

      <Modal open={Boolean(review)} onClose={() => setReview(null)} title={review?.decision === 'accepted' ? 'Accept this correction?' : 'Reject this correction?'}
        description={review ? `${review.c.record_name || review.c.record_id} · ${review.c.field}` : ''}
        footer={<><Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button><Button variant={review?.decision === 'accepted' ? 'primary' : 'danger'} loading={busy === 'review'} disabled={review?.decision === 'rejected' && !note.trim()} onClick={decide}>{review?.decision === 'accepted' ? 'Accept' : 'Reject'}</Button></>}>
        {review && (
          <div className="ui-stack">
            <div className="corr-change"><span className="corr-old">{show(review.c.current_value)}</span><span aria-hidden="true">→</span><strong>{show(review.c.proposed_value)}</strong></div>
            <FormField label="Note for the record" required={review.decision === 'rejected'} optional={review.decision !== 'rejected'} hint={review.decision === 'rejected' ? 'Say why. The submitter can see it.' : undefined}>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
