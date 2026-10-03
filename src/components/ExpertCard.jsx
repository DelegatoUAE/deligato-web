import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Avatar, Badge, Button } from '../design/ui';
import ExpertFitRow from './ExpertFitRow';
import { AVAILABILITY, SENIORITY } from '../lib/experts';

/** Expert Match Score: a labelled percentage pill, never a tile or a ring (D13). */
export function ExpertScore({ score, confidence }) {
  if (score == null) return null;
  return (
    <span className="xscore" aria-label={`Expert fit ${Math.round(score)} out of 100${confidence ? `, ${confidence} confidence` : ''}`}>
      <strong>{Math.round(score)}</strong><span>Expert fit</span>{confidence && <em>{confidence}</em>}
    </span>
  );
}

export default function ExpertCard({ result, expert: e0, requestId, onShortlist, shortlisted, busy, explainProvider }) {
  const e = e0 || result?.expert || {};
  const av = AVAILABILITY[e.availability];
  const href = `/experts/${e.id}${requestId ? `?brief=${requestId}` : ''}`;
  const [more, setMore] = useState(false);
  const why = result ? (Array.isArray(result.why_matched) ? result.why_matched : result.why_matched ? [result.why_matched] : []) : [];
  return (
    <article className="xcard">
      <div className="xcard-top">
        <Avatar name={e.full_name || e.display_name || 'Advisor'} size={44} />
        <div className="xcard-id">
          <h3><Link to={href}>{e.display_name || e.full_name}</Link></h3>
          <p className="ui-muted">{[SENIORITY[e.seniority], e.location].filter(Boolean).join(' · ')}</p>
        </div>
        {result && <ExpertScore score={result.expert_match_score} confidence={result.data_confidence} />}
      </div>
      {result && <ExpertFitRow fits={result.fits} />}
      {why.length > 0 && <p className="xcard-why">{(more ? why : why.slice(0, 2)).join(' ')}{why.length > 2 && <> <button type="button" className="linkish" onClick={() => setMore((v) => !v)}>{more ? 'Less' : 'More'}</button></>}</p>}
      {typeof result?.explanation === 'string' && <p className="xcard-why"><Badge tone={explainProvider && explainProvider !== 'heuristic' ? 'gold' : 'outline'} size="sm">{explainProvider && explainProvider !== 'heuristic' ? 'AI-refined' : 'Rules-based'}</Badge> {result.explanation}</p>}
      {(e.skills || []).length > 0 && <div className="ui-tags">{e.skills.slice(0, 5).map((x) => <span key={x} className="ui-tag">{x}</span>)}{e.skills.length > 5 && <span className="ui-faint">+{e.skills.length - 5}</span>}</div>}
      <div className="xcard-foot">
        {av && <Badge tone={av.tone} dot size="sm">{av.label}</Badge>}
        <div className="ui-row">
          <Button as={Link} to={href} variant="secondary" size="sm">View profile</Button>
          {onShortlist && (shortlisted ? <Badge tone="ok">Shortlisted</Badge>
            : <Button variant="ghost" size="sm" onClick={() => onShortlist(e)} loading={busy}>Shortlist</Button>)}
        </div>
      </div>
    </article>
  );
}
