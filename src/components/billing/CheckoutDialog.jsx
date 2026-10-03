import { lazy, Suspense, useRef, useState } from 'react';
import { Alert, Button, Icon, Modal } from '../../design/ui';
import { createCheckout, safeRedirect } from '../../lib/billing';
import { billingErrorCopy, cleanCopy, foundingLabel, idempotencyKey, money, priceLine } from '../../lib/pricing';

// Development only: the API's test adapter (BILLING_TEST_ADAPTER=on, refused in production).
// import.meta.env.DEV is false in a production build, so this module is not in the bundle.
const TestCheckout = import.meta.env.DEV ? lazy(() => import('./TestCheckout')) : null;

/**
 * Choose plan → POST /billing/checkout → the provider's page (redirect_url).
 * Payments off (503 payments_not_enabled) is a calm, honest state: nothing is charged,
 * and nothing pretends to succeed. Advisor/consulting items never reach here (D50).
 */
export default function CheckoutDialog({ open, onClose, plan, initialPriceKey, companyId, credit, versionLabel }) {
  const prices = plan?.prices || [];
  const [priceKey, setPriceKey] = useState(initialPriceKey && prices.some((p) => p.key === initialPriceKey) ? initialPriceKey : prices[0]?.key);
  const [state, setState] = useState({ step: 'confirm' });
  const key = useRef(null);
  if (!plan) return null;
  const price = prices.find((p) => p.key === priceKey) || prices[0];
  const creditApplies = plan.id === 'capital-raising' && credit && Number(credit.amount_usd) > 0 && (credit.toward || []).includes('capital-raising');
  const creditUsd = creditApplies ? Math.min(Number(credit.amount_usd), Number(price.amount_usd)) : 0;
  const founding = plan.id === 'capital-raising' ? foundingLabel(plan, versionLabel) : null;

  async function go() {
    setState({ step: 'busy' });
    if (!key.current || key.current.price !== price.key) key.current = { price: price.key, value: idempotencyKey(plan.id, price.key) };
    try {
      const out = await createCheckout({ companyId, productId: plan.id, priceKey: price.key, idempotencyKey: key.current.value });
      const url = safeRedirect(out.redirect_url);
      if (url) { setState({ step: 'redirect' }); window.location.assign(url); return; }
      if (TestCheckout && out.test_complete_path) { setState({ step: 'test', out }); return; }
      setState({ step: 'error', copy: { kind: 'error', title: "The payment page didn't open.", body: 'Nothing has been charged. Please try again in a moment.' } });
    } catch (e) {
      setState({ step: e.code === 'payments_not_enabled' || e.code === 'billing_unavailable' ? 'off' : 'error', copy: billingErrorCopy(e) });
    }
  }

  const close = () => { setState({ step: 'confirm' }); key.current = null; onClose(); };
  const title = state.step === 'off' ? state.copy.title : `${plan.name}`;

  let body;
  let footer;
  if (state.step === 'off') {
    body = (
      <div className="co-off">
        <span className="co-off-ic" aria-hidden="true"><Icon name="info" /></span>
        <div>
          <p className="co-off-lead">{state.copy.body}</p>
          <p className="ui-muted">Your current plan carries on as it is. When payments open, you can choose {plan.name} here.</p>
        </div>
      </div>
    );
    footer = <Button variant="primary" onClick={close}>Close</Button>;
  } else if (state.step === 'test' && TestCheckout) {
    body = <Suspense fallback={null}><TestCheckout out={state.out} onDone={close} /></Suspense>;
    footer = null;
  } else {
    body = (
      <div className="co">
        {prices.length > 1 && (
          <fieldset className="co-opts">
            <legend className="ui-sr">Billing</legend>
            {prices.map((p) => (
              <label key={p.key} className={`co-opt${p.key === price.key ? ' is-on' : ''}`}>
                <input type="radio" name="co-price" value={p.key} checked={p.key === price.key} onChange={() => setPriceKey(p.key)} disabled={state.step === 'busy'} />
                <span className="co-opt-main">{priceLine(p)}</span>
                {p.note && <span className="co-opt-note">{cleanCopy(p.note)}</span>}
              </label>
            ))}
          </fieldset>
        )}
        <dl className="co-sum">
          <div><dt>{plan.name}</dt><dd>{priceLine(price)}</dd></div>
          {creditApplies && <div className="co-credit"><dt>Your Capital Readiness credit</dt><dd>−{money(creditUsd)}</dd></div>}
          {creditApplies && <div className="co-total"><dt>First payment</dt><dd>{money(Math.max(0, Number(price.amount_usd) - creditUsd))}</dd></div>}
        </dl>
        {founding && price.locked_months ? <p className="ui-muted">{founding}.</p> : null}
        {creditApplies && credit.expires_at && <p className="ui-faint">The credit is applied once, at checkout, and is available until {new Date(credit.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
        <p className="ui-muted">You complete payment on our payment provider&apos;s secure page. Prices in USD.</p>
        {state.step === 'error' && <Alert tone={state.copy.kind === 'conflict' ? 'warn' : 'bad'} title={state.copy.title}>{state.copy.body}</Alert>}
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" onClick={close} disabled={state.step === 'busy' || state.step === 'redirect'}>Not now</Button>
        <Button variant="accent" onClick={go} loading={state.step === 'busy' || state.step === 'redirect'} iconRight="arrowRight">Continue to payment</Button>
      </>
    );
  }

  return (
    <Modal open={open} onClose={close} size="sm" title={title} description={state.step === 'confirm' || state.step === 'error' ? cleanCopy(plan.tagline) : undefined} footer={footer}>
      {body}
    </Modal>
  );
}
