import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Icon, Modal, Select, Tooltip } from '../../design/ui';
import MatchScore from './MatchScore';
import FitPills from './FitPills';
import { investorHref, tierLabel } from '../../lib/capital';
import { FEEDBACK_DOWN_REASONS } from '../../lib/learning';
import { fmtDate } from '../../lib/format';

/**
 * One capital source in the matches list (06-matches.md, D19 card anatomy):
 * score tile · name · fit chips · why we matched you · caveats · actions.
 * pipelineItem: the existing pipeline row (if any). canTrack: plan includes pipeline.
 */
export default function MatchCard({ r, runId, pipelineItem, canTrack, canDraft, onSave, onTrack, feedback, onFeedback, busy }) {
  const [askWhy, setAskWhy] = useState(false);
  const [reason, setReason] = useState('wrong_geography');
  const href = investorHref(r.record_id, runId);
  const outreachHref = `/capital/outreach?record=${encodeURIComponent(r.record_id)}`;

  return (
    <article className={`mcard mcard-${r.fit_tier}`} aria-labelledby={`m-${r.record_id}`}>
      <div className="mcard-score"><MatchScore score={r.match_score} confidence={r.data_confidence} /></div>
      <div className="mcard-main">
        <div className="mcard-head">
          <h3 id={`m-${r.record_id}`}><Link to={href}>{r.name}</Link></h3>
          <span className="mcard-meta">{[r.type, [r.city, r.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
        </div>
        <FitPills fits={r.fits} result={r} />
        {r.why_matched && (
          <div className="mcard-why">
            <span className="mcard-why-label">Why we matched you</span>
            <p>{r.why_matched}</p>
          </div>
        )}
        {r.ai_reasoning && (
          <p className="mcard-ai"><Badge tone="gold" size="sm">AI-refined</Badge> {r.ai_reasoning}</p>
        )}
        {r.caveats.length > 0 && (
          <ul className="mcard-caveats">
            {r.caveats.map((c, i) => <li key={i}>{typeof c === 'string' ? c : c.message || c.text}</li>)}
          </ul>
        )}
        <div className="mcard-foot">
          {r.activity && <span className="mcard-activity">{r.activity}</span>}
          {r.deadline && <Badge tone="gold" dot size="sm">Deadline {fmtDate(r.deadline)}</Badge>}
          {!r.deadline && r.next_intake && <Badge tone="neutral" size="sm">Next intake {r.next_intake}</Badge>}
          {r.application_open === true && <Badge tone="ok" size="sm">Open now</Badge>}
          {r.locked && <span className="ui-faint">How to reach them is included from Investor-Ready.</span>}
        </div>
      </div>
      <div className="mcard-actions">
        <Button as={Link} to={href} variant="secondary" size="sm">View investor</Button>
        {pipelineItem ? (
          <Button as={Link} to="/capital/pipeline" variant="ghost" size="sm" iconLeft="check">In your pipeline</Button>
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
          <Button as={Link} to="/packages?highlight=investor-ready" variant="ghost" size="sm" iconLeft="lock">Prepare outreach</Button>
        )}
        {onFeedback && (
          <div className="mcard-fb" role="group" aria-label="Is this a relevant match?">
            <button type="button" className={`fb fb-up${feedback === 1 ? ' is-on' : ''}`} aria-pressed={feedback === 1} onClick={() => onFeedback(r, 1)}><Icon name="check" size={14} />Relevant</button>
            <button type="button" className={`fb fb-down${feedback === -1 ? ' is-on' : ''}`} aria-pressed={feedback === -1} onClick={() => setAskWhy(true)}><Icon name="close" size={14} />Not relevant</button>
          </div>
        )}
      </div>
      <span className="ui-sr">{tierLabel(r.fit_tier)}</span>
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
