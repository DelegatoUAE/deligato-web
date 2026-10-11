import { Link } from 'react-router-dom';
import { FitMark } from '../../design/ui';
import ScoreFigure from './match-ui/ScoreFigure';
import { FIT_DIMENSIONS, investorHref, bucketHeadline } from '../../lib/capital';
import { fitSummary } from '../../lib/matchview';
import { countryName } from '../../lib/format';
import './match-ui/matching.css';

const norm = (s) => (['yes', 'partial', 'no', 'unknown'].includes(s) ? s : 'unknown');

/**
 * Compact match line for previews (Home, Overview), 11 Oct redesign: name, place, evidence group
 * and "n of 5 confirmed" with the five marks; the score on the right. Opens the profile.
 */
export default function MatchRow({ r, runId }) {
  const f = fitSummary(r);
  return (
    <li className={`mrow2 mrow2-${r.bucket || 'possible'}`}>
      <div className="mrow2-main">
        <Link to={investorHref(r.record_id, runId)} className="mrow2-name">{r.name}</Link>
        <span className="mrow2-meta">{[r.type, countryName(r.country) || r.country].filter(Boolean).join(', ')}</span>
        <span className="mrow2-fit">
          <span className={`mx-bucket mx-bucket-${r.bucket}`}>{bucketHeadline(r)}</span>
          <span className="mrow2-marks" aria-hidden="true">{FIT_DIMENSIONS.map((d) => <FitMark key={d.key} state={norm(r.fits?.[d.key])} />)}</span>
          <span>{f.yes} of {f.total} confirmed</span>
        </span>
      </div>
      <ScoreFigure score={r.match_score} confidence={r.data_confidence} size="sm" />
    </li>
  );
}
