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

export const cancelPlan = (companyId, stepDownTo = 'company-intelligence') =>
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
