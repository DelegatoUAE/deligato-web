import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  listProfiles, listPipeline, updatePipelineItem, removeFromPipeline, PIPELINE_STAGES,
} from '../lib/capital';

// The tracked raise. This is what makes Capital Access a product rather
// than a search result: the client's own funnel over the matches, with the
// next action and date they owe each investor.

const OPEN_STAGES = PIPELINE_STAGES
  .filter((s) => !['closed_won', 'passed', 'not_now'].includes(s.key))
  .map((s) => s.key);

export default function CapitalPipelinePage() {
  const [params, setParams] = useSearchParams();
  const profileId = params.get('profile_id') || '';

  const [profiles, setProfiles] = useState([]);
  // One state object again, so the effect never calls setState synchronously.
  const [loaded, setLoaded] = useState({ profileId: undefined, items: [], gated: null });
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    listProfiles().then((d) => {
      setProfiles(d.profiles);
      if (!profileId && d.profiles.length === 1) {
        const next = new URLSearchParams(params);
        next.set('profile_id', d.profiles[0].id);
        setParams(next, { replace: true });
      }
    }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    listPipeline(profileId || null)
      .then((d) => { if (!cancelled) setLoaded({ profileId, items: d.pipeline, gated: null }); })
      .catch((e) => {
        if (cancelled) return;
        if (e.status === 402) setLoaded({ profileId, items: [], gated: e.message });
        else { setLoaded({ profileId, items: [], gated: null }); setError(e.message); }
      });
    return () => { cancelled = true; };
  }, [profileId]);

  const loading = loaded.profileId !== profileId;
  const items = loaded.profileId === profileId ? loaded.items : [];
  const gated = loaded.profileId === profileId ? loaded.gated : null;

  function setItems(updater) {
    setLoaded((l) => ({ ...l, items: typeof updater === 'function' ? updater(l.items) : updater }));
  }

  async function onStageChange(item, stage) {
    try {
      const d = await updatePipelineItem(item.id, { stage });
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, ...d.item } : x)));
    } catch (e) { setError(e.message); }
  }

  function startEdit(item) {
    setEditing(item.id);
    setDraft({
      owner_note: item.owner_note || '',
      next_action: item.next_action || '',
      next_action_date: item.next_action_date || '',
    });
  }

  async function saveEdit(item) {
    try {
      const d = await updatePipelineItem(item.id, {
        owner_note: draft.owner_note || null,
        next_action: draft.next_action || null,
        next_action_date: draft.next_action_date || null,
      });
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, ...d.item } : x)));
      setEditing(null);
    } catch (e) { setError(e.message); }
  }

  async function onRemove(item) {
    if (!window.confirm(`Remove ${item.capital_sources?.name || 'this source'} from the pipeline?`)) return;
    try {
      await removeFromPipeline(item.id);
      setItems((list) => list.filter((x) => x.id !== item.id));
    } catch (e) { setError(e.message); }
  }

  const byStage = PIPELINE_STAGES.map((s) => ({
    ...s,
    items: items.filter((i) => i.stage === s.key),
  })).filter((s) => s.items.length > 0);

  const open = items.filter((i) => OPEN_STAGES.includes(i.stage)).length;
  const overdue = items.filter((i) =>
    i.next_action_date && i.next_action_date < new Date().toISOString().slice(0, 10)
    && OPEN_STAGES.includes(i.stage)
  );

  return (
    <section>
      <div className="page-header">
        <h1>Raise pipeline</h1>
        <p className="muted">Every source you shortlisted, and what you owe them next.</p>
      </div>

      <div className="filter-bar">
        <select
          value={profileId}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('profile_id', e.target.value);
            else next.delete('profile_id');
            setParams(next);
          }}
        >
          <option value="">All companies</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
        </select>
        <Link to={profileId ? `/capital/matches?profile_id=${profileId}` : '/capital/matches'}>
          Find more capital →
        </Link>
      </div>

      {error && <div className="error">{error}</div>}
      {gated && <div className="cap-gate">{gated}</div>}

      {!gated && (
        <>
          <div className="cap-run-summary">
            <div className="cap-run-stat"><strong>{items.length}</strong><span className="muted">tracked</span></div>
            <div className="cap-run-stat"><strong>{open}</strong><span className="muted">open</span></div>
            <div className="cap-run-stat">
              <strong>{items.filter((i) => i.stage === 'closed_won').length}</strong>
              <span className="muted">won</span>
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="cap-gaps">
              <strong>{overdue.length} action{overdue.length === 1 ? '' : 's'} overdue:</strong>{' '}
              {overdue.slice(0, 4).map((i) => i.capital_sources?.name).filter(Boolean).join(', ')}
              {overdue.length > 4 && ` +${overdue.length - 4} more`}
            </div>
          )}

          {loading ? (
            <div className="empty">Loading pipeline…</div>
          ) : items.length === 0 ? (
            <div className="empty">
              Nothing shortlisted yet.{' '}
              <Link to={profileId ? `/capital/matches?profile_id=${profileId}` : '/capital/matches'}>
                Run a match
              </Link>{' '}
              and shortlist the sources worth approaching.
            </div>
          ) : (
            byStage.map((group) => (
              <div key={group.key} className="cap-stage-group">
                <h2 className="cap-stage-head">
                  {group.label} <span className="muted">({group.items.length})</span>
                </h2>
                <div className="cap-pipeline-list">
                  {group.items.map((item) => {
                    const s = item.capital_sources || {};
                    const isOverdue = item.next_action_date
                      && item.next_action_date < new Date().toISOString().slice(0, 10)
                      && OPEN_STAGES.includes(item.stage);
                    return (
                      <div key={item.id} className="cap-pipeline-row">
                        <div className="cap-pipeline-main">
                          <div className="cap-pipeline-head">
                            <strong>{s.name || item.record_id}</strong>
                            <span className="muted"> · {s.type || '—'} · {s.country || '—'}</span>
                            {item.match_score_at_add != null && (
                              <span className="cap-score-chip">{item.match_score_at_add}</span>
                            )}
                            {s.data_confidence && (
                              <span className={`cap-conf cap-conf-${String(s.data_confidence).toLowerCase()}`}>
                                {s.data_confidence}
                              </span>
                            )}
                          </div>

                          {editing === item.id ? (
                            <div className="cap-edit">
                              <input
                                placeholder="Next action"
                                value={draft.next_action}
                                onChange={(e) => setDraft((d) => ({ ...d, next_action: e.target.value }))}
                              />
                              <input
                                type="date"
                                value={draft.next_action_date}
                                onChange={(e) => setDraft((d) => ({ ...d, next_action_date: e.target.value }))}
                              />
                              <textarea
                                rows={2}
                                placeholder="Notes"
                                value={draft.owner_note}
                                onChange={(e) => setDraft((d) => ({ ...d, owner_note: e.target.value }))}
                              />
                              <div>
                                <button className="btn-primary" onClick={() => saveEdit(item)}>Save</button>
                                <button className="link-btn" onClick={() => setEditing(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="cap-pipeline-detail">
                              {item.next_action ? (
                                <span className={isOverdue ? 'cap-overdue' : ''}>
                                  Next: {item.next_action}
                                  {item.next_action_date ? ` — ${item.next_action_date}` : ''}
                                </span>
                              ) : (
                                <span className="muted">No next action set</span>
                              )}
                              {item.owner_note && <div className="muted">{item.owner_note}</div>}
                              {s.deadline && <div className="cap-deadline">Their deadline: {s.deadline}</div>}
                            </div>
                          )}
                        </div>

                        <div className="cap-pipeline-cta">
                          <select value={item.stage} onChange={(e) => onStageChange(item, e.target.value)}>
                            {PIPELINE_STAGES.map((st) => (
                              <option key={st.key} value={st.key}>{st.label}</option>
                            ))}
                          </select>
                          {(s.application_url || s.website) && (
                            <a href={s.application_url || s.website} target="_blank" rel="noreferrer">Open</a>
                          )}
                          <button className="link-btn" onClick={() => startEdit(item)}>Edit</button>
                          <button className="link-btn danger" onClick={() => onRemove(item)}>Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
