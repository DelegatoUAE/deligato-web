import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, FormField, Icon, Input, Modal, PageHeader, ProgressBar, SkeletonCards, Tabs, Textarea, Tooltip, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getDataRoom, addDataRoomItem, setDataRoomItemStatus, deleteDataRoomDoc, updateDataRoomDoc } from '../lib/fundraising';
import { includedIn, upgradeHref } from '../lib/plan';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate } from '../lib/format';

const TYPES = /\.(pdf|docx?|xlsx?|pptx?|csv|png|jpe?g)$/i;
const MAX = 25 * 1024 * 1024;
const STATUS = {
  missing: { label: 'Missing', tone: 'neutral' }, draft: { label: 'Draft', tone: 'neutral' }, uploaded: { label: 'Added', tone: 'ok' },
  ready: { label: 'Ready', tone: 'ok' }, expired: { label: 'Out of date', tone: 'warn' }, self_declared: { label: 'I have this · self-declared', tone: 'info' },
  not_applicable: { label: 'Not applicable', tone: 'outline' },
};

const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
/** The completing record of an item (a file, or the "I have this" row): the one whose dates count. */
const holderOf = (i) => (i.documents || []).find((d) => ['uploaded', 'ready', 'self_declared'].includes(d.status)) || null;
/** Display only: the Company Record engine decides expiry for the meter (company-record.md §6). */
function expiryOf(d) {
  if (!d?.expires_at) return null;
  const days = Math.ceil((new Date(d.expires_at).getTime() - Date.now()) / DAY);
  return days <= 0 ? { state: 'expired', days } : days <= 30 ? { state: 'expiring', days } : { state: 'valid', days };
}

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
  // D55 Prepare: "I have this" and date edits carry the document's dates (api faf5732).
  const [dates, setDates] = useState(null); // { item, doc?, document_date, expires_at }
  const canUpload = ['uploads', 'uploads_and_sharing'].includes(entitlements?.data_room);
  // The plan allows uploads, but the API says where files can go. While it
  // reports 'metadata_only' there is no private storage, so no file can
  // honestly be "uploaded": a paying customer sees why, not a button that
  // fails (found 4 Oct testing as a genuinely entitled account).
  const storageLive = !!q.data && q.data.storage && q.data.storage !== 'metadata_only';
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
      toast.error(e.upgradeRequired ? `Data room uploads are ${includedIn().toLowerCase()}.` : e.message);
    } finally { setBusy(null); }
  }
  function pickFile(item) { setUploadFor(item); fileRef.current?.click(); }
  function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !uploadFor) return;
    if (!TYPES.test(f.name)) { toast.error("That file type isn't supported. Use PDF, Word, Excel, PowerPoint, CSV or an image."); return; }
    if (f.size > MAX) { toast.error('Files must be 25 MB or smaller.'); return; }
    // Only reachable when the API reports live storage. It used to send a
    // made-up 'local:' pointer, which the API rightly rejects (invalid_file_ref):
    // a stored file needs a real storage key from the upload, never a guess.
    act(`up-${uploadFor.key}`, () => addDataRoomItem(companyId, { doc_type: uploadFor.key, status: 'uploaded', file_name: f.name, mime_type: f.type || null, size_bytes: f.size, title: uploadFor.label }), `${f.name} recorded.`);
  }

  const items = docsMode ? cats.flatMap((c) => c.items).filter((i) => (i.documents || []).length) : cat?.items || [];

  return (
    <div className="dataroom">
      {head}
      {!docsMode && (
        <p className="dr-mode"><Badge tone="brand">Prepare</Badge> Get every document your stage needs in place and in date. Tick <em>I have this</em> with the document's date and expiry, and we flag it before it goes stale.{!canUpload ? ' File uploads are included in Capital Raising.' : ''}</p>
      )}
      <Alert tone="info">Files stay private to you. Nothing is shared with investors from here.{!storageLive ? <> File storage is being connected{canUpload ? ', and your plan includes uploads once it is' : ''}. Until then, tick <em>I have this</em> with the document's date and expiry, and we keep track of it.</> : null}</Alert>
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
                  {(() => {
                    const h = holderOf(i);
                    if (!h || (!h.document_date && !h.expires_at)) return null;
                    const x = expiryOf(h);
                    return (
                      <span className="dr-dates">
                        {h.document_date ? `Dated ${fmtDate(h.document_date)}` : ''}{h.document_date && h.expires_at ? ' · ' : ''}{h.expires_at ? `Valid until ${fmtDate(h.expires_at)}` : ''}
                        {x?.state === 'expired' && <Badge tone="bad" size="sm">Expired: counts as missing</Badge>}
                        {x?.state === 'expiring' && <Badge tone="warn" size="sm">{`Expires in ${x.days} ${x.days === 1 ? 'day' : 'days'}`}</Badge>}
                      </span>
                    );
                  })()}
                  {(i.documents || []).filter((d) => d.file_name).map((d) => (
                    <span key={d.id} className="dr-doc">{d.file_name} · {fmtDate(d.created_at)}
                      <Button variant="link" size="sm" onClick={() => setDel(d)}>Delete</Button></span>
                  ))}
                </div>
                <div className="dr-actions">
                  <Badge tone={st.tone} size="sm">{st.label}</Badge>
                  {!i.done && (
                    <>
                      {!canUpload
                        ? <Button size="sm" variant="ghost" iconLeft="lock" as={Link} to="/packages?highlight=capital-raising">Add file</Button>
                        : storageLive
                          ? <Button size="sm" variant="secondary" onClick={() => pickFile(i)} loading={busy === `up-${i.key}`}>Add file</Button>
                          : <Tooltip text="File storage is being connected. Until then, tick I have this with the document's date."><span><Button size="sm" variant="ghost" disabled>Add file</Button></span></Tooltip>}
                      <Button size="sm" variant="ghost" onClick={() => setDates({ item: i, doc: null, document_date: '', expires_at: '' })} loading={busy === `sd-${i.key}`}>I have this</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setNa(i); setNaReason(''); }}>Not applicable</Button>
                    </>
                  )}
                  {i.done && holderOf(i) && <Button size="sm" variant="link" onClick={() => { const h = holderOf(i); setDates({ item: i, doc: h, document_date: h.document_date ? String(h.document_date).slice(0, 10) : '', expires_at: h.expires_at ? String(h.expires_at).slice(0, 10) : '' }); }}>Dates</Button>}
                  {i.status === 'not_applicable' && <Button size="sm" variant="link" onClick={() => act(`re-${i.key}`, () => setDataRoomItemStatus(companyId, i.key, { status: 'missing' }), 'Re-opened.')}>Re-open</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!docsMode && (
        <section className="dealroom-soon" aria-label="Investor Deal Room">
          <Icon name="lock" />
          <div>
            <p className="dealroom-t">Investor Deal Room: coming soon</p>
            <p className="ui-muted">A secure room for each investor you invite: you choose who sees what, until when, and you can revoke access at any time. {canUpload ? "It's part of your Capital Raising plan when it opens." : `${includedIn()} when it opens.`}</p>
          </div>
          {!canUpload && <Button as={Link} to={upgradeHref()} variant="link" size="sm">See plans</Button>}
        </section>
      )}
      <Modal open={Boolean(dates)} onClose={() => setDates(null)} size="sm" title={dates?.doc ? `Dates for ${dates?.item?.label}` : `You have ${dates?.item?.label ? dates.item.label.toLowerCase() : 'this'}`}
        description="Both dates are optional. With an expiry date we flag the document 30 days before it goes out of date."
        footer={<><Button variant="ghost" onClick={() => setDates(null)}>Cancel</Button><Button variant="primary"
          disabled={Boolean(dates?.document_date && dates.document_date > today()) || Boolean(dates?.document_date && dates?.expires_at && dates.expires_at <= dates.document_date)}
          onClick={() => {
            const d = dates; setDates(null);
            const body = { document_date: d.document_date || null, expires_at: d.expires_at || null };
            if (d.doc) act(`dt-${d.item.key}`, () => updateDataRoomDoc(companyId, d.doc.id, body), 'Dates saved.');
            else act(`sd-${d.item.key}`, () => setDataRoomItemStatus(companyId, d.item.key, { status: 'self_declared', ...(d.document_date ? { document_date: d.document_date } : {}), ...(d.expires_at ? { expires_at: d.expires_at } : {}) }), 'Marked as ready.');
          }}>{dates?.doc ? 'Save dates' : 'I have this'}</Button></>}>
        {dates && (
          <div className="ui-form ui-form-2">
            <FormField label="Date on the document" hint="Not in the future." error={dates.document_date > today() ? 'Pick today or an earlier date.' : null}>
              <Input type="date" max={today()} value={dates.document_date} onChange={(e) => setDates((x) => ({ ...x, document_date: e.target.value }))} />
            </FormField>
            <FormField label="Valid until" hint="Leave blank if it doesn't expire." error={dates.document_date && dates.expires_at && dates.expires_at <= dates.document_date ? 'Must be after the document date.' : null}>
              <Input type="date" value={dates.expires_at} onChange={(e) => setDates((x) => ({ ...x, expires_at: e.target.value }))} />
            </FormField>
          </div>
        )}
      </Modal>
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
