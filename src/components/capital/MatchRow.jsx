import { Link } from 'react-router-dom';
import MatchScore from './MatchScore';
import FitPills from './FitPills';
import { investorHref, bucketHeadline } from '../../lib/capital';

/** Compact match line for previews (Home, Overview). Opens the profile via the one helper route. */
export default function MatchRow({ r, runId }) {
  return (
    <li className="mrow">
      <MatchScore score={r.match_score} confidence={r.data_confidence} size="sm" />
      <div className="mrow-main">
        <Link to={investorHref(r.record_id, runId)} className="mrow-name">{r.name}</Link>
        <span className="mrow-meta">{[r.type, r.country].filter(Boolean).join(', ')} · <span className="tier">{bucketHeadline(r)}</span></span>
        <FitPills fits={r.fits} result={r} />
      </div>
    </li>
  );
}
