// Capital routing (D15, api/modules/routing): which capital types fit this
// company before any provider is matched. GET /api/v1/routing/:companyId.
import { apiFetch } from './auth';

export const getRouting = (companyId) => apiFetch(`/api/v1/routing/${companyId}`);
export const selectRoutes = (companyId, routeKeys) =>
  apiFetch(`/api/v1/routing/${companyId}/selection`, { method: 'POST', body: JSON.stringify({ route_keys: routeKeys }) });

export const ROUTE_FIT = {
  strong: { label: 'Strong fit', tone: 'ok' },
  possible: { label: 'Possible', tone: 'gold' },
  unlikely: { label: 'Unlikely', tone: 'neutral' },
};

// Stealth: the partner's name never shows as a fact source (API label is filed as C11).
const SOURCE_TEXT = { conncct_readiness: 'Your readiness answer', 'Conncct readiness answer': 'Your readiness answer' };
const fact = (x) => {
  const o = typeof x === 'string' ? { text: x } : x;
  return o && SOURCE_TEXT[o.source] ? { ...o, source: SOURCE_TEXT[o.source] } : o;
};

export function normaliseRoute(r) {
  return {
    key: r.key,
    label: r.label || r.key,
    fit: r.fit || 'possible',
    confidence: r.confidence || null,
    reasons: (r.reasons || []).map(fact),
    blockers: (r.blockers || []).map(fact),
    cautions: (r.cautions || []).map(fact),
    unknowns: r.unknowns || [],
    description: r.description || null,
    typical_use: r.typical_use || null,
    coverage: r.coverage || null,
    investor_types: r.investor_types || [],
    instruments: r.instruments || [],
    dilution: r.dilution_profile?.plain || null,
    time_to_cash: r.time_to_cash?.plain || null,
    recommended: r.fit ? r.fit !== 'unlikely' : true,
  };
}
