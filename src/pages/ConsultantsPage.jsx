import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

const SENIORITIES = ['all', 'junior', 'mid', 'senior', 'principal'];
const AVAILABILITIES = ['all', 'available', 'partial', 'booked', 'leave'];

export default function ConsultantsPage() {
  const navigate = useNavigate();
  const [consultants, setConsultants] = useState(null);
  const [seniority, setSeniority] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [skill, setSkill] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setConsultants(null);
    setError(null);
    const params = new URLSearchParams();
    if (seniority !== 'all') params.set('seniority', seniority);
    if (availability !== 'all') params.set('availability', availability);
    if (skill.trim()) params.set('skill', skill.trim());
    const qs = params.toString();
    apiFetch(`/consultants${qs ? '?' + qs : ''}`)
      .then((d) => setConsultants(d.consultants))
      .catch((e) => setError(e.message));
  }, [seniority, availability, skill]);

  return (
    <section>
      <div className="page-header">
        <h1>Consultants</h1>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search by skill (e.g. React, OpenAI)"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />
        <select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
          {SENIORITIES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Any seniority' : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
          {AVAILABILITIES.map((a) => (
            <option key={a} value={a}>
              {a === 'all' ? 'Any availability' : a[0].toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {!consultants ? (
        <div className="empty">Loading consultants…</div>
      ) : consultants.length === 0 ? (
        <div className="empty">No consultants match these filters.</div>
      ) : (
        <div className="consultant-grid">
          {consultants.map((c) => (
            <div key={c.id} className="consultant-card" onClick={() => navigate(`/consultants/${c.id}`)}>
              <div className="consultant-head">
                <div className="avatar">{c.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
                <div>
                  <div className="consultant-name">{c.full_name}</div>
                  <div className="muted">{c.location || '—'}</div>
                </div>
                <span className={`avail-pill avail-${c.availability}`}>
                  {c.availability}
                </span>
              </div>
              <div className="tag-row">
                {(c.skills || []).map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))}
              </div>
              <div className="consultant-meta">
                <span><strong>{c.seniority || '—'}</strong> · {c.daily_rate_gbp ? '£' + c.daily_rate_gbp + '/day' : 'rate t.b.c.'}</span>
              </div>
              {c.bio && <p className="bio">{c.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
