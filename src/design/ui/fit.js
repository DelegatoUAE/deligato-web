/* Shared fit vocabulary. The rule (PLAN.md, fixed rule 2): unknown is
   never a match. Missing data lowers confidence and never earns a check. */
export const FIT_STATES = ['yes', 'partial', 'no', 'unknown'];

export const FIT_GLYPH = { yes: '✓', partial: '◐', no: '✗', unknown: '?' };

export const FIT_WORD = {
  yes: 'Fits',
  partial: 'Partial fit',
  no: "Doesn't fit",
  unknown: 'Unknown',
};

/* Spoken form, for screen readers. */
export const FIT_SPOKEN = {
  yes: 'fits',
  partial: 'partial fit',
  no: 'does not fit',
  unknown: 'unknown, not enough data',
};

export function normaliseFit(state) {
  if (state === true) return 'yes';
  if (state === false) return 'no';
  return FIT_STATES.includes(state) ? state : 'unknown';
}
