import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Icon, Modal, Select, Tooltip } from '../../design/ui';
import MatchScore from './MatchScore';
import FitPills from './FitPills';
import { investorHref, tierWithinBucket, timingOf } from '../../lib/capital';
import { FEEDBACK_DOWN_REASONS } from '../../lib/learning';
import { wordsForCodes, countryName } from '../../lib/format';

/**
 * One capital source in the matches list (06-matches.md, D19 card anatomy):
 * score tile · name · fit chips · why we matched you · caveats · actions.
 * pipelineItem: the existing pipeline row (if any). canTrack: plan includes pipeline.
 */
export default function MatchCard({ r, runId, pipelineItem, canTrack, canDraft, onSave, onTrack, feedback, onFeedback, busy, instrumentUnknown = false, why = null }) {
  const [askWhy, setAskWhy] = useState(false);
  const [reason, setReason] = useState('wrong_geography');
  const href = investorHref(r.record_id, runId);
  const timing = timingOf(r);
  const outreachHref = `/capital/outreach?record=${encodeURIComponent(r.record_id)}`;

  return (
    <article className={`mcard mcard-${r.fit_tier}`} aria-labelledby={`m-${r.record_id}`}>
      <div className="mcard-score"><MatchScore score={r.match_score} confidence={r.data_confidence} /></div>
      <div className="mcard-main">
        <div className="mcard-head">
          <h3 id={`m-${r.record_id}`}><Link to={href}>{r.name}</Link></h3>
          <span className="mcard-meta">{[r.type, [r.city, countryName(r.country)].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
          {r.fit_tier === 'strong' && <Badge tone={r.bucket === 'eligible' ? 'ok' : 'outline'} size="sm" className="mcard-tier">{tierWithinBucket(r)}</Badge>}
        </div>
        <FitPills fits={r.fits} result={r} instrumentUnknown={instrumentUnknown} />
        {r.why_matched && (
          <div className="mcard-why">
            <span className="mcard-why-label">Why we matched you</span>
            <p>{wordsForCodes(r.why_matched)}</p>
          </div>
        )}
        {why}
        {r.ai_reasoning && (
          <p className="mcard-ai"><Badge tone="gold" size="sm">AI-refined</Badge> {r.ai_reasoning}</p>
        )}
        {r.caveats.length > 0 && (
          <ul className="mcard-caveats">
            {r.caveats.map((c, i) => <li key={i}>{wordsForCodes(typeof c === 'string' ? c : c.message || c.text)}{c?.detail ? <span className="mcard-caveat-detail"> {c.detail}</span> : null}</li>)}
          </ul>
        )}
        <div className="mcard-foot">
          {r.activity && <span className="mcard-activity">{r.activity}</span>}
          {timing && <Badge tone={timing.kind === 'deadline' ? 'gold' : timing.kind === 'open' ? 'ok' : 'neutral'} dot={timing.kind === 'deadline'} size="sm">{timing.text}</Badge>}
          {r.locked && <span className="ui-faint">How to reach them is included from Investor-Ready.</span>}
        </div>
      </div>
      <div className="mcard-actions">
        <Button as={Link} to={href} variant="secondary" size="sm">View investor</Button>
        {pipelineItem ? (
          <Button as={Link} to={pipelineItem.stage === 'shortlisted' ? '/capital/saved' : '/capital/pipeline'} variant="ghost" size="sm" iconLeft="check">{pipelineItem.stage === 'shortlisted' ? 'Saved' : 'In your pipeline'}</Button>
        ) : canTrack ? (
          <>
            <Button variant="primary" size="sm" onClick={() => onSave(r)} loading={busy === 'save'} disabled={Boolean(busy)}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => onTrack(r)} loading={busy === 'track'} disabled={Boolean(busy)}>Add to pipeline</Button>
          </>
        ) : (
          <Tooltip text="Pipeline tracking is included from Investor-Ready.">
            <Button variant="ghost" size="sm" iconLeft="lock" as={Link} to="/packages?highlight=investor-ready">Save</Button>
          </Tooltip>
        )}
        {canDraft ? (
          <Button as={Link} to={outreachHref} variant="ghost" size="sm">Prepare outreach</Button>
        ) : (
          <Button as={Link} to="/packages?highlight=investor-ready" variant="ghost" size="sm" iconLeft="lock" title="Outreach drafts are included from Investor-Ready. Opens Packages.">Prepare outreach</Button>
        )}
        {onFeedback && (
          <div className="mcard-fb" role="group" aria-label="Is this a relevant match?">
            <button type="button" className={`fb fb-up${feedback === 1 ? ' is-on' : ''}`} aria-pressed={feedback === 1} onClick={() => onFeedback(r, 1)}><Icon name="check" size={14} />Relevant</button>
            <button type="button" className={`fb fb-down${feedback === -1 ? ' is-on' : ''}`} aria-pressed={feedback === -1} onClick={() => setAskWhy(true)}><Icon name="close" size={14} />Not relevant</button>
          </div>
        )}
      </div>
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
