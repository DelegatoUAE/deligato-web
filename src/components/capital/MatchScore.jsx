import { confidenceLevel } from '../../lib/capital';

const WORD = { high: 'High', medium: 'Medium', low: 'Low' };

/**
 * MatchScore: the Capital Match Score. A square tile with the number and a
 * three-segment confidence bar beneath. Never a ring (ia.md §6): the ring
 * belongs to the Conncct readiness score only.
 * size: sm (cards, pipeline) | md (lists) | lg (profile header).
 */
export default function MatchScore({ score, confidence, size = 'md', label = 'Match' }) {
  const level = confidenceLevel(confidence);
  const known = score !== null && score !== undefined && score !== '';
  const n = known ? Math.round(Number(score)) : null;
  const filled = { high: 3, medium: 2, low: 1 }[level];
  return (
    <div
      className={`ms ms-${size} ms-${level}`}
      role="img"
      aria-label={known ? `${label} score ${n} out of 100, ${WORD[level]} confidence` : `${label} score not available`}
    >
      <div className="ms-tile">
        <span className="ms-num">{known ? n : '–'}</span>
        {size !== 'sm' && <span className="ms-label">{label}</span>}
      </div>
      <div className="ms-conf" aria-hidden="true">
        <span className="ms-bars">
          {[0, 1, 2].map((i) => <i key={i} className={i < filled ? 'on' : ''} />)}
        </span>
        {size !== 'sm' && <span className="ms-word">{WORD[level]}</span>}
      </div>
    </div>
  );
}
