// Gap → expertise bridge (journey.md §6.2). Client copy of the experts
// taxonomy mapping, so the calm link renders without a round trip.
export const BRIDGE_LABEL = {
  strategy: 'strategy', finance: 'fractional CFO', accounting: 'accounting', tax: 'tax', legal: 'legal and cap table',
  fundraising: 'fundraising', financial_modelling: 'financial modelling', pitch_deck: 'pitch deck', marketing: 'marketing and growth',
  technology: 'technology', ai: 'AI', product: 'product', operations: 'operations', compliance: 'compliance and regulatory',
};

const FACTOR = {
  runway: 'financial_modelling', raise_vs_cost: 'fundraising', dilution: 'fundraising', profitability: 'financial_modelling',
  milestone: 'strategy', revenue: 'marketing', setback: 'strategy', experience: 'strategy', strengths: 'pitch_deck',
  decisions: 'finance', risk_appetite: 'strategy',
};
const BLOCKER = {
  instrument: 'fundraising', ticket: 'fundraising', raise_usd: 'fundraising', presence: 'legal', willing_to_relocate: 'legal',
  revenue: 'finance', profile: 'strategy', stage: 'fundraising', geography: 'strategy', sector: 'strategy', investor_types_sought: 'fundraising',
};
const DATA_ROOM = {
  esop: 'legal', material_contracts: 'legal', licences: 'legal', cap_table: 'legal', shareholder_agreement: 'legal', incorporation: 'legal', ip_assignment: 'legal',
  annual_accounts: 'accounting', management_accounts: 'accounting', kpi_pack: 'accounting', financial_model: 'financial_modelling', cash_runway: 'financial_modelling',
  pitch_deck: 'pitch_deck', one_pager: 'pitch_deck',
};

/** → { key, text, href } or null when the gap has no mapped expertise. */
export function expertBridge(kind, key, from) {
  const k = String(key || '');
  const exp = kind === 'readiness_factor' ? FACTOR[k]
    : kind === 'match_blocker' ? (BLOCKER[k] || BLOCKER[k.split(':')[0]])
      : kind === 'data_room' ? DATA_ROOM[k] : null;
  if (!exp) return null;
  const label = BRIDGE_LABEL[exp];
  const text = exp === 'finance' ? `Need help? Find a matched ${label} →` : `Need help? Find a matched ${label} expert →`;
  return { key: exp, text, href: `/experts?gap_kind=${kind}&gap_key=${encodeURIComponent(k)}${from ? `&from=${from}` : ''}` };
}
