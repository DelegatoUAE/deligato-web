import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

export default function MatchPage() {
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [matches, setMatches] = useState(null);
  const [project, setProject] = useState(null);
  const [provider, setProvider] = useState(null);
  const [allocating, setAllocating] = useState({});
  const [allocated, setAllocated] = useState({});
  const [error, setError] = useState(null);
  const selectedId = params.get('project_id') || '';

  useEffect(() => {
    apiFetch('/projects')
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMatches(null);
      setProject(null);
      return;
    }
    setMatches(null);
    setError(null);
    setAllocated({});
    apiFetch(`/projects/${selectedId}/matches`)
      .then((d) => {
        setProject(d.project);
        setMatches(d.matches);
        setProvider(d.provider || 'heuristic');
      })
      .catch((e) => setError(e.message));
  }, [selectedId]);

  function onSelect(e) {
    const next = new URLSearchParams(params);
    if (e.target.value) next.set('project_id', e.target.value);
    else next.delete('project_id');
    setParams(next);
  }

  async function onAllocate(consultantId, score) {
    setAllocating((s) => ({ ...s, [consultantId]: true }));
    try {
      await apiFetch('/allocations', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedId,
          consultant_id: consultantId,
          match_score: score,
          status: 'proposed',
        }),
      });
      setAllocated((s) => ({ ...s, [consultantId]: true }));
    } catch (e) {
      alert(`Could not allocate: ${e.message}`);
    } finally {
      setAllocating((s) => ({ ...s, [consultantId]: false }));
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>AI Match</h1>
        <p className="muted">Pick a project — see consultants ranked by fit.</p>
      </div>

      <div className="filter-bar">
        <select value={selectedId} onChange={onSelect}>
          <option value="">— choose a project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.client_name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {!selectedId ? (
        <div className="empty">Pick a project above to see AI-ranked matches.</div>
      ) : !matches ? (
        <div className="empty">Computing matches…</div>
      ) : (
        <>
          {project && (
            <div className="project-summary">
              <div>
                <div className="muted">Brief</div>
                <h2>{project.name}</h2>
                <div className="muted">{project.client_name} · {project.required_seniority || '—'}</div>
              </div>
              <div className="tag-row">
                {(project.required_skills || []).map((s) => (
                  <span key={s} className="tag tag-strong">{s}</span>
                ))}
              </div>
              {provider && (
                <div className={`provider-badge provider-${provider}`}>
                  {provider === 'openai'
                    ? '🧠 Ranked by OpenAI'
                    : '⚙️ Heuristic ranking (add OPENAI_API_KEY for AI)'}
                </div>
              )}
            </div>
          )}

          <div className="match-list">
            {matches.map((m) => {
              const c = m.consultant;
              const isHigh = m.match_score >= 70;
              const isMid = m.match_score >= 40 && m.match_score < 70;
              return (
                <div key={c.id} className={`match-row ${isHigh ? 'is-high' : isMid ? 'is-mid' : 'is-low'}`}>
                  <div className="match-score-block">
                    <div className="match-score-num">{m.match_score.toFixed(0)}<span>%</span></div>
                    <div className="muted">match</div>
                  </div>
                  <div className="match-main">
                    <div className="match-row-head">
                      <strong>{c.full_name}</strong>
                      <span className="muted"> · {c.seniority} · {c.location || '—'}</span>
                      <span className={`avail-pill avail-${c.availability}`}>{c.availability}</span>
                    </div>
                    <div className="tag-row">
                      {(c.skills || []).map((s) => (
                        <span
                          key={s}
                          className={`tag ${m.matched_skills.includes(s.toLowerCase()) ? 'tag-matched' : ''}`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    {c.daily_rate_gbp && <div className="muted">£{c.daily_rate_gbp}/day</div>}
                    {m.reasoning && <div className="match-reasoning">{m.reasoning}</div>}
                  </div>
                  <div className="match-cta">
                    {allocated[c.id] ? (
                      <span className="ok">✓ Allocated</span>
                    ) : (
                      <button
                        onClick={() => onAllocate(c.id, m.match_score)}
                        disabled={allocating[c.id]}
                        className="btn-primary"
                      >
                        {allocating[c.id] ? 'Allocating…' : 'Allocate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
