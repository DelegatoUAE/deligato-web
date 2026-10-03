import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Modal, PageHeader, Skeleton, Table, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import { FundraisingNotice, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getCatalog, getRecommendation, selectPackage } from '../lib/packages';
import { fmtPrice, fmtDate } from '../lib/format';

const PERIOD = { monthly: ' / mo', one_time: '', free: '' };
const creditText = (c) => {
  if (!c) return null;
  if (typeof c === 'string') return c;
  // Product copy (13 §Acceptance 2): "$99, credited against any package".
  return c.credited_against ? `${c.amount_usd ? `${fmtPrice(c.amount_usd)}, c` : 'C'}redited against any package` : null;
};
const priceText = (p) => (p.price_usd === null || p.price_pending ? 'Price on request' : p.price_usd === 0 ? '$0' : `${fmtPrice(p.price_usd)}${PERIOD[p.billing] || ''}`);

export default function PackagesPage() {
  const { company, companyId, entitlementsRaw, reloadEntitlements } = useCompany();
  const [params] = useSearchParams();
  const highlight = params.get('highlight');
  const toast = useToast();
  const catQ = useApi(() => getCatalog(), []);
  const recQ = useApi(() => getRecommendation(companyId, company?.raise_timing), [companyId]);
  const [choosing, setChoosing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState({});
  const [compare, setCompare] = useState(false);
  const [demo, setDemo] = useState(null);

  async function choose() {
    setBusy(true);
    try {
      const out = await selectPackage(companyId, choosing.id);
      setRequested((r) => ({ ...r, [choosing.id]: out.selection?.created_at || new Date().toISOString() }));
      if (out.demo?.banner || out.selection?.status === 'active') setDemo(out.demo?.banner || 'POC: no payment taken');
      reloadEntitlements();
      toast.success(out.already_selected ? `${choosing.name} was already requested.` : `Requested ${choosing.name}. An advisor will be in touch.`);
      setChoosing(null);
    } catch (e) { toast.error(`Couldn't request it: ${e.message}`); } finally { setBusy(false); }
  }

  const head = <PageHeader title="Packages" subtitle="Help with your raise, at the depth you need. Prices in USD." />;
  if (catQ.error) return <div>{head}<LoadError error={catQ.error} onRetry={catQ.reload} what="packages" /></div>;
  if (!catQ.data) return <div>{head}<Skeleton h="400px" /></div>;

  const pkgs = catQ.data.packages || [];
  const rec = recQ.data;
  const star = rec?.recommended_code;
  const starPkg = pkgs.find((p) => p.id === star);
  const pendingIds = new Set((entitlementsRaw?.pending || []).map((p) => p.package_id));
  const activeIds = new Set((entitlementsRaw?.grants || []).map((g) => g.package_id));
  const entry = pkgs.filter((p) => p.kind === 'entry');
  const full = pkgs.filter((p) => p.kind === 'package');
  const plans = pkgs.filter((p) => p.kind === 'plan');
  const addOns = (catQ.data.add_ons || []).filter((a) => (rec?.add_ons || []).some((x) => x.id === a.id));
  const isRequested = (p) => requested[p.id] || pendingIds.has(p.id) || activeIds.has(p.id);

  const card = (p) => (
    <Card key={p.id} className={`pkg${p.id === star ? ' is-star' : ''}${p.id === highlight ? ' is-hl' : ''}`} selected={p.id === star}>
      <div className="pkg-head">
        <h3>{p.name}{p.id === star && <span className="pkg-star" aria-label="Recommended"> ★</span>}</h3>
        {activeIds.has(p.id) && <Badge tone="ok">Current</Badge>}
      </div>
      <p className="pkg-price">{priceText(p)}{p.timeline ? <span> · {p.timeline}</span> : null}</p>
      {creditText(p.credit_policy) && <p className="ui-muted">{creditText(p.credit_policy)}</p>}
      {p.tagline && <p>{p.tagline}</p>}
      <ul className="pkg-incl">{(p.includes || []).slice(0, 6).map((x) => <li key={x}>{x}</li>)}</ul>
      {p.price_pending ? <Button variant="secondary" size="sm" onClick={() => setChoosing(p)} disabled={isRequested(p)}>{isRequested(p) ? 'Requested' : 'Ask about pricing'}</Button>
        : p.price_usd === 0 ? <Badge tone="neutral">{p.id === 'readiness-free' ? 'Included' : 'Free'}</Badge>
          : <Button variant="secondary" size="sm" onClick={() => setChoosing(p)} disabled={isRequested(p)}>{isRequested(p) ? 'Requested' : `Choose ${p.name}`}</Button>}
    </Card>
  );

  return (
    <div className="packages">
      {head}
      {(demo || activeIds.size > 0) && <Alert tone="warn" title={demo || 'POC: no payment taken'}>The package is active for testing. No payment was taken.</Alert>}
      <Alert tone="info">Proof of concept: no payment is taken in this app. Choosing a package sends a request; an advisor confirms scope and timing with you first.</Alert>
      {recQ.error ? <LoadError error={recQ.error} onRetry={recQ.reload} what="your recommendation" /> : !rec ? <Skeleton h="120px" /> : starPkg ? (
        <Card className="rec-banner" eyebrow={`Recommended for ${company.name}`} title={`${starPkg.name} · ${priceText(starPkg)}${starPkg.timeline ? ` · ${starPkg.timeline}` : ''}`}>
          <ul className="plain-list">{(rec.reason_lines || []).slice(0, 3).map((l) => <li key={l}>{l}</li>)}</ul>
          {(rec.also_consider || []).length > 0 && (
            <p className="ui-muted">Also consider: {rec.also_consider.map((id) => pkgs.find((p) => p.id === id)?.name || id).join(', ')} (price to be confirmed).</p>
          )}
          <Button variant="accent" onClick={() => setChoosing(starPkg)} disabled={isRequested(starPkg)}>{activeIds.has(starPkg.id) ? 'Active (POC, no payment taken)' : isRequested(starPkg) ? `Requested${requested[starPkg.id] ? ` on ${fmtDate(requested[starPkg.id])}` : ''}` : `Choose ${starPkg.name}`}</Button>
        </Card>
      ) : <Alert tone="info">{rec.reason_lines?.[0] || 'Get your free readiness score for a tailored recommendation.'}</Alert>}

      <h2 className="sec-h">Start small</h2>
      <div className="ui-grid ui-grid-3">{entry.map(card)}</div>
      <h2 className="sec-h">Packages</h2>
      <div className="ui-grid ui-grid-3">{full.map(card)}</div>
      {plans.length > 0 && <><h2 className="sec-h">Self-serve matching</h2><div className="ui-grid ui-grid-3">{plans.map(card)}</div></>}
      {addOns.length > 0 && <><h2 className="sec-h">Add-ons for you</h2><div className="ui-grid ui-grid-3">{addOns.map(card)}</div></>}

      <Button variant="link" onClick={() => setCompare((v) => !v)} aria-expanded={compare}>{compare ? 'Hide comparison' : 'Compare everything'}</Button>
      {compare && (
        <Table dense rowKey="id" columns={[
          { key: 'name', header: 'Package' }, { key: 'price', header: 'Price', render: (p) => priceText(p) },
          { key: 'timeline', header: 'Timeline', render: (p) => p.timeline || '–' },
          { key: 'matches', header: 'Matches shown', render: (p) => p.entitlements?.max_results ?? '–' },
          { key: 'crm', header: 'Pipeline', render: (p) => (p.entitlements?.crm ? 'Yes' : 'No') },
          { key: 'drafts', header: 'Drafts / month', render: (p) => p.entitlements?.outreach_drafts_per_month ?? 0 },
        ]} rows={[...entry, ...full, ...plans]} />
      )}

      <Card tone="sunken" title="Will this make sure I raise?">
        <p>No. No one credibly can. We help you with fundraising. We never fundraise for you.</p>
      </Card>
      <FundraisingNotice />

      <Modal open={Boolean(choosing)} onClose={() => setChoosing(null)} size="sm" title={choosing ? `Request ${choosing.name}${choosing.price_usd ? ` (${priceText(choosing)})` : ''}?` : ''}
        description="An advisor will confirm scope and timing with you before any payment. Nothing is charged in this app."
        footer={<><Button variant="ghost" onClick={() => setChoosing(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={choose}>Request this package</Button></>} />
    </div>
  );
}
