import FitMark from './FitMark.jsx';
import { FIT_STATES, FIT_WORD } from './fit.js';

/** Key for the four fit states. Show it once near any fit list. */
export default function FitLegend({ className = '' }) {
  return (
    <div className={`ui-fitlegend ${className}`.trim()}>
      {FIT_STATES.map((s) => (
        <span key={s}>
          <FitMark state={s} />
          {s === 'unknown' ? 'Unknown: not enough data, never counted as a fit' : FIT_WORD[s]}
        </span>
      ))}
    </div>
  );
}
