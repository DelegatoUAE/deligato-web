import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

export default function HomePage({ me }) {
  const [stats, setStats] = useState(null);
  const [activeProjects, setActiveProjects] = useState([]);
  const [recentAllocations, setRecentAllocations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/health/db'),
      apiFetch('/projects?status=active'),
      apiFetch('/allocations'),
    ])
      .then(([s, p, a]) => {
        setStats(s);
        setActiveProjects(p.projects);
        setRecentAllocations(a.allocations.slice(0, 5));
      })
      .catch((e) => setError(e.message));
  }, []);

  const profile = me?.profile || {};
  const firstName = (profile.full_name || '').split(' ')[0] || 'there';

  return (
    <>
      <section className="welcome">
        <h1>Welcome back, {firstName} 👋</h1>
        <p className="muted">Here's what's live across Deligato right now.</p>
      </section>

      <section className="cards">
        <Link to="/consultants" className="card-link">
          <div className="card">
            <div className="card-label">Consultants</div>
            <div className="card-value">{stats ? stats.rows.consultants : '…'}</div>
            <div className="card-foot">in your pool</div>
          </div>
        </Link>
        <Link to="/projects" className="card-link">
          <div className="card">
            <div className="card-label">Projects</div>
            <div className="card-value">{stats ? stats.rows.projects : '…'}</div>
            <div className="card-foot">tracked</div>
          </div>
        </Link>
        <Link to="/match" className="card-link">
          <div className="card">
            <div className="card-label">Allocations</div>
            <div className="card-value">{stats ? stats.rows.project_allocations : '…'}</div>
            <div className="card-foot">live matches</div>
          </div>
        </Link>
        <div className="card">
          <div className="card-label">Team members</div>
          <div className="card-value">{stats ? stats.rows.users : '…'}</div>
          <div className="card-foot">on Deligato</div>
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Active projects</h2>
            <Link to="/projects" className="link-btn">View all →</Link>
          </div>
          {activeProjects.length === 0 ? (
            <div className="empty">No active projects yet.</div>
          ) : (
            <ul className="row-list">
              {activeProjects.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted">{p.client_name}</div>
                  </div>
                  <Link to={`/match?project_id=${p.id}`} className="btn-secondary">
                    Match →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent allocations</h2>
          </div>
          {recentAllocations.length === 0 ? (
            <div className="empty">No allocations yet — try AI Match.</div>
          ) : (
            <ul className="row-list">
              {recentAllocations.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.consultant?.full_name}</strong>
                    <div className="muted">→ {a.project?.name}</div>
                  </div>
                  <div className="match-mini">{a.match_score?.toFixed(0)}%</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
