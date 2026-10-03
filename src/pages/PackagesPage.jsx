import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Modal, PageHeader, Skeleton, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import { FundraisingNotice, LoadError } from '../components/capital/bits';
import PlanColumns, { OptionalSupport, PricingFaq } from '../components/billing/PlanColumns';
import CheckoutDialog from '../components/billing/CheckoutDialog';
import useApi from '../lib/useApi';
import { getCatalog, getRecommendation, selectPackage } from '../lib/packages';
import { getPlans, getSubscription } from '../lib/billing';
import { cleanCopy, columnsOf, money, priceLine } from '../lib/pricing';

/**
 * Plans, signed in (D60/D61, D45/D46/D50). The five columns from GET /billing/plans,
 * "Choose" → checkout (CheckoutDialog). Expert / Advisor help stays an optional branch
 * beside the plans: it is never sold through checkout (D50); asking about it records interest only.
 * ?highlight=<id> marks a column (upgrade prompts); ?choose=<id>&price=<key> opens checkout (from /pricing).
 */
export default function PackagesPage() {
  const { company, companyId, entitlementsRaw } = useCompany();
  const [params, setParams] = useSearchParams();
  const highlight = params.get('highlight') || params.get('choose');
  const toast = useToast();
  const plansQ = useApi(() => getPlans(), []);
  const catQ = useApi(() => getCatalog(), []);
  const recQ = useApi(() => getRecommendation(companyId, company?.raise_timing), [companyId]);
  const subQ = useApi(() => (companyId ? getSubscription(companyId) : null), [companyId]);
  const [choosing, setChoosing] = useState(() => (params.get('choose') ? { id: params.get('choose'), price: params.get('price') } : null));
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState({});

  const head = <PageHeader title="Plans" subtitle="Understand where you stand for free. Keep your company ready. Run your raise. Prices in USD." />;
  if (plansQ.error) return <div>{head}<LoadError error={plansQ.error} onRetry={plansQ.reload} what="plans" /></div>;
  if (!plansQ.data) return <div>{head}<Skeleton h="480px" /></div>;

  const data = plansQ.data;
  const cols = columnsOf(data);
  const byId = (id) => cols.find((p) => p.id === id);
  const currentTier = subQ.data?.plan?.ladder_tier || entitlementsRaw?.ladder_tier || 'free';
  const activeIds = new Set((entitlementsRaw?.grants || []).map((g) => g.package_id));
  const isCurrent = (p) => (p.tier && p.tier === currentTier) || (!p.tier && activeIds.has(p.id));
  const credit = subQ.data?.credit || null;
  const rec = recQ.data;
  const star = rec?.recommended_code && byId(rec.recommended_code) ? rec.recommended_code : null;
  const choosingPlan = choosing ? byId(choosing.id) : null;

  const closeCheckout = () => {
    setChoosing(null);
    if (params.has('choose') || params.has('price')) { const p = new URLSearchParams(params); p.delete('choose'); p.delete('price'); setParams(p, { replace: true }); }
  };

  const cta = (plan, price) => {
    if (isCurrent(plan)) return <Badge tone="ok">{plan.tier ? 'Your plan' : 'Bought'}</Badge>;
    if (Number(price?.amount_usd) === 0) return <Badge tone="neutral">Included</Badge>;
    return (
      <Button variant={plan.id === 'capital-raising' ? 'accent' : 'secondary'} block onClick={() => setChoosing({ id: plan.id, price: price.key })}>
        Choose {plan.name}
      </Button>
    );
  };

  // Optional support items (catalog): interest only, never checkout (D50).
  const optional = (catQ.data?.optional_support?.items || []).map((i) => ({ ...i, ...((catQ.data?.packages || []).concat(catQ.data?.add_ons || []).find((p) => p.id === i.id) || {}) }));
  const asked = (p) => requested[p.id] || (entitlementsRaw?.pending || []).some((x) => x.package_id === p.id);
  async function ask() {
    setBusy(true);
    try {
      const out = await selectPackage(companyId, asking.id);
      setRequested((r) => ({ ...r, [asking.id]: true }));
      toast.success(out.already_selected ? `You'd already asked about ${asking.name}.` : `Noted. Nothing is charged.`);
      setAsking(null);
    } catch (e) { toast.error(e.code === 'not_offered' ? `${asking.name} isn't offered yet.` : `Couldn't record it: ${e.message}`); } finally { setBusy(false); }
  }

  return (
    <div className="packages">
      {head}

      {!recQ.error && currentTier === 'free' && star && (rec.reason_lines || []).length > 0 && (
        <Card className="rec-banner" eyebrow={`For ${company?.name || 'you'}`} title={`${byId(star).name} · ${priceLine(byId(star).prices[0])}`}>
          <ul className="plain-list">{rec.reason_lines.slice(0, 2).map((l) => <li key={l}>{l}</li>)}</ul>
        </Card>
      )}

      {credit && currentTier !== 'capital_raising' && (
        <p className="pr-credit-banner" role="status"><strong>{money(credit.amount_usd)} credit available.</strong> It counts toward Capital Raising until {new Date(credit.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
      )}
      {!data.checkout?.enabled && (
        <p className="pr-payments-off" role="status"><strong>Payments open soon.</strong> Your plan isn&apos;t charged yet.</p>
      )}

      <PlanColumns data={data} cta={cta} highlight={highlight} star={currentTier === 'free' ? star : null} isCurrent={isCurrent} />
      {data.fair_use?.footnote && <p className="pr-foot">“Full access / plan limits”: {cleanCopy(data.fair_use.footnote)}</p>}

      <OptionalSupport data={data} action={<Button as={Link} to="/experts" variant="secondary">Find an expert</Button>} />
      {optional.length > 0 && (
        <ul className="branch">
          {optional.map((p) => (
            <li key={p.id} className={p.id === highlight ? 'is-hl' : ''}>
              <div><strong>{p.name}</strong> <span className="ui-muted">{cleanCopy(p.tagline || '')}</span></div>
              <span className="branch-price">{p.status === 'deferred' || p.offered === false ? 'Not available yet' : 'Priced separately'}</span>
              {p.offered !== false && p.status !== 'deferred' && <Button variant="link" size="sm" onClick={() => setAsking(p)} disabled={asked(p)}>{asked(p) ? 'Requested' : 'Ask about it'}</Button>}
            </li>
          ))}
        </ul>
      )}

      <PricingFaq data={data} />
      <FundraisingNotice />

      {choosingPlan && (
        <CheckoutDialog key={`${choosingPlan.id}-${choosing.price}`} open onClose={closeCheckout} plan={choosingPlan} initialPriceKey={choosing.price}
          companyId={companyId} credit={credit} versionLabel={data.price_version_label} />
      )}
      <Modal open={Boolean(asking)} onClose={() => setAsking(null)} size="sm" title={asking?.name || ''}
        description="Optional specialist help is arranged separately, never through checkout. We record that you asked; nothing is charged."
        footer={<><Button variant="ghost" onClick={() => setAsking(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={ask}>Ask about it</Button></>} />
    </div>
  );
}
