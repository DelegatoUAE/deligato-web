import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, ConfirmDialog, Skeleton, Table, useToast } from '../../design/ui';
import useApi from '../../lib/useApi';
import { getPlans, getSubscription, cancelPlan, refundCheckout } from '../../lib/billing';
import { setPocPlan, getCatalog } from '../../lib/packages';
import { tierLabel, displayValue } from '../../lib/plan';
import { billingErrorCopy, bridgeExpiry, checkoutStatusLabel, LIMIT_ROWS, limitLabel, money, planForTier, priceLine, productName, refundable, creditUsedBy } from '../../lib/pricing';
import { fmtDate, humanise } from '../../lib/format';
import './billing.css';

const PLAN_ROWS = ['financial_health_history', 'company_intel_live', 'checkin', 'capital_timing', 'record_full', 'next_best_actions', 'notifications',
  'max_results', 'investor_profile_depth', 'pipeline_items', 'crm', 'outreach_drafts_per_month', 'data_room'];
const POLLS = 10;

/**
 * Settings → Plan and billing (D60/D61): the current plan and its limits, the Company
 * Intelligence bridge, the founding price lock, the Raise Pass, recent checkouts, the
 * step-down after a raise and refunds inside the window. Also the checkout return screens
 * (?checkout=success | cancelled): success is shown only once the API says the payment completed.
 */
export default function PlanBilling({ companyId, entitlementsRaw, reloadEntitlements }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const ret = params.get('checkout');
  const plansQ = useApi(() => getPlans(), []);
  const subQ = useApi(() => (companyId ? getSubscription(companyId) : null), [companyId]);
  const catQ = useApi(() => getCatalog(), []);
  const reloadSub = subQ.reload;
  const [polls, setPolls] = useState(0);
  const [confirm, setConfirm] = useState(null); // { kind: 'cancel' | 'refund', checkout? }
  const [stepTo, setStepTo] = useState('company-intelligence');
  const [busy, setBusy] = useState(false);

  const sub = subQ.data;
  const latest = sub?.checkouts?.[0] || null;
  const confirming = ret === 'success' && sub && latest && latest.status === 'open';

  // After the provider returns, the webhook may land a moment later: re-read a few times, never assume.
  useEffect(() => {
    if (!confirming || polls >= POLLS) return undefined;
    const t = setTimeout(() => { setPolls((n) => n + 1); reloadSub(); }, 3000);
    return () => clearTimeout(t);
  }, [confirming, polls, reloadSub]);

  const completedNow = ret === 'success' && latest?.status === 'completed';
  // Refresh the shell's plan badge once per confirmed checkout (reloadEntitlements is not stable).
  const refreshed = useRef(null);
  const refreshEnts = useRef(reloadEntitlements);
  useEffect(() => { refreshEnts.current = reloadEntitlements; });
  useEffect(() => {
    if (completedNow && refreshed.current !== latest.id) { refreshed.current = latest.id; refreshEnts.current?.(); }
  }, [completedNow, latest]);

  const dismissReturn = () => { const p = new URLSearchParams(params); p.delete('checkout'); setParams(p, { replace: true }); };
  const name = (id) => productName(plansQ.data, id) || humanise(id || '');

  async function doCancel() {
    setBusy(true);
    try {
      const out = await cancelPlan(companyId, sub.subscription.product_id === 'capital-raising' ? stepTo : 'free');
      toast.success(`Scheduled: ${name(out.scheduled?.to) || 'Free'} from ${fmtDate(out.scheduled?.effective_at)}. Your data is kept.`);
      setConfirm(null); subQ.reload(); reloadEntitlements?.();
    } catch (e) { const c = billingErrorCopy(e); toast.error(`${c.title} ${c.body}`.trim()); } finally { setBusy(false); }
  }
  async function doRefund() {
    setBusy(true);
    try {
      const out = await refundCheckout(companyId, confirm.checkout.id);
      toast.success(`Refund of ${money(out.amount_usd)} requested. Your data is kept.`);
      setConfirm(null); subQ.reload(); reloadEntitlements?.();
    } catch (e) { const c = billingErrorCopy(e); toast.error(`${c.title} ${c.body}`.trim()); } finally { setBusy(false); }
  }

  const tier = sub?.plan?.ladder_tier || entitlementsRaw?.ladder_tier || 'free';
  const display = sub?.plan?.display || entitlementsRaw?.display || {};
  const sources = sub?.plan?.sources || entitlementsRaw?.sources || [];
  const scheduled = sub?.plan?.scheduled || entitlementsRaw?.scheduled || [];
  const bridge = bridgeExpiry(sources);
  const tierPlan = planForTier(plansQ.data, tier);
  const s = sub?.subscription || null;
  const lock = sub?.price_lock && sub.price_lock.active ? sub.price_lock : null;
  const paymentsOn = Boolean(sub?.payments?.enabled);

  return (
    <div className="ui-stack bill">
      {ret === 'success' && (
        completedNow ? (
          <Alert tone="ok" title={`Payment confirmed: ${name(latest.product_id)}`} onDismiss={dismissReturn}>
            {latest.credit_usd > 0 ? `Your ${money(latest.credit_usd)} credit was applied. ` : ''}Your plan is active now.
          </Alert>
        ) : !sub ? <Skeleton h="64px" /> : confirming && polls < POLLS ? (
          <Alert tone="info" title="Confirming your payment" onDismiss={dismissReturn}>We&apos;re waiting for the payment provider to confirm. This updates by itself; you don&apos;t need to pay again.</Alert>
        ) : (
          <Alert tone="warn" title="We haven't received a confirmation yet" onDismiss={dismissReturn}>
            Your plan changes only when the payment provider confirms. Nothing more is needed from you; check back here shortly. If you were charged and nothing changes, contact us.
          </Alert>
        )
      )}
      {ret === 'cancelled' && (
        <Alert tone="info" title="Checkout cancelled" onDismiss={dismissReturn} action={<Button as={Link} to="/packages" variant="secondary" size="sm">Back to plans</Button>}>
          Nothing was charged and your plan hasn&apos;t changed.
        </Alert>
      )}

      <Card title="Your plan" action={<Badge tone="brand">{tierLabel(tier) || 'Free'}</Badge>}>
        <p className="ui-muted">Free → Company Intelligence → Capital Raising. Capital Raising includes everything in Company Intelligence.</p>
        {bridge && tier === 'company_intelligence' && !s && (
          <p className="bill-note"><strong>Company Intelligence included until {fmtDate(bridge)}</strong> with your Capital Readiness report. Your report stays yours after that.</p>
        )}
        {scheduled.map((x) => (
          <p key={x.package_id + x.starts_at} className="bill-note">{name(x.package_id)} starts on {fmtDate(x.starts_at)}.</p>
        ))}
        {tierPlan?.limits && (
          <dl className="bill-limits">
            {LIMIT_ROWS.filter(([k]) => k in tierPlan.limits).map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{limitLabel(tierPlan.limits[k])}</dd></div>)}
          </dl>
        )}
        {Object.keys(display).length > 0 ? (
          <details className="bill-more">
            <summary>Everything in your plan</summary>
            <ul className="plan-ladder plan-rows">
              {PLAN_ROWS.filter((k) => k in display).map((k) => (
                <li key={k}><span>{catQ.data?.entitlement_keys?.[k]?.label || humanise(k)}</span><span className="ui-muted">{displayValue(display, k)}{k === 'data_room' && /shar/i.test(display[k] || '') ? ' (sharing opens with the Living Deal Room)' : ''}</span></li>
              ))}
            </ul>
          </details>
        ) : !sub && !subQ.error ? <Skeleton variant="text" lines={3} /> : null}
        {entitlementsRaw?.data_consent && <p className="ui-faint">Your plan never implies consent to use your data. Data permissions are set separately under Privacy and data.</p>}
        <div className="ui-row"><Button as={Link} to="/packages" variant={tier === 'capital_raising' ? 'secondary' : 'accent'}>{tier === 'capital_raising' ? 'See plans' : 'Compare plans'}</Button></div>
      </Card>

      {subQ.error ? (
        <Card title="Billing"><Alert tone="warn">{billingErrorCopy(subQ.error).title} {billingErrorCopy(subQ.error).body}</Alert></Card>
      ) : !sub ? <Card title="Billing"><Skeleton variant="text" lines={3} /></Card> : (
        <>
          {!paymentsOn && (
            <Card title="Billing">
              <p><strong>Payments open soon.</strong> Your plan isn&apos;t charged yet, and no card details are held.</p>
            </Card>
          )}
          {sub.billing && sub.billing.available === false && (
            <Alert tone="info">Billing records aren&apos;t switched on in this environment yet. Nothing has been charged.</Alert>
          )}

          {s && (
            <Card title="Subscription" action={<Badge tone={s.status === 'active' ? 'ok' : 'warn'}>{s.status === 'cancel_at_period_end' || s.step_down_to ? 'Change scheduled' : humanise(s.status)}</Badge>}>
              <dl className="facts">
                <div><dt>Plan</dt><dd>{name(s.product_id)}</dd></div>
                <div><dt>Price</dt><dd>{priceLine({ amount_usd: s.amount_usd, billing: s.billing })}</dd></div>
                {s.current_period_end && <div><dt>{s.step_down_to || s.status === 'cancel_at_period_end' ? 'Ends' : 'Renews'}</dt><dd>{fmtDate(s.current_period_end)}</dd></div>}
                {s.step_down_to && <div><dt>Then</dt><dd>{name(s.step_down_to)}, your data kept</dd></div>}
              </dl>
              {lock && <p className="bill-note"><Badge tone="gold" size="sm">Founding price</Badge> Locked until {fmtDate(lock.until)}.</p>}
              {!s.step_down_to && s.status === 'active' && (
                <div className="ui-row">
                  <Button variant="secondary" onClick={() => { setStepTo('company-intelligence'); setConfirm({ kind: 'cancel' }); }}>
                    {s.product_id === 'capital-raising' ? 'End my raise' : 'Cancel subscription'}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {sub.raise_pass && (
            <Card title="Raise Pass">
              <p>Your Raise Pass runs until <strong>{fmtDate(sub.raise_pass.ends_at)}</strong> and ends on its own. There is no renewal.</p>
              {lock && <p className="bill-note"><Badge tone="gold" size="sm">Founding price</Badge> Locked until {fmtDate(lock.until)}.</p>}
              <p className="ui-muted">To keep Company Intelligence after the pass, choose it on the plans page; it starts when the pass ends.</p>
            </Card>
          )}

          {!s && !sub.raise_pass && lock && (
            <Card title="Founding price"><p>Your founding Capital Raising price is locked until <strong>{fmtDate(lock.until)}</strong>.</p></Card>
          )}

          {sub.credit && (
            <Card title="Your credit">
              <p><strong>{money(sub.credit.amount_usd)}</strong> counts toward Capital Raising if you upgrade by {fmtDate(sub.credit.expires_at)}. It is applied once, at checkout.</p>
              <div className="ui-row"><Button as={Link} to="/packages?highlight=capital-raising" variant="secondary" size="sm">See Capital Raising</Button></div>
            </Card>
          )}

          {(sub.checkouts || []).length > 0 && (
            <Card title="Recent checkouts" subtitle={plansQ.data?.refund?.days ? `First payments can be refunded within ${plansQ.data.refund.days} days.` : undefined}>
              <Table dense rowKey="id" rows={sub.checkouts}
                columns={[
                  { key: 'when', header: 'Date', render: (c) => fmtDate(c.completed_at || c.starts_at) || '–' },
                  { key: 'product', header: 'Plan', render: (c) => name(c.product_id) },
                  { key: 'price', header: 'Price', render: (c) => priceLine({ amount_usd: c.amount_usd, billing: c.billing }) },
                  { key: 'charge', header: 'Paid', render: (c) => (c.status === 'completed' || c.status === 'refunded' ? `${money(c.charge_usd)}${c.credit_usd > 0 ? ` (${money(c.credit_usd)} credit)` : ''}` : '–') },
                  { key: 'status', header: 'Status', render: (c) => <Badge tone={c.status === 'completed' ? 'ok' : c.status === 'refunded' ? 'info' : 'outline'} size="sm">{checkoutStatusLabel(c.status)}</Badge> },
                  { key: 'act', header: '', render: (c) => (refundable(c) && !creditUsedBy(c, sub.checkouts) ? <Button variant="link" size="sm" onClick={() => setConfirm({ kind: 'refund', checkout: c })}>Request refund</Button> : null) },
                ]} />
            </Card>
          )}
        </>
      )}

      <PocSwitch companyId={companyId} entitlementsRaw={entitlementsRaw} reloadEntitlements={reloadEntitlements} />

      <ConfirmDialog open={confirm?.kind === 'cancel'} tone="primary" busy={busy} onCancel={() => setConfirm(null)} onConfirm={doCancel}
        title={s?.product_id === 'capital-raising' ? 'End your raise?' : 'Cancel your subscription?'}
        confirmLabel={s?.product_id === 'capital-raising' ? `Step down to ${stepTo === 'free' ? 'Free' : 'Company Intelligence'}` : 'Cancel at period end'}
        body={s ? (
          <span className="bill-confirm">
            <span>{name(s.product_id)} stays on until {fmtDate(s.current_period_end) || 'the end of this period'}. Nothing is deleted.</span>
            {s.product_id === 'capital-raising' && (
              <span className="bill-step" role="radiogroup" aria-label="Then">
                <label><input type="radio" name="stepdown" checked={stepTo === 'company-intelligence'} onChange={() => setStepTo('company-intelligence')} /> Then Company Intelligence{tierCi(plansQ.data)}</label>
                <label><input type="radio" name="stepdown" checked={stepTo === 'free'} onChange={() => setStepTo('free')} /> Then Free</label>
              </span>
            )}
          </span>
        ) : null} />
      <ConfirmDialog open={confirm?.kind === 'refund'} tone="danger" busy={busy} onCancel={() => setConfirm(null)} onConfirm={doRefund}
        title="Request a refund?" confirmLabel="Refund this payment"
        body={confirm?.checkout ? `${money(confirm.checkout.charge_usd)} for ${name(confirm.checkout.product_id)} is refunded and that plan ends now. Your data is kept.` : ''} />
    </div>
  );
}

const tierCi = (data) => { const ci = planForTier(data, 'company_intelligence'); return ci?.prices?.[0] ? ` (${priceLine(ci.prices[0])})` : ''; };

/** The packages POC switch, unchanged: development only, refused by the server unless its flag is on. */
function PocSwitch({ companyId, entitlementsRaw, reloadEntitlements }) {
  const on = import.meta.env.DEV && import.meta.env.VITE_POC_PLAN_SWITCH === 'true';
  if (!on) return null;
  return <PocSwitchInner companyId={companyId} entitlementsRaw={entitlementsRaw} reloadEntitlements={reloadEntitlements} />;
}

function PocSwitchInner({ companyId, entitlementsRaw, reloadEntitlements }) {
  const toast = useToast();
  const [choice, setChoice] = useState(entitlementsRaw?.capital_plan || 'trial');
  const [busy, setBusy] = useState(false);
  async function apply() {
    setBusy(true);
    try { await setPocPlan(companyId, choice); reloadEntitlements(); toast.success('Plan switched for testing. No payment taken.'); } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }
  return (
    <Card title="Test plan switch (development only)" subtitle="No payment is taken. The server refuses this unless its POC flag is on.">
      <div className="ui-row">
        {[['trial', 'Free'], ['concierge', 'Capital Raising']].map(([p, l]) => <label key={p} className="check"><input type="radio" name="poc" checked={choice === p} onChange={() => setChoice(p)} /> {l}</label>)}
        <Button variant="primary" size="sm" onClick={apply} loading={busy}>Apply</Button>
      </div>
    </Card>
  );
}
