import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  listProfiles, runMatch, addToPipeline, ticketRange,
} from '../lib/capital';

// The results surface. Two rules from SCHEMA_V3.md drive the whole design:
//   1. every match AND non-match must be explainable
//   2. missing data is never a match — "unknown" must LOOK different from
//      a tick, never like a near-miss
// So the fit row renders three distinct states, and confidence is shown
// next to the score rather than buried.

const FIT_LABELS = {
  stage: 'Stage',
  sector: 'Sector',
  geography: 'Geography',
  ticket: 'Ticket',
  business_model: 'Model',
};

const FIT_GLYPH = { yes: '✓', partial: '~', no: '✗', unknown: '?' };

function FitRow({ fits }) {
  return (
    <div className="cap-fits">
      {Object.entries(FIT_LABELS).map(([key, label]) => {
        const state = fits?.[key] || 'unknown';
        return (
          <span key={key} className={`cap-fit cap-fit-${state}`} title={`${label}: ${state}`}>
            <b>{FIT_GLYPH[state]}</b> {label}
          </span>
        );
      })}
    </div>
  );
}

function ConfidencePill({ band, score, unknowns }) {
  const title = `Data confidence ${score}/100${unknowns ? ` · ${unknowns} mandate field(s) unknown` : ''}`;
  return (
    <span className={`cap-conf cap-conf-${(band || 'low').toLowerCase()}`} title={title}>
      {band} confidence
    </span>
  );
}

export default function CapitalMatchesPage() {
  const [params, setParams] = useSearchParams();
  const profileId = params.get('profile_id') || '';

  const [profiles, setProfiles] = useState([]);
  // Keep the run and the profile it belongs to in ONE state object. Lets the
  // effect set state only in its async callbacks (no synchronous setState in
  // an effect body) while still never rendering a previous company's results.
  const [run, setRun] = useState({ profileId: null, data: null, error: null });
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState({});
  const [added, setAdded] = useState({});
  const [showNonMatches, setShowNonMatches] = useState(false);
  const [minConfidence, setMinConfidence] = useState('all');

  useEffect(() => {
    listProfiles().then((d) => setProfiles(d.profiles)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    runMatch(profileId, { include_non_matches: true })
      .then((d) => { if (!cancelled) { setRun({ profileId, data: d, error: null }); setAdded({}); } })
      .catch((e) => { if (!cancelled) setRun({ profileId, data: null, error: e.message }); });
    return () => { cancelled = true; };
  }, [profileId]);

  // Derived, not stored: we are loading whenever the run on hand is not yet
  // the run for the selected company.
  const loading = !!profileId && run.profileId !== profileId;
  const data = run.profileId === profileId ? run.data : null;
  const runError = run.profileId === profileId ? run.error : null;

  function onSelectProfile(e) {
    const next = new URLSearchParams(params);
    if (e.target.value) next.set('profile_id', e.target.value);
    else next.delete('profile_id');
    setParams(next);
  }

  async function onShortlist(r) {
    setAdding((s) => ({ ...s, [r.record_id]: true }));
    try {
      await addToPipeline({
        profile_id: profileId,
        record_id: r.record_id,
        match_score_at_add: r.match_score,
        stage: 'shortlisted',
      });
      setAdded((s) => ({ ...s, [r.record_id]: true }));
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding((s) => ({ ...s, [r.record_id]: false }));
    }
  }

  const results = (data?.results || []).filter((r) => {
    if (minConfidence === 'all') return true;
    if (minConfidence === 'high') return r.data_confidence === 'High';
    return r.data_confidence === 'High' || r.data_confidence === 'Medium';
  });

  // Gaps in the founder's own profile, aggregated — the single most useful
  // thing we can tell them, because it is the one input they control.
  const profileGaps = [...new Set(
    (data?.results || []).flatMap((r) => r.missing_from_your_profile || [])
  )];

  return (
    <section>
      <div className="page-header">
        <h1>Capital matches</h1>
        <p className="muted">
          Ranked against every active capital source we hold. Every score is explained,
          and so is every exclusion.
        </p>
      </div>

      <div className="filter-bar">
        <select value={profileId} onChange={onSelectProfile}>
          <option value="">— choose a company —</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.company_name}</option>
          ))}
        </select>
        {data && (
          <select value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)}>
            <option value="all">All confidence levels</option>
            <option value="medium">Medium and High only</option>
            <option value="high">High confidence only</option>
          </select>
        )}
        {!profiles.length && <Link to="/capital">Create a company profile →</Link>}
      </div>

      {(error || runError) && <div className="error">{error || runError}</div>}

      {!profileId ? (
        <div className="empty">Pick a company above to see its capital matches.</div>
      ) : loading ? (
        <div className="empty">Running the matching engine across the database…</div>
      ) : !data ? null : (
        <>
          <div className="cap-run-summary">
            <div className="cap-run-stat">
              <strong>{data.counts.eligible.toLocaleString()}</strong>
              <span className="muted">eligible of {data.counts.considered.toLocaleString()}</span>
            </div>
            <div className="cap-run-stat">
              <strong>{data.counts.high_confidence}</strong>
              <span className="muted">high confidence</span>
            </div>
            <div className="cap-run-stat">
              <strong>{data.counts.excluded.toLocaleString()}</strong>
              <span className="muted">filtered out</span>
            </div>
            <div className={`provider-badge provider-${data.provider}`}>
              {data.provider === 'openai'
                ? `🧠 Thesis fit scored by ${data.ai_model}`
                : '⚙️ Deterministic engine'}
            </div>
            {data.ai_gated && <div className="cap-gate-inline">{data.ai_gated}</div>}
            {data.ai_error && (
              <div className="cap-gate-inline" title={data.ai_error}>
                AI layer unavailable — deterministic ranking shown
              </div>
            )}
          </div>

          {data.plan && data.counts.eligible > data.plan.max_results && (
            <div className="cap-gate">
              Showing the top {data.plan.max_results} of {data.counts.eligible.toLocaleString()} eligible
              sources on your {data.plan.label} plan.
            </div>
          )}

          {profileGaps.length > 0 && (
            <div className="cap-gaps">
              <strong>Your results are limited by missing inputs.</strong> Add{' '}
              {profileGaps.join(', ')} to turn "unknown" into a real filter —{' '}
              <Link to={`/capital?profile_id=${profileId}`}>edit your profile</Link>.
            </div>
          )}

          {data.persist_error && (
            <div className="cap-gate-inline">
              Results shown but not saved to history: {data.persist_error}
            </div>
          )}

          <div className="cap-match-list">
            {results.map((r) => (
              <article key={r.record_id} className="cap-match">
                <div className="cap-match-score">
                  <div className="cap-score-num">{r.match_score}</div>
                  <ConfidencePill
                    band={r.data_confidence}
                    score={r.data_confidence_score}
                    unknowns={r.unknown_count}
                  />
                </div>

                <div className="cap-match-body">
                  <header className="cap-match-head">
                    <h3>{r.name}</h3>
                    <span className="muted">
                      {r.type}
                      {r.city ? ` · ${r.city}` : r.country ? ` · ${r.country}` : ''}
                    </span>
                  </header>

                  <FitRow fits={r.fits} />

                  {r.why_matched && <p className="cap-why">{r.why_matched}</p>}
                  {r.ai_reasoning && <p className="cap-why cap-why-ai">🧠 {r.ai_reasoning}</p>}

                  {/* Constraints that exist in the source's own eligibility text
                      but are not yet in a structured field. Never scored — shown
                      so a client checks before spending time on an application. */}
                  {(r.caveats || []).map((c, i) => (
                    <p key={i} className="cap-caveat">
                      ⚠ {c.message}
                      {c.detail && <span className="muted"> {c.detail}</span>}
                    </p>
                  ))}

                  <div className="cap-match-meta">
                    <span>{ticketRange(r.ticket_min_usd, r.ticket_max_usd)}</span>
                    {r.equity_taken_pct != null && <span>{r.equity_taken_pct}% equity</span>}
                    {r.stages?.length > 0 && <span>{r.stages.join(' / ')}</span>}
                    <span className="cap-activity">{r.activity}</span>
                    {r.deadline && <span className="cap-deadline">Deadline {r.deadline}</span>}
                    {r.next_intake && <span>Next intake {r.next_intake}</span>}
                  </div>

                  {r.portfolio_examples?.length > 0 && (
                    <div className="muted cap-portfolio">
                      Portfolio: {r.portfolio_examples.slice(0, 5).join(', ')}
                    </div>
                  )}
                </div>

                <div className="cap-match-cta">
                  {r.locked ? (
                    <div className="cap-locked">
                      🔒 Contact route and application link are on the paid plan
                    </div>
                  ) : (
                    <>
                      {r.application_url && (
                        <a className="btn-primary" href={r.application_url} target="_blank" rel="noreferrer">
                          Apply
                        </a>
                      )}
                      {r.website && !r.application_url && (
                        <a className="btn-primary" href={r.website} target="_blank" rel="noreferrer">
                          Website
                        </a>
                      )}
                      <div className="muted cap-route">{r.contact_route}</div>
                    </>
                  )}
                  {added[r.record_id] ? (
                    <span className="ok">✓ Shortlisted</span>
                  ) : (
                    <button
                      className="link-btn"
                      disabled={adding[r.record_id]}
                      onClick={() => onShortlist(r)}
                    >
                      {adding[r.record_id] ? 'Adding…' : '+ Shortlist'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {results.length === 0 && (
            <div className="empty">
              No matches at this confidence level. Loosen the filter, or fill in more of your profile.
            </div>
          )}

          {data.non_matches?.length > 0 && (
            <div className="cap-nonmatch">
              <button className="link-btn" onClick={() => setShowNonMatches((s) => !s)}>
                {showNonMatches ? 'Hide' : 'Show'} why {data.counts.excluded.toLocaleString()} sources were excluded
              </button>
              {showNonMatches && (
                <ul className="cap-nonmatch-list">
                  {data.non_matches.map((n) => (
                    <li key={n.record_id}>
                      <strong>{n.name}</strong>
                      <span className="muted"> — {n.why_not.join('; ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
