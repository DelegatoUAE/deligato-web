import cx from './cx.js';
import FitMark from './FitMark.jsx';
import { FIT_WORD, FIT_SPOKEN, normaliseFit } from './fit.js';

/**
 * FitRow: one eligibility criterion and how this founder meets it.
 * state: yes | partial | no | unknown (booleans are accepted; anything
 * else becomes unknown, so missing data can never render as a match).
 * detail: the evidence, or what is missing for unknown.
 * compact: an inline chip instead of a list row.
 * Put rows inside <ul className="ui-fitlist"> (FitList does this).
 */
export default function FitRow({ state, label, detail, stateLabel, compact = false, as, className }) {
  const s = normaliseFit(state);
  const word = stateLabel || FIT_WORD[s];
  const spoken = `${label}: ${FIT_SPOKEN[s]}${detail && typeof detail === 'string' ? `. ${detail}` : ''}`;

  if (compact) {
    return (
      <span className={cx('ui-fit', `ui-fit-${s}`, className)} title={spoken}>
        <FitMark state={s} />
        <span>{label}</span>
        <span className="ui-sr">{FIT_SPOKEN[s]}</span>
      </span>
    );
  }

  const As = as || 'li';
  return (
    <As className={cx('ui-fitrow', `ui-fitrow-${s}`, className)} data-fit={s}>
      <FitMark state={s} />
      <span className="ui-fitrow-label">
        {label}
        <span className="ui-sr">, {FIT_SPOKEN[s]}</span>
      </span>
      <span className="ui-fitrow-state" aria-hidden="true">{word}</span>
      {detail && <span className="ui-fitrow-detail">{detail}</span>}
    </As>
  );
}
