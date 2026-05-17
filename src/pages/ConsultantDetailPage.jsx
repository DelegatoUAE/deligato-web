import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

export default function ConsultantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultant, setConsultant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setConsultant(null);
    setError(null);
    apiFetch(`/consultants/${id}`)
      .then((d) => setConsultant(d.consultant || d))
      .catch((e) => setError(e.message));
  }, [id]);

  const handleBack = () => navigate('/consultants');

  if (error) {
    return (
      <section>
        <div className="page-header">
          <button onClick={handleBack} className="back-button">← Back</button>
        </div>
        <div className="error">{error}</div>
      </section>
    );
  }

  if (!consultant) {
    return (
      <section>
        <div className="page-header">
          <button onClick={handleBack} className="back-button">← Back</button>
        </div>
        <div className="empty">Loading consultant…</div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <button onClick={handleBack} className="back-button">← Back</button>
        <h1>{consultant.full_name}</h1>
      </div>

      <div className="consultant-detail">
        <div className="consultant-header">
          <div className="avatar-large">{consultant.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
          <div className="consultant-info">
            <h2>{consultant.full_name}</h2>
            <p className="location">{consultant.location || '—'}</p>
            <span className={`avail-pill avail-${consultant.availability}`}>
              {consultant.availability}
            </span>
          </div>
        </div>

        <div className="consultant-body">
          <div className="detail-section">
            <h3>Skills</h3>
            <div className="tag-row">
              {(consultant.skills || []).length > 0 ? (
                consultant.skills.map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))
              ) : (
                <p className="muted">No skills listed</p>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3>Experience</h3>
            <p><strong>Seniority:</strong> {consultant.seniority || '—'}</p>
          </div>

          <div className="detail-section">
            <h3>Rate</h3>
            <p><strong>Daily Rate:</strong> {consultant.daily_rate_gbp ? '£' + consultant.daily_rate_gbp + '/day' : 'Rate t.b.c.'}</p>
          </div>

          {consultant.bio && (
            <div className="detail-section">
              <h3>Bio</h3>
              <p>{consultant.bio}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
