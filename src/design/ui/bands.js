/* Readiness bands, in order. The band itself is decided by the readiness
   engine (Conncct 14-factor method); this component only draws it. */
export const READINESS_BANDS = [
  { tone: 'critical', label: 'Critical risk' },
  { tone: 'very-high', label: 'Very high risk' },
  { tone: 'high', label: 'High risk' },
  { tone: 'medium', label: 'Medium risk' },
  { tone: 'semi', label: 'Semi-ready' },
  { tone: 'ready', label: 'Investor-ready' },
  { tone: 'exceptional', label: 'Exceptional' },
];
