// Product analytics events (journey.md §3 B). Fire-and-forget: a failure
// here never affects the screen (D12). If the endpoint rejects product
// events (H12 not landed yet), we stop posting for this session.
import { apiFetch } from './auth';

let disabled = false;

export function logEvent(name, props = {}, companyId = null) {
  if (disabled || !companyId) return;
  apiFetch('/api/v1/learning/events', {
    method: 'POST',
    body: JSON.stringify({ name, company_id: companyId, props, source: 'web' }),
  }).catch((e) => {
    if ([400, 404, 405].includes(e.status)) disabled = true;
  });
}
