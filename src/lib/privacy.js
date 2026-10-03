// Privacy module (/api/v1/privacy): consent, AI log, export, delete.
import { apiFetch } from './auth';

export const getConsentTexts = () => apiFetch('/api/v1/privacy/consent-texts');
export const getConsents = (companyId) => apiFetch(`/api/v1/privacy/consents${companyId ? `?company_id=${encodeURIComponent(companyId)}` : ''}`);
export const grantConsent = (scope, version, companyId) =>
  apiFetch('/api/v1/privacy/consents', { method: 'POST', body: JSON.stringify({ scope, version, company_id: companyId, source: 'app' }) });
export const revokeConsent = (scope, companyId) =>
  apiFetch(`/api/v1/privacy/consents/${encodeURIComponent(scope)}${companyId ? `?company_id=${encodeURIComponent(companyId)}` : ''}`, { method: 'DELETE' });
export const getAiLog = (limit = 50) => apiFetch(`/api/v1/privacy/ai-log?limit=${limit}`);
export const exportMyData = () => apiFetch('/api/v1/privacy/export');

/** Two-step delete: the first call returns 428 with a confirmation token. */
export async function deleteMyAccount() {
  let token;
  try {
    await apiFetch('/api/v1/privacy/me', { method: 'DELETE' });
    return { deleted: true };
  } catch (e) {
    if (e.status !== 428) throw e;
    token = e.body?.confirmation?.token;
    if (!token) throw e;
  }
  return apiFetch('/api/v1/privacy/me', { method: 'DELETE', headers: { 'X-Confirmation-Token': token } });
}
