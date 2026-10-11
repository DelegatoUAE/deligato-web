import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, ConfirmDialog, EmptyState, FormField, Icon, Input, Modal, PageHeader, ProgressBar, SkeletonCards, Tabs, Textarea, Tooltip, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getDataRoom, setDataRoomItemStatus, deleteDataRoomDoc, updateDataRoomDoc, uploadDataRoomFile, replaceDataRoomFile, getDataRoomFileUrl } from '../lib/fundraising';
import { showsMissingActions, acceptFor, checkFile, expiryState, fmtBytes, typeLabel, typesSentence, usageLine, viewsInline, DEFAULT_EXTENSIONS } from '../lib/dataroomFiles';
import { gateFor, nextPlanFor, upgradeHref } from '../lib/plan';
import { isMissingEndpoint } from '../lib/auth';
import { fmtDate } from '../lib/format';

const STATUS = {
  missing: { label: 'Missing', tone: 'neutral' }, draft: { label: 'Draft', tone: 'neutral' }, uploaded: { label: 'Added', tone: 'ok' },
  ready: { label: 'Ready', tone: 'ok' }, expired: { label: 'Out of date', tone: 'warn' }, self_declared: { label: 'I have this · self-declared', tone: 'info' },
  not_applicable: { label: 'Not applicable', tone: 'outline' },
};

const today = () => new Date().toISOString().slice(0, 10);
/** The completing record of an item (a file, or the "I have this" row): the one whose dates count. */
const holderOf = (i) => (i.documents || []).find((d) => ['uploaded', 'ready', 'self_declared'].includes(d.status)) || null;
/** Display only: the Company Record engine decides expiry for the meter (company-record.md §6). */
const expiryOf = (d) => expiryState(d?.expires_at);
function ExpiryBadge({ doc }) {
  const x = expiryOf(doc);
  if (x?.state === 'expired') return <Badge tone="bad" size="sm">Expired: counts as missing</Badge>;
  if (x?.state === 'expiring') return <Badge tone="warn" size="sm">{`Expires in ${x.days} ${x.days === 1 ? 'day' : 'days'}`}</Badge>;
  return null;
}

/** One stored file: name, type, size, uploaded date, version, its own dates, and its actions. */
function StoredDoc({ d, canWrite, busy, onOpen, onReplace, onEdit, onDelete }) {
  const x = expiryOf(d);
  return (
    <div className={`dr-file${x?.state === 'expired' ? ' is-expired' : x?.state === 'expiring' ? ' is-expiring' : ''}`}>
      <Icon name="file" />
      <div className="dr-file-main">
        <span className="dr-file-name">{d.file_name}</span>
        <span className="dr-file-meta">
          {[typeLabel(d), fmtBytes(d.size_bytes), `Uploaded ${fmtDate(d.updated_at || d.created_at)}`, d.version > 1 ? `Version ${d.version}` : null].filter(Boolean).join(' · ')}
        </span>
        {(d.document_date || d.expires_at) && (
          <span className="dr-dates">
            {d.document_date ? `Dated ${fmtDate(d.document_date)}` : ''}{d.document_date && d.expires_at ? ' · ' : ''}{d.expires_at ? `Valid until ${fmtDate(d.expires_at)}` : ''}
            <ExpiryBadge doc={d} />
          </span>
        )}
      </div>
      <div className="dr-file-actions">
        {viewsInline(d) && <Button size="sm" variant="secondary" onClick={() => onOpen(d, false)} loading={busy === `view-${d.id}`}>View</Button>}
        <Button size="sm" variant={viewsInline(d) ? 'ghost' : 'secondary'} iconLeft="download" onClick={() => onOpen(d, true)} loading={busy === `dl-${d.id}`}>Download</Button>
        {canWrite && <Button size="sm" variant="ghost" onClick={() => onReplace(d)} loading={busy === `rep-${d.id}`}>Replace</Button>}
        <Button size="sm" variant="ghost" iconLeft="edit" onClick={() => onEdit(d)}>Details</Button>
        <Button size="sm" variant="link" onClick={() => onDelete(d)}>Delete</Button>
      </div>
    </div>
  );
}

/** Data room (09-data-room.md). mode="documents" is the Company › Documents view of the same items. */
export default function DataRoomPage({ mode = 'dataroom' }) {
  const { companyId, company, entitlements, entitlementsRaw, reloadDataRoom } = useCompany();
  const toast = useToast();
  const q = useApi(() => getDataRoom(companyId), [companyId]);
  const [tab, setTab] = useState(null);
  const [busy, setBusy] = useState(null);
  const [na, setNa] = useState(null);
  const [naReason, setNaReason] = useState('');
  const [del, setDel] = useState(null);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  // U-1: { item, file, document_date, expires_at } / { doc, item, file }
  const [upload, setUpload] = useState(null);
  const [replace, setReplace] = useState(null);
  // D55 Prepare: "I have this" and date edits carry the document's dates (api faf5732).
  const [dates, setDates] = useState(null); // { item, doc?, document_date, expires_at }
  const canUpload = ['uploads', 'uploads_and_sharing'].includes(entitlements?.data_room);
  // D73: storage per plan from the API's limits (Capital Intelligence 2 GB, Capital Raising 10 GB). Capital
  // Intelligence uploads open with RC3 phase 4a, so until then its storage is shown as coming, never as live.
  const storageGb = Number(entitlementsRaw?.limits?.deal_room_storage_gb) || 0;
  const tier = entitlementsRaw?.ladder_tier || 'free';
  const nextPlan = nextPlanFor(tier) || 'capital-raising';
  const planLine = canUpload ? ''
    : storageGb > 0 ? ` Your plan includes ${storageGb} GB of private document storage (opens in a later release).`
      : ' Private document storage is part of Capital Intelligence and Capital Raising.';
  // The plan allows uploads, but the API says whether private storage is
  // connected. Only 'available' means a file can honestly be stored; anything
  // else ('unavailable', or an older API's 'metadata_only') keeps the honest
  // disabled state: a paying customer sees why, not a button that fails.
  const storageLive = q.data?.storage === 'available';
  const fileInfo = q.data?.files || {};
  const exts = fileInfo.allowed_extensions || DEFAULT_EXTENSIONS;
  const maxBytes = fileInfo.max_file_bytes || 25 * 1024 * 1024;
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
      toast.error(e.upgradeRequired ? gateFor(e).message : e.message);
    } finally { setBusy(null); }
  }
  // Upload: only reachable when the API reports storage 'available'. The API
  // re-checks plan, type (by content), size and quota, and builds the path.
  const openUpload = (item) => setUpload({ item, file: null, document_date: '', expires_at: '' });
  function onPicked(e, set) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) set((x) => (x ? { ...x, file: f } : x));
  }
  function submitUpload() {
    const u = upload; setUpload(null);
    act(`up-${u.item.key}`, () => uploadDataRoomFile(companyId, u.item.key, u.file, { document_date: u.document_date || undefined, expires_at: u.expires_at || undefined, title: u.item.label }), `${u.file.name} uploaded.`);
  }
  function submitReplace() {
    const r = replace; setReplace(null);
    act(`rep-${r.doc.id}`, () => replaceDataRoomFile(companyId, r.doc.id, r.file), `${r.file.name} is now the current version.`);
  }
  // View / download: a 60-second signed URL, used at once and never kept.
  async function openDoc(d, download) {
    const label = `${download ? 'dl' : 'view'}-${d.id}`;
    const w = download ? null : window.open('', '_blank');
    setBusy(label);
    try {
      const { url } = await getDataRoomFileUrl(companyId, d.id, { download });
      if (w) { w.opener = null; w.location.href = url; } else {
        const a = document.createElement('a');
        a.href = url; a.rel = 'noopener'; a.target = download ? '_self' : '_blank';
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e) { w?.close(); toast.error(e.message); } finally { setBusy(null); }
  }
  const uploadError = upload?.file ? checkFile(upload.file, { exts, maxBytes }) : null;
  const replaceError = replace?.file ? checkFile(replace.file, { exts, maxBytes }) : null;
  const badDates = (d) => Boolean(d?.document_date && d.document_date > today()) || Boolean(d?.document_date && d?.expires_at && d.expires_at <= d.document_date);

  const items = docsMode ? cats.flatMap((c) => c.items).filter((i) => (i.documents || []).length) : cat?.items || [];

  return (
    <div className="dataroom">
      {head}
      {!docsMode && (
        <p className="dr-mode"><Badge tone="brand">Prepare</Badge> Get every document your stage needs in place and in date. Tick <em>I have this</em> with the document's date and expiry, and we flag it before it goes stale.{planLine}</p>
      )}
      <Alert tone="info">Files stay private to your company. Nothing is shared with investors from here.{!storageLive ? <> File storage is being connected{canUpload ? ', and your plan includes uploads once it is' : ''}. Until then, tick <em>I have this</em> with the document's date and expiry, and we keep track of it.</> : canUpload ? <> {typesSentence(exts)}, up to {fmtBytes(maxBytes)} each.{usageLine(fileInfo) ? ` ${usageLine(fileInfo)}.` : ''}</> : null}</Alert>
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
                    if (!h || h.stored || (!h.document_date && !h.expires_at)) return null;
                    return (
                      <span className="dr-dates">
                        {h.document_date ? `Dated ${fmtDate(h.document_date)}` : ''}{h.document_date && h.expires_at ? ' · ' : ''}{h.expires_at ? `Valid until ${fmtDate(h.expires_at)}` : ''}
                        <ExpiryBadge doc={h} />
                      </span>
                    );
                  })()}
                  {(i.documents || []).filter((d) => d.stored).map((d) => (
                    <StoredDoc key={d.id} d={d} busy={busy} canWrite={canUpload && storageLive}
                      onOpen={openDoc}
                      onReplace={(doc) => setReplace({ doc, item: i, file: null })}
                      onEdit={(doc) => setDates({ item: i, doc, name: doc.file_name, document_date: doc.document_date ? String(doc.document_date).slice(0, 10) : '', expires_at: doc.expires_at ? String(doc.expires_at).slice(0, 10) : '' })}
                      onDelete={setDel} />
                  ))}
                  {(i.documents || []).filter((d) => d.file_name && !d.stored).map((d) => (
                    <span key={d.id} className="dr-doc">{d.file_name} · {fmtDate(d.created_at)}
                      <Button variant="link" size="sm" onClick={() => setDel(d)}>Delete</Button></span>
                  ))}
                </div>
                <div className="dr-actions">
                  <Badge tone={st.tone} size="sm">{st.label}</Badge>
                  {i.done && i.status !== 'not_applicable' && canUpload && storageLive && !(i.documents || []).some((d) => d.stored) && (
                    <Button size="sm" variant="ghost" iconLeft="plus" onClick={() => openUpload(i)} loading={busy === `up-${i.key}`}>Add file</Button>
                  )}
                  {showsMissingActions(i) && (
                    <>
                      {!canUpload
                        ? <Button size="sm" variant="ghost" iconLeft="lock" as={Link} to={storageGb > 0 ? '/settings/plan' : upgradeHref(nextPlan)} title={storageGb > 0 ? 'Uploads on your plan open soon' : 'Private document storage is part of the paid plans'}>Add file</Button>
                        : storageLive
                          ? <Button size="sm" variant="secondary" onClick={() => openUpload(i)} loading={busy === `up-${i.key}`}>Add file</Button>
                          : <Tooltip text="File storage is being connected. Until then, tick I have this with the document's date."><span><Button size="sm" variant="ghost" disabled>Add file</Button></span></Tooltip>}
                      <Button size="sm" variant="ghost" onClick={() => setDates({ item: i, doc: null, document_date: '', expires_at: '' })} loading={busy === `sd-${i.key}`}>I have this</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setNa(i); setNaReason(''); }}>Not applicable</Button>
                    </>
                  )}
                  {i.done && holderOf(i) && !holderOf(i).stored && <Button size="sm" variant="link" onClick={() => { const h = holderOf(i); setDates({ item: i, doc: h, document_date: h.document_date ? String(h.document_date).slice(0, 10) : '', expires_at: h.expires_at ? String(h.expires_at).slice(0, 10) : '' }); }}>Dates</Button>}
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
            <p className="dealroom-t">Investor guest access: coming later</p>
            <p className="ui-muted">A secure room for each investor you invite: you choose who sees what, until when, and you can revoke access at any time. {tier === 'free' ? 'It will be part of Capital Intelligence and Capital Raising when it opens.' : "It will be part of your plan when it opens."}</p>
          </div>
          {tier === 'free' && <Button as={Link} to={upgradeHref(nextPlan)} variant="link" size="sm">See plans</Button>}
        </section>
      )}
      <Modal open={Boolean(dates)} onClose={() => setDates(null)} size="sm" title={dates?.doc?.stored ? `Details for ${dates?.item?.label}` : dates?.doc ? `Dates for ${dates?.item?.label}` : `You have ${dates?.item?.label ? dates.item.label.toLowerCase() : 'this'}`}
        description="Both dates are optional. With an expiry date we flag the document 30 days before it goes out of date."
        footer={<><Button variant="ghost" onClick={() => setDates(null)}>Cancel</Button><Button variant="primary"
          disabled={badDates(dates) || (dates?.doc?.stored && !String(dates?.name || '').trim())}
          onClick={() => {
            const d = dates; setDates(null);
            const body = { document_date: d.document_date || null, expires_at: d.expires_at || null, ...(d.doc?.stored && d.name !== d.doc.file_name ? { file_name: d.name.trim() } : {}) };
            if (d.doc) act(`dt-${d.item.key}`, () => updateDataRoomDoc(companyId, d.doc.id, body), d.doc.stored ? 'Details saved.' : 'Dates saved.');
            else act(`sd-${d.item.key}`, () => setDataRoomItemStatus(companyId, d.item.key, { status: 'self_declared', ...(d.document_date ? { document_date: d.document_date } : {}), ...(d.expires_at ? { expires_at: d.expires_at } : {}) }), 'Marked as ready.');
          }}>{dates?.doc?.stored ? 'Save details' : dates?.doc ? 'Save dates' : 'I have this'}</Button></>}>
        {dates && (
          <div className="ui-form ui-form-2">
            {dates.doc?.stored && (
              <FormField label="Name" wide hint={`${typeLabel(dates.doc)} · ${fmtBytes(dates.doc.size_bytes)} · uploaded ${fmtDate(dates.doc.updated_at || dates.doc.created_at)}`}>
                <Input value={dates.name} maxLength={255} onChange={(e) => setDates((x) => ({ ...x, name: e.target.value }))} />
              </FormField>
            )}
            <FormField label="Date on the document" hint="Not in the future." error={dates.document_date > today() ? 'Pick today or an earlier date.' : null}>
              <Input type="date" max={today()} value={dates.document_date} onChange={(e) => setDates((x) => ({ ...x, document_date: e.target.value }))} />
            </FormField>
            <FormField label="Valid until" hint="Leave blank if it doesn't expire." error={dates.document_date && dates.expires_at && dates.expires_at <= dates.document_date ? 'Must be after the document date.' : null}>
              <Input type="date" value={dates.expires_at} onChange={(e) => setDates((x) => ({ ...x, expires_at: e.target.value }))} />
            </FormField>
          </div>
        )}
      </Modal>
      <input ref={fileRef} type="file" hidden onChange={(e) => onPicked(e, setUpload)} accept={acceptFor(exts)} />
      <input ref={replaceRef} type="file" hidden onChange={(e) => onPicked(e, setReplace)} accept={acceptFor(exts)} />
      <Modal open={Boolean(upload)} onClose={() => setUpload(null)} size="sm" title={`Add ${upload?.item?.label ? upload.item.label.toLowerCase() : 'a file'}`}
        description={`${typesSentence(exts)}, up to ${fmtBytes(maxBytes)}. Stored privately for your company; nothing is shared with investors.`}
        footer={<><Button variant="ghost" onClick={() => setUpload(null)}>Cancel</Button>
          <Button variant="primary" disabled={!upload?.file || Boolean(uploadError) || badDates(upload)} onClick={submitUpload}>Upload</Button></>}>
        {upload && (
          <div className="ui-form ui-form-2">
            <FormField label="File" wide error={uploadError}>
              {(id) => (
                <div className="dr-pick" id={id}>
                  <Button size="sm" variant="secondary" iconLeft="file" onClick={() => fileRef.current?.click()}>{upload.file ? 'Choose another file' : 'Choose file'}</Button>
                  <span className="ui-muted">{upload.file ? `${upload.file.name} · ${fmtBytes(upload.file.size)}` : 'No file chosen'}</span>
                </div>
              )}
            </FormField>
            <FormField label="Date on the document" optional error={upload.document_date > today() ? 'Pick today or an earlier date.' : null}>
              <Input type="date" max={today()} value={upload.document_date} onChange={(e) => setUpload((x) => ({ ...x, document_date: e.target.value }))} />
            </FormField>
            <FormField label="Valid until" optional hint="We flag it 30 days before." error={upload.document_date && upload.expires_at && upload.expires_at <= upload.document_date ? 'Must be after the document date.' : null}>
              <Input type="date" value={upload.expires_at} onChange={(e) => setUpload((x) => ({ ...x, expires_at: e.target.value }))} />
            </FormField>
          </div>
        )}
      </Modal>
      <Modal open={Boolean(replace)} onClose={() => setReplace(null)} size="sm" title={`Replace ${replace?.doc?.file_name || 'this file'}`}
        description="The new file becomes the current version. The previous file is deleted from storage; its name, size and date stay in the activity log. Your document dates are kept."
        footer={<><Button variant="ghost" onClick={() => setReplace(null)}>Cancel</Button>
          <Button variant="primary" disabled={!replace?.file || Boolean(replaceError)} onClick={submitReplace}>Replace file</Button></>}>
        {replace && (
          <FormField label="New file" error={replaceError}>
            {(id) => (
              <div className="dr-pick" id={id}>
                <Button size="sm" variant="secondary" iconLeft="file" onClick={() => replaceRef.current?.click()}>{replace.file ? 'Choose another file' : 'Choose file'}</Button>
                <span className="ui-muted">{replace.file ? `${replace.file.name} · ${fmtBytes(replace.file.size)}` : `Current: version ${replace.doc.version || 1}, ${fmtBytes(replace.doc.size_bytes)}`}</span>
              </div>
            )}
          </FormField>
        )}
      </Modal>
      <Modal open={Boolean(na)} onClose={() => setNa(null)} size="sm" title="Why doesn't this apply?" description={na?.label}
        footer={<><Button variant="ghost" onClick={() => setNa(null)}>Cancel</Button><Button variant="primary" disabled={naReason.trim().length < 5 || naReason.length > 200}
          onClick={() => { const it = na; setNa(null); act(`na-${it.key}`, () => setDataRoomItemStatus(companyId, it.key, { status: 'not_applicable', reason: naReason.trim() }), 'Marked not applicable.'); }}>Mark not applicable</Button></>}>
        <FormField label="Reason" hint="5 to 200 characters."><Textarea rows={3} value={naReason} onChange={(e) => setNaReason(e.target.value)} /></FormField>
      </Modal>
      <ConfirmDialog open={Boolean(del)} title={`Delete ${del?.file_name || 'this document'}?`} body={del?.stored ? "The file is deleted from private storage and removed from your data room. This can't be undone." : "This can't be undone. The checklist item goes back to missing."} confirmLabel="Delete document"
        busy={busy === 'del'} onConfirm={() => { const d = del; setDel(null); act('del', () => deleteDataRoomDoc(companyId, d.id), 'Deleted.'); }} onCancel={() => setDel(null)} />
    </div>
  );
}
