import { Link } from 'react-router-dom';
import { Avatar, Badge, Button, FitMark } from '../design/ui';
import { AVAILABILITY, SENIORITY, EXPERT_CHIP_LABEL } from '../lib/experts';

/** Expert Match Score: a labelled percentage pill, never a tile or a ring (D13). */
export function ExpertScore({ score }) {
  if (score == null) return null;
  return <span className="xscore" aria-label={`Expert match ${Math.round(score)} percent`}><strong>{Math.round(score)}%</strong> expert match</span>;
}

export default function ExpertCard({ result, expert: e0, requestId, onShortlist, shortlisted, busy }) {
  const e = e0 || result?.expert || {};
  const av = AVAILABILITY[e.availability];
  const href = `/experts/${e.id}${requestId ? `?request=${requestId}` : ''}`;
  const fits = result?.fits || {};
  return (
    <article className="xcard">
      <div className="xcard-top">
        <Avatar name={e.full_name || e.display_name || 'Advisor'} size={44} />
        <div className="xcard-id">
          <h3><Link to={href}>{e.display_name || e.full_name}</Link></h3>
          <p className="ui-muted">{[SENIORITY[e.seniority], e.location].filter(Boolean).join(' · ')}</p>
        </div>
        {result && <ExpertScore score={result.expert_match_score} />}
      </div>
      {result && (
        <ul className="xchips" aria-label="Why this advisor">
          {Object.entries(fits).map(([k, v]) => (
            <li key={k} className={`ui-fit ui-fit-${v?.state || 'unknown'}`} title={v?.detail || ''}>
              <FitMark state={v?.state} /> {EXPERT_CHIP_LABEL[k] || k}
            </li>
          ))}
        </ul>
      )}
      {result?.why_matched && <p className="xcard-why">{Array.isArray(result.why_matched) ? result.why_matched.join(' ') : result.why_matched}</p>}
      {typeof result?.explanation === 'string' && <p className="xcard-why"><Badge tone="gold" size="sm">AI-refined</Badge> {result.explanation}</p>}
      {!result && (e.skills || []).length > 0 && <p className="ui-muted">{e.skills.slice(0, 5).join(', ')}</p>}
      <div className="xcard-foot">
        {av && <Badge tone={av.tone} dot size="sm">{av.label}</Badge>}
        <div className="ui-row">
          <Button as={Link} to={href} variant="secondary" size="sm">View expert</Button>
          {onShortlist && (shortlisted ? <Badge tone="ok">Shortlisted</Badge>
            : <Button variant="ghost" size="sm" onClick={() => onShortlist(e)} loading={busy}>Shortlist</Button>)}
        </div>
      </div>
    </article>
  );
}
