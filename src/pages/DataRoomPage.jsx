import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, FormField, Modal, PageHeader, ProgressBar, SkeletonCards, Tabs, Textarea, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { GateCard, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getDataRoom, addDataRoomItem, setDataRoomItemStatus, deleteDataRoomDoc } from '../lib/fundraising';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate } from '../lib/format';

const TYPES = /\.(pdf|docx?|xlsx?|pptx?|csv|png|jpe?g)$/i;
const MAX = 25 * 1024 * 1024;
const STATUS = {
  missing: { label: 'Missing', tone: 'neutral' }, draft: { label: 'Draft', tone: 'neutral' }, uploaded: { label: 'Added', tone: 'ok' },
  ready: { label: 'Ready', tone: 'ok' }, expired: { label: 'Out of date', tone: 'warn' }, self_declared: { label: 'I have this · self-declared', tone: 'info' },
  not_applicable: { label: 'Not applicable', tone: 'outline' },
};

/** Data room (09-data-room.md). mode="documents" is the Company › Documents view of the same items. */
export default function DataRoomPage({ mode = 'dataroom' }) {
  const { companyId, company, entitlements, reloadDataRoom } = useCompany();
  const toast = useToast();
  const q = useApi(() => getDataRoom(companyId), [companyId]);
  const [tab, setTab] = useState(null);
  const [busy, setBusy] = useState(null);
  const [na, setNa] = useState(null);
  const [naReason, setNaReason] = useState('');
  const [del, setDel] = useState(null);
  const fileRef = useRef(null);
  const [uploadFor, setUploadFor] = useState(null);
  const canUpload = ['uploads', 'uploads_and_sharing'].includes(entitlements?.data_room);
  const docsMode = mode === 'documents';

  const head = (
    <>
      <SubNav section={docsMode ? 'company' : 'capital'} />
      <PageHeader title={docsMode ? 'Documents' : 'Data room'}
        subtitle={docsMode ? 'Every document you have recorded for your raise, in one private place.' : 'What investors will ask for at your stage, in one private place.'}
        meta={q.data && <div className="dr-meter"><ProgressBar value={q.data.completeness_pct} label={`Ready for ${q.data.stage || company.stage || 'your stage'}: ${q.data.done_count} of ${q.data.required_count}`} tone="gold" /></div>} />
    </>
  );
  if (q.error) {
    return <div>{head}{isMissingEndpoint(q.error)
      ? <EmptyState icon="folder" title="The data room isn't connected in this environment yet." body="Your checklist appears here once the fundraising service is running." />
      : <LoadError error={q.error} onRetry={q.reload} what="your data room" />}</div>;
  }
  if (!q.data) return <div>{head}<SkeletonCards count={4} height={64} /></div>;

  const cats = q.data.categories || [];
  const active = tab || cats[0]?.key;
  const cat = cats.find((c) => c.key === active);

  async function act(label, fn, ok) {
    setBusy(label);
    try { await fn(); q.reload(); reloadDataRoom(); if (ok) toast.success(ok); } catch (e) {
      toast.error(e.upgradeRequired ? 'Data room uploads are included from Investor-Ready.' : e.message);
    } finally { setBusy(null); }
  }
  function pickFile(item) { setUploadFor(item); fileRef.current?.click(); }
  function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !uploadFor) return;
    if (!TYPES.test(f.name)) { toast.error("That file type isn't supported. Use PDF, Word, Excel, PowerPoint, CSV or an image."); return; }
    if (f.size > MAX) { toast.error('Files must be 25 MB or smaller.'); return; }
    act(`up-${uploadFor.key}`, () => addDataRoomItem(companyId, { doc_type: uploadFor.key, status: 'uploaded', file_name: f.name, mime_type: f.type || null, size_bytes: f.size, file_ref: `local:${f.name}`, title: uploadFor.label }), `${f.name} recorded.`);
  }

  const items = docsMode ? cats.flatMap((c) => c.items).filter((i) => (i.documents || []).length) : cat?.items || [];

  return (
    <div className="dataroom">
      {head}
      {!canUpload && !docsMode && <GateCard compact title="Data room uploads are included from Investor-Ready." body="You can still tick 'I have this' to track what's ready." />}
      <Alert tone="info">Files stay private to you. Nothing is shared with investors from here. In this preview we record each document's name, type and size; file storage is being connected.</Alert>
      {!docsMode && (
        <Tabs variant="pill" label="Categories" value={active} onChange={setTab}
          items={cats.map((c) => ({ id: c.key, label: `${c.label} ${c.items.filter((i) => i.required_for_stage && i.done).length}/${c.items.filter((i) => i.required_for_stage).length}` }))} />
      )}
      {docsMode && !items.length ? (
        <EmptyState icon="file" title="No documents yet." body="Add documents from your data room checklist." action={<Button as={Link} to="/capital/data-room" variant="primary">Open data room</Button>} />
      ) : (
        <ul className="dr-list">
          {items.map((i) => {
            const st = STATUS[i.status] || STATUS.missing;
            return (
              <li key={i.key} className={`dr-item${i.done ? ' is-done' : ''}`}>
                <span className={`dr-mark${i.done ? ' on' : ''}`} aria-hidden="true">{i.done ? '✓' : ''}</span>
                <div className="dr-main">
                  <strong>{i.label}</strong>
                  <span className="ui-muted">{i.required_for_stage ? `Required at ${q.data.stage || company.stage || 'your stage'}` : 'Nice to have'}{i.why ? ` · ${i.why}` : ''}</span>
                  {(i.documents || []).filter((d) => d.file_name).map((d) => (
                    <span key={d.id} className="dr-doc">{d.file_name} · {fmtDate(d.created_at)}
                      <Button variant="link" size="sm" onClick={() => setDel(d)}>Delete</Button></span>
                  ))}
                </div>
                <div className="dr-actions">
                  <Badge tone={st.tone} size="sm">{st.label}</Badge>
                  {!i.done && (
                    <>
                      {canUpload
                        ? <Button size="sm" variant="secondary" onClick={() => pickFile(i)} loading={busy === `up-${i.key}`}>Add file</Button>
                        : <Button size="sm" variant="ghost" iconLeft="lock" as={Link} to="/packages?highlight=investor-ready">Add file</Button>}
                      <Button size="sm" variant="ghost" onClick={() => act(`sd-${i.key}`, () => addDataRoomItem(companyId, { doc_type: i.key, status: 'self_declared', title: i.label }), 'Marked as ready.')} loading={busy === `sd-${i.key}`}>I have this</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setNa(i); setNaReason(''); }}>Not applicable</Button>
                    </>
                  )}
                  {i.status === 'not_applicable' && <Button size="sm" variant="link" onClick={() => act(`re-${i.key}`, () => setDataRoomItemStatus(companyId, i.key, { status: 'missing' }), 'Re-opened.')}>Re-open</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <input ref={fileRef} type="file" hidden onChange={onFile} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.png,.jpg,.jpeg" />
      <Modal open={Boolean(na)} onClose={() => setNa(null)} size="sm" title="Why doesn't this apply?" description={na?.label}
        footer={<><Button variant="ghost" onClick={() => setNa(null)}>Cancel</Button><Button variant="primary" disabled={naReason.trim().length < 5 || naReason.length > 200}
          onClick={() => { const it = na; setNa(null); act(`na-${it.key}`, () => setDataRoomItemStatus(companyId, it.key, { status: 'not_applicable', reason: naReason.trim() }), 'Marked not applicable.'); }}>Mark not applicable</Button></>}>
        <FormField label="Reason" hint="5 to 200 characters."><Textarea rows={3} value={naReason} onChange={(e) => setNaReason(e.target.value)} /></FormField>
      </Modal>
      <ConfirmDialog open={Boolean(del)} title={`Delete ${del?.file_name || 'this document'}?`} body="This can't be undone. The checklist item goes back to missing." confirmLabel="Delete document"
        busy={busy === 'del'} onConfirm={() => { const d = del; setDel(null); act('del', () => deleteDataRoomDoc(companyId, d.id), 'Deleted.'); }} onCancel={() => setDel(null)} />
    </div>
  );
}
