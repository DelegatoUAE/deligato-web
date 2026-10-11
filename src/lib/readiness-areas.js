// The readiness questions grouped into the areas an investor reads (presentation only; the
// Conncct method scores each question on its own and is unchanged). Unknown keys get no area.
export const READINESS_AREAS = [
  { key: 'raise', label: 'Runway and the raise', body: 'How long your money lasts, and how the raise compares with your costs and valuation.', questions: ['runway', 'raise_amount', 'annual_operating_cost', 'valuation'] },
  { key: 'path', label: 'Path to breakeven', body: 'When the company pays for itself, and the milestone this raise buys.', questions: ['breakeven_timing', 'next_milestone'] },
  { key: 'revenue', label: 'Revenue and debt', body: 'How predictable revenue is, and what existing debt new investors take on.', questions: ['has_debt', 'debt_type', 'revenue_stability'] },
  { key: 'team', label: 'Team and judgement', body: 'Experience, strengths, and how you decide and handle setbacks.', questions: ['setback_response', 'founder_experience', 'team_strengths', 'decision_style', 'risk_appetite'] },
];

export function areaOf(questionKey) {
  return READINESS_AREAS.find((a) => a.questions.includes(questionKey)) || null;
}
