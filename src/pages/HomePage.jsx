import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, logout } from '../lib/auth';

export default function HomePage({ me }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/health/db')
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  function onLogout() {
    logout();
    navigate('/login');
  }

  const profile = me?.profile || {};
  const roleLabel = {
    project_manager: 'Project Manager',
    employee: 'Employee',
    finance: 'Finance',
    executive_hr: 'Executive / HR',
  }[profile.role] || profile.role;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand-mark">Deligato</div>
        <div className="user-chip">
          <span>{profile.full_name || me?.user?.email}</span>
          <span className="role-pill">{roleLabel}</span>
          <button className="link-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <main className="content">
        <section className="welcome">
          <h1>Welcome back, {(profile.full_name || '').split(' ')[0] || 'there'} 👋</h1>
          <p>Day 5 milestone: your React frontend is live and talking to the API.</p>
        </section>

        <section className="cards">
          <div className="card">
            <div className="card-label">Consultants</div>
            <div className="card-value">{stats ? stats.rows.consultants : '…'}</div>
            <div className="card-foot">in your pool</div>
          </div>
          <div className="card">
            <div className="card-label">Projects</div>
            <div className="card-value">{stats ? stats.rows.projects : '…'}</div>
            <div className="card-foot">tracked</div>
          </div>
          <div className="card">
            <div className="card-label">Allocations</div>
            <div className="card-value">{stats ? stats.rows.project_allocations : '…'}</div>
            <div className="card-foot">live matches</div>
          </div>
          <div className="card">
            <div className="card-label">Team members</div>
            <div className="card-value">{stats ? stats.rows.users : '…'}</div>
            <div className="card-foot">on Deligato</div>
          </div>
        </section>

        {error && <div className="error">Could not load stats: {error}</div>}

        <section className="next-up">
          <h2>What's next</h2>
          <ul>
            <li>Day 6 — Project Manager dashboard with consultant list & matching screen</li>
            <li>Day 7 — Wire OpenAI for the AI matching engine</li>
            <li>Day 8 — Mobile app (React Native)</li>
            <li>Day 9 — Deploy API to Railway, ship demo</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
