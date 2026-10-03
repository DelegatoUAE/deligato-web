import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Modal, PageHeader, Skeleton, Table, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import { FundraisingNotice, LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getCatalog, getRecommendation, selectPackage } from '../lib/packages';
import { fmtPrice } from '../lib/format';
import { displayValue } from '../lib/plan';

// D4/D45: subscription prices are not approved yet, so they read "to be announced".
const priceText = (p) => {
  if (!p) return '';
  if (p.price_usd === 0) return '$0';
  if (p.price_usd == null || p.price_pending) return 'Price to be announced';
  return `${fmtPrice(p.price_usd)}${p.billing === 'monthly' ? ' / mo' : p.billing === 'one_time' ? ' one-time' : ''}`;
};
const COMPARE = ['financial_health_history', 'company_intel_live', 'capital_timing', 'record_full', 'checkin', 'next_best_actions', 'notifications',
  'max_results', 'investor_profile_depth', 'ai_explanations', 'compare_tools', 'pipeline_items', 'crm', 'outreach_drafts_per_month', 'data_room', 'match_refresh'];

/**
 * Plans (packages-web.md W1–W3, D45/D46/D50). The ladder Free → Company
 * Intelligence → Capital Raising, the $54/$99 reports as point-in-time
 * purchases, and "Need specialist help?" as an optional branch beside the
 * ladder, never a level above it. Labels come from the API's `display`.
 */
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

  async function choose() {
    setBusy(true);
    try {
      const out = await selectPackage(companyId, choosing.id);
      setRequested((r) => ({ ...r, [choosing.id]: true }));
      reloadEntitlements();
      toast.success(out.already_selected ? `You'd already asked about ${choosing.name}.` : `Noted your interest in ${choosing.name}. Nothing is charged.`);
      setChoosing(null);
    } catch (e) { toast.error(e.code === 'not_offered' ? `${choosing.name} isn't offered yet.` : `Couldn't record it: ${e.message}`); } finally { setBusy(false); }
  }

  const head = <PageHeader title="Plans" subtitle="Understand where you stand for free. Keep your company ready. Run your raise. Prices in USD." />;
  if (catQ.error) return <div>{head}<LoadError error={catQ.error} onRetry={catQ.reload} what="plans" /></div>;
  if (!catQ.data) return <div>{head}<Skeleton h="400px" /></div>;

  const cat = catQ.data;
  const all = [...(cat.packages || []), ...(cat.add_ons || [])];
  const byId = (id) => all.find((p) => p.id === id);
  const tiers = (cat.tiers || []).map((t) => byId(t.id) || t);
  const reports = ['capital-readiness', 'capital-assessment'].map(byId).filter(Boolean);
  const optional = (cat.optional_support?.items || []).map((i) => ({ ...i, ...(byId(i.id) || {}) }));
  const keys = cat.entitlement_keys || {};
  const rec = recQ.data;
  const star = rec?.recommended_code;
  const currentTier = entitlementsRaw?.ladder_tier;
  const activeIds = new Set((entitlementsRaw?.grants || []).map((g) => g.package_id));
  const isCurrent = (p) => (p.tier && p.tier === currentTier) || activeIds.has(p.id) || (!currentTier && p.id === 'readiness-free');
  const asked = (p) => requested[p.id] || (entitlementsRaw?.pending || []).some((x) => x.package_id === p.id);

  const cta = (p) => {
    if (isCurrent(p)) return <Badge tone="ok">Your plan</Badge>;
    if (p.price_usd === 0) return <Badge tone="neutral">Included</Badge>;
    return <Button variant={p.id === 'capital-raising' ? 'accent' : 'secondary'} size="sm" onClick={() => setChoosing(p)} disabled={asked(p)}>{asked(p) ? 'Interest noted' : p.price_pending || p.price_usd == null ? 'Tell me when it opens' : `Choose ${p.name}`}</Button>;
  };

  return (
    <div className="packages">
      {head}

      {recQ.error || (currentTier && currentTier !== 'free') ? null : !rec ? <Skeleton h="90px" /> : (rec.reason_lines || []).length > 0 && (
        <Card className="rec-banner" eyebrow={`For ${company?.name || 'you'}`} title={`${byId(star)?.name || 'Free'}${star ? ` · ${priceText(byId(star))}` : ''}`}>
          <ul className="plain-list">{rec.reason_lines.slice(0, 2).map((l) => <li key={l}>{l}</li>)}</ul>
          {(rec.also_consider || []).length > 0 && <p className="ui-muted">Also consider: {rec.also_consider.map((id) => byId(id)?.name || id).join(', ')} (price to be announced).</p>}
        </Card>
      )}

      <section aria-labelledby="ladder-h">
        <h2 id="ladder-h" className="sec-h">Plans</h2>
        <div className="ladder">
          {tiers.map((p, i) => (
            <Card key={p.id} className={`ladder-tier${p.id === highlight ? ' is-hl' : ''}${isCurrent(p) ? ' is-current' : ''}`} selected={p.id === highlight}>
              <p className="ladder-step">Step {i + 1}</p>
              <h3>{p.name}{p.id === star && <span className="pkg-star" aria-label="Recommended"> ★</span>}</h3>
              <p className="ladder-tag">{p.tagline}</p>
              <p className="pkg-price">{priceText(p)}</p>
              <ul className="pkg-incl">{(p.includes || []).slice(0, 6).map((x) => <li key={x}>{x}</li>)}</ul>
              <div className="ladder-cta">{cta(p)}</div>
            </Card>
          ))}
        </div>
        <Button variant="link" onClick={() => setCompare((v) => !v)} aria-expanded={compare}>{compare ? 'Hide the comparison' : 'Compare plans in detail'}</Button>
        {compare && (
          <Table dense rowKey="key" columns={[
            { key: 'label', header: 'What you get' },
            ...tiers.map((t) => ({ key: t.id, header: t.name, render: (r) => displayValue(t.display, r.key) })),
          ]} rows={COMPARE.filter((k) => tiers.some((t) => t.display && k in t.display)).map((k) => ({ key: k, label: keys[k]?.label || k }))} />
        )}
      </section>

      {reports.length > 0 && (
        <section aria-labelledby="reports-h">
          <h2 id="reports-h" className="sec-h">One-off reports</h2>
          <div className="ui-grid ui-grid-2">
            {reports.map((p) => (
              <Card key={p.id} className={`pkg${p.id === star ? ' is-star' : ''}${p.id === highlight ? ' is-hl' : ''}`}>
                <div className="pkg-head"><h3>{p.name}{p.id === star && <span className="pkg-star" aria-label="Recommended"> ★</span>}</h3>{activeIds.has(p.id) && <Badge tone="ok">Bought</Badge>}</div>
                <p className="pkg-price">{priceText(p)}</p>
                <p>{p.tagline}</p>
                <ul className="pkg-incl">{(p.includes || []).map((x) => <li key={x}>{x}</li>)}</ul>
                {cta(p)}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="help-h" className="optional-branch">
        <h2 id="help-h" className="sec-h">{cat.optional_support?.label || 'Need specialist help?'} <span className="cc-h-note">Optional. Every plan above works without it.</span></h2>
        {(rec?.specialist_help?.suggestions || []).length > 0 && (
          <p className="ui-muted">For {company?.name}: {rec.specialist_help.suggestions.map((sx) => `${sx.name}${sx.why?.[0] ? `. ${sx.why[0]}` : ''}`).join(' ')}</p>
        )}
        <ul className="branch">
          {optional.map((p) => (
            <li key={p.id} className={p.id === highlight ? 'is-hl' : ''}>
              <div>
                <strong>{p.name}</strong> <span className="ui-muted">{p.tagline || ''}</span>
                {p.review_pending && <span className="ui-faint"> · scope under review</span>}
              </div>
              <span className="branch-price">{p.status === 'deferred' || p.offered === false ? 'Not available yet' : `${priceText(p)}${p.timeline ? ` · ${p.timeline}` : ''}`}</span>
              {p.offered !== false && p.status !== 'deferred' && <Button variant="link" size="sm" onClick={() => setChoosing(p)} disabled={asked(p)}>{asked(p) ? 'Requested' : 'Ask about it'}</Button>}
            </li>
          ))}
        </ul>
      </section>

      <Alert tone="info">No payment is taken in this app. Choosing a plan records your interest; nothing is charged.</Alert>
      <FundraisingNotice />

      <Modal open={Boolean(choosing)} onClose={() => setChoosing(null)} size="sm" title={choosing ? `${choosing.name}${choosing.price_usd ? ` · ${priceText(choosing)}` : ''}` : ''}
        description={choosing?.price_pending || choosing?.price_usd == null ? 'The price is to be announced. We record your interest and tell you when it opens. Nothing is charged.' : 'We record your request and confirm scope with you before any payment. Nothing is charged in this app.'}
        footer={<><Button variant="ghost" onClick={() => setChoosing(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={choose}>Record my interest</Button></>} />
    </div>
  );
}
