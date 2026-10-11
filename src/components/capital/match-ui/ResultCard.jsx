import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Icon, Modal, Select, Tooltip } from '../../../design/ui';
import FitPills from '../FitPills';
import ScoreFigure from './ScoreFigure';
import { investorHref, tierWithinBucket, timingOf } from '../../../lib/capital';
import { FEEDBACK_DOWN_REASONS } from '../../../lib/learning';
import { wordsForCodes, countryName } from '../../../lib/format';

// A provider already on the founder's list must not read "In your pipeline" when it passed.
const PIPELINE_WORD = { shortlisted: 'Shortlisted', passed: 'Passed', not_now: 'Not now', closed_won: 'Closed' };

/**
 * One capital source in the matches list, matching redesign (11 Oct). Same data and
 * actions as MatchCard (D19 anatomy): identity and score on top, the five fit marks
 * with their evidence, why we matched, caveats, dated activity, then one action row.
 */
export default function ResultCard({ r, runId, pipelineItem, canTrack, canDraft, onSave, onTrack, feedback, onFeedback, busy, instrumentUnknown = false, why = null }) {
  const [askWhy, setAskWhy] = useState(false);
  const [reason, setReason] = useState('wrong_geography');
  const href = investorHref(r.record_id, runId);
  const timing = timingOf(r);
  const place = [r.city, countryName(r.country)].filter(Boolean).join(', ');

  return (
    <article className={`mx-card mx-card-${r.bucket || 'possible'}`} aria-labelledby={`m-${r.record_id}`}>
      <header className="mx-card-top">
        <div className="mx-card-id">
          <h3 id={`m-${r.record_id}`} className="mx-card-name"><Link to={href}>{r.name}</Link></h3>
          <p className="mx-card-meta">
            <span>{[r.type || 'Type not on record', place].filter(Boolean).join(', ')}</span>
            {r.fit_tier === 'strong' && <Badge tone={r.bucket === 'eligible' ? 'ok' : 'outline'} size="sm" className="mx-card-tier">{tierWithinBucket(r)}</Badge>}
          </p>
        </div>
        <ScoreFigure score={r.match_score} confidence={r.data_confidence} />
      </header>

      <FitPills fits={r.fits} result={r} instrumentUnknown={instrumentUnknown} />

      {r.why_matched && <p className="mx-card-why"><span className="mx-card-why-k">Why we matched you</span>{wordsForCodes(r.why_matched)}</p>}
      {why}
      {r.ai_reasoning && <p className="mx-card-ai"><Badge tone="gold" size="sm">AI-refined</Badge> {r.ai_reasoning}</p>}
      {r.caveats.length > 0 && (
        <ul className="mx-card-caveats">
          {r.caveats.map((c, i) => <li key={i}><Icon name="alert" size={14} />{wordsForCodes(typeof c === 'string' ? c : c.message || c.text)}{c?.detail ? <span> {c.detail}</span> : null}</li>)}
        </ul>
      )}
      {(r.activity || timing || r.locked) && (
        <p className="mx-card-facts">
          {r.activity && <span className="mx-card-fresh">{r.activity}</span>}
          {timing && <Badge tone={timing.kind === 'deadline' ? 'gold' : timing.kind === 'open' ? 'ok' : 'neutral'} dot={timing.kind === 'deadline'} size="sm">{timing.text}</Badge>}
          {r.locked && <span className="mx-card-lock"><Icon name="lock" size={12} />Contact routes are in Capital Intelligence and Capital Raising</span>}
        </p>
      )}

      <footer className="mx-card-actions">
        <div className="mx-card-do">
          {pipelineItem ? (
            <Button as={Link} to={pipelineItem.stage === 'shortlisted' ? '/capital/saved' : '/capital/pipeline'} variant="ghost" size="sm" iconLeft="check" className="mx-done">{PIPELINE_WORD[pipelineItem.stage] || 'In your pipeline'}</Button>
          ) : canTrack ? (
            <>
              <Button variant="primary" size="sm" onClick={() => onSave(r)} loading={busy === 'save'} disabled={Boolean(busy)}>Shortlist</Button>
              <Button variant="secondary" size="sm" onClick={() => onTrack(r)} loading={busy === 'track'} disabled={Boolean(busy)}>Add to pipeline</Button>
            </>
          ) : (
            <Tooltip text="Your shortlist couldn't be loaded. Open Plans to check what your plan includes.">
              <Button variant="ghost" size="sm" iconLeft="lock" as={Link} to="/packages">Save</Button>
            </Tooltip>
          )}
          <Button as={Link} to={href} variant="link" size="sm" iconRight="arrowRight" className="mx-view">View investor</Button>
          {canDraft ? (
            <Button as={Link} to={`/capital/outreach?record=${encodeURIComponent(r.record_id)}`} variant="link" size="sm">Prepare outreach</Button>
          ) : (
            <Button as={Link} to="/packages?highlight=capital-intelligence" variant="link" size="sm" iconLeft="lock" className="mx-muted-link" title="Contact routes and outreach drafts are included in Capital Intelligence and Capital Raising. Opens Plans.">Prepare outreach</Button>
          )}
        </div>
        {onFeedback && (
          <div className="mx-fb" role="group" aria-label="Is this a relevant match?">
            <span className="mx-fb-q">Relevant?</span>
            <button type="button" className={`mx-fb-b${feedback === 1 ? ' is-on' : ''}`} aria-pressed={feedback === 1} onClick={() => onFeedback(r, 1)}><Icon name="check" size={14} /><span>Yes</span></button>
            <button type="button" className={`mx-fb-b is-no${feedback === -1 ? ' is-on' : ''}`} aria-pressed={feedback === -1} onClick={() => setAskWhy(true)}><Icon name="close" size={14} /><span>No</span></button>
          </div>
        )}
      </footer>

      <Modal open={askWhy} onClose={() => setAskWhy(false)} size="sm" title="What's wrong with this match?"
        description="Your answer improves future matches. It doesn't change this investor's record."
        footer={(
          <>
            <Button variant="ghost" onClick={() => setAskWhy(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { onFeedback(r, -1, reason); setAskWhy(false); }}>Save feedback</Button>
          </>
        )}>
        <label className="ui-label" htmlFor={`fbr-${r.record_id}`}>Main reason</label>
        <Select id={`fbr-${r.record_id}`} value={reason} onChange={(e) => setReason(e.target.value)} options={FEEDBACK_DOWN_REASONS.map((x) => ({ value: x.key, label: x.label }))} />
      </Modal>
    </article>
  );
}
