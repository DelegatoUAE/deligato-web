// Capital routing (D15, api/modules/routing): which capital types fit this
// company before any provider is matched. GET /api/v1/routing/:companyId.
import { apiFetch } from './auth';

export const getRouting = (companyId) => apiFetch(`/api/v1/routing/${companyId}`);

export const ROUTE_FIT = {
  strong: { label: 'Strong fit', tone: 'ok' },
  possible: { label: 'Possible', tone: 'gold' },
  unlikely: { label: 'Unlikely', tone: 'neutral' },
};

export function normaliseRoute(r) {
  return {
    key: r.key,
    label: r.label || r.key,
    fit: r.fit || 'possible',
    confidence: r.confidence || null,
    reasons: (r.reasons || []).map((x) => (typeof x === 'string' ? { text: x } : x)),
    blockers: (r.blockers || []).map((x) => (typeof x === 'string' ? { text: x } : x)),
    cautions: (r.cautions || []).map((x) => (typeof x === 'string' ? { text: x } : x)),
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
