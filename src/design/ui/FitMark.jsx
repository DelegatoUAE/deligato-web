import { FIT_GLYPH, normaliseFit } from './fit.js';

/** The fit glyph on its own: solid check, half disc, red cross, dashed ?. */
export default function FitMark({ state }) {
  const s = normaliseFit(state);
  return (
    <span className={`ui-fitmark ui-fitmark-${s}`} aria-hidden="true">
      {s === 'partial' ? '' : FIT_GLYPH[s]}
    </span>
  );
}
