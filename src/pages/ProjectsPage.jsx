import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

const STATUSES = ['all', 'draft', 'active', 'on_hold', 'completed', 'cancelled'];

const STATUS_LABEL = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const fmtGBP = (n) =>
  n == null ? '—' : '£' + Number(n).toLocaleString('en-GB');

export default function ProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    setProjects(null);
    setError(null);
    const path = filter === 'all' ? '/projects' : `/projects?status=${filter}`;
    apiFetch(path)
      .then((d) => setProjects(d.projects))
      .catch((e) => setError(e.message));
  }, [filter]);

  return (
    <section>
      <div className="page-header">
        <h1>Projects</h1>
        <div className="filters">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip ${filter === s ? 'is-active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {!projects ? (
        <div className="empty">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="empty">No projects in this view yet.</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Required skills</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.required_seniority && (
                      <span className="muted"> · {p.required_seniority}</span>
                    )}
                  </td>
                  <td>{p.client_name}</td>
                  <td>
                    <span className={`status-pill status-${p.status}`}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </td>
                  <td>{fmtGBP(p.budget_gbp)}</td>
                  <td>
                    <div className="tag-row">
                      {(p.required_skills || []).slice(0, 4).map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                      {(p.required_skills || []).length > 4 && (
                        <span className="muted">
                          +{p.required_skills.length - 4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Link to={`/match?project_id=${p.id}`} className="btn-secondary">
                      Match →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
