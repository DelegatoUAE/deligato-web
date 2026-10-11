import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, FitMark, Icon, Modal, Select } from '../../../design/ui';
import ScoreFigure from './ScoreFigure';
import { FIT_DIMENSIONS, fitProvenance, fitReasonText, investorHref, tierWithinBucket, timingOf } from '../../../lib/capital';
import { fitSummary } from '../../../lib/matchview';
import { FEEDBACK_DOWN_REASONS } from '../../../lib/learning';
import { wordsForCodes, countryName } from '../../../lib/format';

// A provider already on the founder's list must not read "In your pipeline" when it passed.
const PIPELINE_WORD = { shortlisted: 'Shortlisted', passed: 'Passed', not_now: 'Not now', closed_won: 'Closed' };
const STATE = ['yes', 'partial', 'no', 'unknown'];
const norm = (s) => (STATE.includes(s) ? s : 'unknown');
const SPOKEN = { yes: 'Fits', partial: 'Partly fits', no: "Doesn't fit", unknown: 'Not on record' };

/** "3 of 5 confirmed, 1 partial, 1 unknown": counts only; unknown is never added to the confirmed number. */
function summaryText(f, extraUnknown) {
  const parts = [`${f.yes} of ${f.total + extraUnknown} confirmed`];
  if (f.partial) parts.push(`${f.partial} partial`);
  if (f.no) parts.push(`${f.no} don't fit`);
  if (f.unknown + extraUnknown) parts.push(`${f.unknown + extraUnknown} unknown`);
  return parts.join(', ');
}

/** Closes a <details> menu on outside click or Escape. */
function useCloseOnOutside(ref) {
  useEffect(() => {
    const onDown = (e) => { if (ref.current?.open && !ref.current.contains(e.target)) ref.current.open = false; };
    const onKey = (e) => { if (e.key === 'Escape' && ref.current?.open) { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref]);
}

/**
 * One capital source in the matches grid, second pass (11 Oct, Bilal: "go further").
 * Name and place, one plain sentence on why it matches, the score. The five decisive
 * facts collapse to one line ("3 of 5 confirmed") that opens, in one click, every fact
 * with its evidence label, reason, caveats and last-verified line. View investor and
 * Shortlist stay visible; pipeline, outreach and feedback sit in "More".
 */
export default function ResultCard({ r, runId, pipelineItem, canTrack, canDraft, onSave, onTrack, feedback, onFeedback, busy, instrumentUnknown = false, why = null }) {
  const [open, setOpen] = useState(false);
  const [askWhy, setAskWhy] = useState(false);
  const [reason, setReason] = useState('wrong_geography');
  const menu = useRef(null);
  useCloseOnOutside(menu);
  const panelId = useId();
  const href = investorHref(r.record_id, runId);
  const timing = timingOf(r);
  const place = [r.city, countryName(r.country)].filter(Boolean).join(', ');
  const f = fitSummary(r);
  const dims = FIT_DIMENSIONS.map((d) => ({ ...d, label: d.key === 'business_model' ? 'Business model' : d.label, s: norm(r.fits?.[d.key]) }));
  const outsideWhy = (r.likely_outside_reasons || []);
  const sentence = r.bucket === 'likely_outside' && outsideWhy[0]
    ? wordsForCodes(outsideWhy[0].reason)
    : wordsForCodes(r.why_matched) || 'No explanation in this run.';
  const caveats = r.caveats || [];

  return (
    <article className={`mx-rc mx-rc-${r.bucket || 'possible'}`} aria-labelledby={`m-${r.record_id}`}>
      <header className="mx-rc-top">
        <div className="mx-rc-id">
          <h3 id={`m-${r.record_id}`} className="mx-rc-name"><Link to={href}>{r.name}</Link></h3>
          <p className="mx-rc-meta">{[r.type || 'Type not on record', place].filter(Boolean).join(', ')}</p>
        </div>
        <ScoreFigure score={r.match_score} confidence={r.data_confidence} size="sm" />
      </header>

      <p className="mx-rc-why">{sentence}</p>

      <button type="button" className={`mx-rc-sum${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        <span className="mx-rc-marks" aria-hidden="true">{dims.map((d) => <FitMark key={d.key} state={d.s} />)}</span>
        <span className="mx-rc-sum-t">{summaryText(f, instrumentUnknown ? 1 : 0)}</span>
        {caveats.length > 0 && <span className="mx-rc-flag"><Icon name="alert" size={12} />{caveats.length === 1 ? '1 caveat' : `${caveats.length} caveats`}</span>}
        <span className="mx-rc-ev">Evidence<Icon name="chevronDown" size={14} /></span>
      </button>

      <div id={panelId} className="mx-rc-panel" hidden={!open}>
        <ul className="mx-rc-facts" aria-label="Decisive facts and their evidence">
          {dims.map((d) => {
            const why2 = fitReasonText(r, d.key) || outsideWhy.find((x) => x.dimension === d.key)?.reason;
            return (
              <li key={d.key} className={`is-${d.s}`}>
                <FitMark state={d.s} />
                <span className="mx-rc-f-l">{d.label}</span>
                <span className="mx-rc-f-s">{SPOKEN[d.s]}</span>
                <span className="mx-rc-f-p">{fitProvenance(r, d.key)}</span>
                {why2 && <span className="mx-rc-f-w">{wordsForCodes(why2)}</span>}
              </li>
            );
          })}
          {instrumentUnknown && (
            <li className="is-unknown"><FitMark state="unknown" /><span className="mx-rc-f-l">Instrument</span><span className="mx-rc-f-s">Not set</span><span className="mx-rc-f-p">Your profile</span>
              <span className="mx-rc-f-w">You haven't set the instrument you're offering, so we can't check it.</span></li>
          )}
        </ul>
        {caveats.length > 0 && (
          <ul className="mx-rc-cav">
            {caveats.map((c, i) => <li key={i}><Icon name="alert" size={14} />{wordsForCodes(typeof c === 'string' ? c : c.message || c.text)}{c?.detail ? ` ${c.detail}` : ''}</li>)}
          </ul>
        )}
        {why}
        {r.ai_reasoning && <p className="mx-rc-ai"><Badge tone="gold" size="sm">AI-refined</Badge> {r.ai_reasoning}</p>}
        <p className="mx-rc-foot">
          {r.fit_tier && <span>{tierWithinBucket(r)}</span>}
          {r.activity && <span className="mx-rc-fresh">{r.activity}</span>}
          {timing && <span>{timing.text}</span>}
          {r.locked && <span><Icon name="lock" size={12} /> Contact routes are in Capital Intelligence and Capital Raising</span>}
        </p>
      </div>

      <footer className="mx-rc-act">
        <Button as={Link} to={href} variant="secondary" size="sm">View investor</Button>
        {pipelineItem ? (
          <Button as={Link} to={pipelineItem.stage === 'shortlisted' ? '/capital/saved' : '/capital/pipeline'} variant="ghost" size="sm" iconLeft="check" className="mx-done">{PIPELINE_WORD[pipelineItem.stage] || 'In your pipeline'}</Button>
        ) : canTrack ? (
          <Button variant="primary" size="sm" onClick={() => onSave(r)} loading={busy === 'save'} disabled={Boolean(busy)}>Shortlist</Button>
        ) : (
          <Button variant="ghost" size="sm" iconLeft="lock" as={Link} to="/packages" title="Your shortlist couldn't be loaded. Open Plans to check what your plan includes.">Save</Button>
        )}
        <details className="mx-more" ref={menu}>
          <summary aria-label={`More actions for ${r.name}`}><Icon name="menu" size={16} /><span>More</span></summary>
          <div className="mx-more-menu" role="group" aria-label="More actions">
            {!pipelineItem && canTrack && <button type="button" onClick={() => { menu.current.open = false; onTrack(r); }} disabled={Boolean(busy)}>Add to pipeline</button>}
            {canDraft
              ? <Link to={`/capital/outreach?record=${encodeURIComponent(r.record_id)}`}>Prepare outreach</Link>
              : <Link to="/packages?highlight=capital-intelligence" title="Contact routes and outreach drafts are included in Capital Intelligence and Capital Raising. Opens Plans."><Icon name="lock" size={12} /> Prepare outreach</Link>}
            {onFeedback && (
              <>
                <button type="button" aria-pressed={feedback === 1} className={feedback === 1 ? 'is-on' : ''} onClick={() => { menu.current.open = false; onFeedback(r, 1); }}><Icon name="check" size={14} /> Relevant match</button>
                <button type="button" aria-pressed={feedback === -1} className={feedback === -1 ? 'is-on' : ''} onClick={() => { menu.current.open = false; setAskWhy(true); }}><Icon name="close" size={14} /> Not relevant</button>
              </>
            )}
          </div>
        </details>
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
