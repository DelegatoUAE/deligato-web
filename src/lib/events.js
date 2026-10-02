// Product analytics events (journey.md §3 B). Fire-and-forget: a failure
// here never affects the screen (D12). Without analytics consent the API
// answers 202 and records nothing; we stop only if the endpoint is gone.
import { apiFetch } from './auth';

let disabled = false;

export function logEvent(name, props = {}, companyId = null) {
  if (disabled || !companyId) return;
  apiFetch('/api/v1/learning/events', {
    method: 'POST',
    body: JSON.stringify({ name, company_id: companyId, props, source: 'web' }),
  }).catch((e) => {
    // 202 (no analytics consent) is a success; stop only if the endpoint is gone.
    if ([404, 405].includes(e.status)) disabled = true;
  });
}
