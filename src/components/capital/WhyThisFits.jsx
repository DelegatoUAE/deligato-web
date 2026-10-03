import { useState } from 'react';
import { Alert, Button, Icon, Skeleton } from '../../design/ui';
import { runTask } from '../../lib/intelligence';
import { wordsForCodes, stripEvidenceIds } from '../../lib/format';
import { AiPathLabel, Cite, NextStep, UpgradeNote } from './AiBlocks';

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
        run_id: runId || undefined,
        record_id: match.record_id,
        // The server replaces these with the founder's stored row (owner-checked).
        input: { match: { record_id: match.record_id, fits: match.fits || {} } },
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
        <UpgradeNote message={state.gate} />
      )}
      {state.error && <Alert tone="bad">Couldn't explain this match. {state.error}</Alert>}
      {o && (
        <div className="whyfits-body">
          <div className="whyfits-top">
            <AiPathLabel result={r} />
            {ai && o.headline && <strong className="whyfits-h">{wordsForCodes(stripEvidenceIds(o.headline))}</strong>}
          </div>
          {(o.why_this_fits || []).length > 0 && (
            <ul className="whyfits-list">
              {o.why_this_fits.map((w, i) => (
                <li key={i}>
                  <span>{wordsForCodes(stripEvidenceIds(w.text)).replace(/\s*\[[^\]]*\]\s*$/, '')}</span>
                  {(w.cites || []).length > 0 && <span className="cites">{w.cites.map((c, j) => <Cite key={j} c={c} />)}</span>}
                </li>
              ))}
            </ul>
          )}
          {(o.unknowns || []).length > 0 && (
            <p className="whyfits-unknown"><span className="ui-fit ui-fit-unknown">Not on record</span> {o.unknowns.map((u) => (typeof u === 'string' ? u : u.label || u.title || u.dimension)).filter(Boolean).join(', ')}. Unknown never counts as a fit.</p>
          )}
          {(o.strengthen || []).length > 0 && (
            <ul className="ailist whyfits-strengthen">{o.strengthen.slice(0, 3).map((x, i) => <li key={x.id || i}>{wordsForCodes(x.action)}</li>)}</ul>
          )}
          <NextStep step={o.next_step} />
        </div>
      )}
    </div>
  );
}
