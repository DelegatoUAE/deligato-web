import { confidenceLevel } from '../../../lib/capital';

const WORD = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };

/**
 * ScoreFigure: the Capital Match Score on a light surface (matching redesign, 11 Oct).
 * A plain figure "51 /100" with the data confidence as three steps and a word.
 * Same meaning as MatchScore (never a ring: the ring is the readiness score);
 * an unknown score reads "Not scored", never a number.
 * size: sm (lists, compare) | md (result cards) | lg (investor header).
 */
export default function ScoreFigure({ score, confidence, size = 'md', caption = null }) {
  const level = confidenceLevel(confidence);
  const known = score !== null && score !== undefined && score !== '' && Number.isFinite(Number(score));
  const n = known ? Math.round(Number(score)) : null;
  const filled = { high: 3, medium: 2, low: 1 }[level];
  return (
    <div className={`mx-score mx-score-${size} is-${level}`} role="img"
      aria-label={known ? `Match score ${n} out of 100, ${WORD[level].toLowerCase()}. How strongly the evidence supports this fit; unknown facts lower it.` : 'Not scored'}
      title={known ? `Match score ${n} of 100: how strongly the evidence supports this fit. Unknown facts lower it.` : undefined}>
      <span className="mx-score-fig">
        {known ? <><span className="mx-score-n">{n}</span><span className="mx-score-of">/100</span></> : <span className="mx-score-none">Not scored</span>}
      </span>
      <span className="mx-score-conf" aria-hidden="true">
        <span className="mx-score-steps">{[0, 1, 2].map((i) => <i key={i} className={i < filled ? 'on' : ''} />)}</span>
        {size !== 'sm' && <span className="mx-score-word">{WORD[level]}</span>}
      </span>
      {caption && <span className="mx-score-cap">{caption}</span>}
    </div>
  );
}
