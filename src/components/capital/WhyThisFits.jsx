import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Icon, Skeleton } from '../../design/ui';
import { runTask } from '../../lib/intelligence';
import { fmtDate, stealthLabel, wordsForCodes, stripEvidenceIds } from '../../lib/format';

/** The one-tap consent card. The full wording is one click away, never hidden. */
export function AiConsentCard({ consent, compact = false, onDecline }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function yes() {
    setBusy(true); setError(null);
    try { await consent.grant(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className={`aiconsent${compact ? ' is-compact' : ''}`} role="region" aria-label="AI explanations">
      <div className="aiconsent-head">
        <span className="aiconsent-ic" aria-hidden="true"><Icon name="spark" /></span>
        <div>
          <p className="aiconsent-title">Explain my matches with AI. Company-level facts only.</p>
          <p className="aiconsent-sub">Names and contact details are removed first. Every AI request is logged in Settings. You can withdraw at any time.</p>
        </div>
      </div>
      {consent.text && (
        <details className="aiconsent-text">
          <summary>Read what you agree to</summary>
          <p className="aiconsent-full">{consent.text.text}</p>
        </details>
      )}
      {error && <Alert tone="bad">Couldn't record your consent. {error}</Alert>}
      <div className="ui-row">
        <Button variant="primary" size="sm" iconLeft="spark" onClick={yes} loading={busy} disabled={!consent.text}>Turn on AI explanations</Button>
        {onDecline && <Button variant="ghost" size="sm" onClick={onDecline}>Not now</Button>}
      </div>
    </div>
  );
}

function Cite({ c }) {
  const date = c.as_of ? fmtDate(c.as_of) : null;
  const label = stealthLabel(c.provenance) || 'Unknown';
  const value = Array.isArray(c.value) ? c.value.join(', ') : c.value;
  const tip = [c.field && `${c.field}: ${wordsForCodes(String(value ?? 'not on record'))}`, label, date && `checked ${date}`, c.source_name].filter(Boolean).join(' · ');
  return (
    <span className={`cite${c.verified ? ' is-verified' : ''}`} title={tip} tabIndex={0} aria-label={`Source: ${tip}`}>
      <span className="cite-f">{c.field || 'field'}</span>
      <span className="cite-p">{label}{date ? ` · ${date}` : ''}</span>
    </span>
  );
}

/**
 * "Why this fits": the match_explainer task (modules/intelligence, D25).
 * Each sentence carries citation chips to the field and provenance it rests
 * on; unknowns are said out loud; the path that ran is always labelled.
 */
export default function WhyThisFits({ companyId, runId, match, consent, compact = false }) {
  const [state, setState] = useState({ loading: false, result: null, error: null, gate: null });
  const [dismissed, setDismissed] = useState(false);

  async function explain() {
    setState({ loading: true, result: null, error: null, gate: null });
    try {
      const out = await runTask('match_explainer', {
        company_id: companyId,
        input: { match: { record_id: match.record_id, fits: match.fits || {} }, ids: { run_id: runId, record_id: match.record_id } },
      });
      setState({ loading: false, result: out, error: null, gate: null });
    } catch (e) {
      if (e.status === 402) setState({ loading: false, result: null, error: null, gate: e.message });
      else setState({ loading: false, result: null, error: e.status === 404 ? "AI explanations aren't connected in this environment yet." : e.message, gate: null });
    }
  }

  if (consent.loading) return compact ? null : <Skeleton h="60px" />;
  if (!consent.granted) {
    if (dismissed) return null;
    return <AiConsentCard consent={consent} compact={compact} onDecline={() => setDismissed(true)} />;
  }
  const r = state.result;
  const o = r?.output;
  const ai = r && r.provider && r.provider !== 'heuristic';
  return (
    <div className={`whyfits${compact ? ' is-compact' : ''}`}>
      {!r && !state.loading && !state.gate && (
        <Button variant="secondary" size="sm" iconLeft="spark" onClick={explain}>Why this fits</Button>
      )}
      {state.loading && <Skeleton variant="text" lines={3} />}
      {state.gate && (
        <p className="ui-muted whyfits-gate"><Icon name="lock" /> {state.gate} <Link to="/packages?highlight=investor-ready">See packages</Link></p>
      )}
      {state.error && <Alert tone="bad">Couldn't explain this match. {state.error}</Alert>}
      {o && (
        <div className="whyfits-body">
          <div className="whyfits-top">
            <Badge tone={ai ? 'gold' : 'outline'} size="sm">{ai ? 'AI-drafted' : 'Rules-based'}</Badge>
            {o.headline && <strong className="whyfits-h">{wordsForCodes(stripEvidenceIds(o.headline))}</strong>}
          </div>
          {r.notice && <p className="ui-faint whyfits-notice">{r.notice}</p>}
          {(o.why_this_fits || []).length > 0 && (
            <ul className="whyfits-list">
              {o.why_this_fits.map((w, i) => (
                <li key={i}>
                  <span>{wordsForCodes(stripEvidenceIds(w.text))}</span>
                  {(w.cites || []).length > 0 && <span className="cites">{w.cites.map((c, j) => <Cite key={j} c={c} />)}</span>}
                </li>
              ))}
            </ul>
          )}
          {(o.unknowns || []).length > 0 && (
            <p className="whyfits-unknown"><span className="ui-fit ui-fit-unknown">Not on record</span> {o.unknowns.map((u) => (typeof u === 'string' ? u : u.label || u.title || u.dimension)).filter(Boolean).join(', ')}. Unknown never counts as a fit.</p>
          )}
          {o.next_step?.label && (
            <p className="whyfits-next">Next: {o.next_step.route ? <Link to={o.next_step.route}>{o.next_step.label}</Link> : o.next_step.label}</p>
          )}
        </div>
      )}
    </div>
  );
}
