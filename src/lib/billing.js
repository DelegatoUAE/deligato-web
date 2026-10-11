// Billing (api/modules/billing, mounted at /api/v1/billing; contract: BUILD/release/hardening/day-3.md §6).
// Payments are off until Stripe, legal sign-off and data consent are ready: checkout, cancel and
// refund then answer 503 payments_not_enabled and nothing is charged. This file never fakes a payment.
import { apiFetch } from './auth';

export const getPlans = () => apiFetch('/api/v1/billing/plans');

export const createCheckout = ({ companyId, productId, priceKey, idempotencyKey }) =>
  apiFetch('/api/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, product_id: productId, price_key: priceKey, idempotency_key: idempotencyKey }),
  });

export const getSubscription = (companyId) => apiFetch(`/api/v1/billing/subscription?company_id=${encodeURIComponent(companyId)}`);

// RC3 phase 3: a Capital Raising subscription steps down to Capital Intelligence (the api still accepts the
// pre-RC3 'company-intelligence' and reads it as the same plan).
export const cancelPlan = (companyId, stepDownTo = 'capital-intelligence') =>
  apiFetch('/api/v1/billing/cancel', { method: 'POST', body: JSON.stringify({ company_id: companyId, step_down_to: stepDownTo }) });

export const refundCheckout = (companyId, checkoutId) =>
  apiFetch('/api/v1/billing/refund', { method: 'POST', body: JSON.stringify({ company_id: companyId, checkout_id: checkoutId }) });

/** Only an https provider page (or this app's own origin) is followed after checkout. */
export function safeRedirect(url, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  if (typeof url !== 'string' || !url) return null;
  try {
    const u = new URL(url, origin || undefined);
    if (u.protocol === 'https:' || (origin && u.origin === origin)) return u.toString();
  } catch { /* not a URL */ }
  return null;
}

// D73 expert time in the plan (RC3 phase 3: the api's advisory ledger, through Expert Access).
export const getAdvisory = (companyId) => apiFetch(`/api/v1/experts/advisory?company_id=${encodeURIComponent(companyId)}`);

/** Book expert time from the plan's yearly allowance: the minutes are reserved; an advisor confirms a time. */
export const bookPlanExpertTime = ({ companyId, minutes, topic, note }) =>
  apiFetch('/api/v1/experts/requests', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, kind: 'expert_help', advisory_minutes: minutes, topic, note }),
  });
