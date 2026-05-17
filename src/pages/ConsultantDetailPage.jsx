import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

const BRAND_PURPLE = '#3C3489';
const SOFT_BG = '#F4F3FF';
const CARD_BG = '#FFFFFF';
const SHADOW = '0 22px 60px rgba(60, 52, 137, 0.12)';

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
  const initials = consultant
    ? consultant.full_name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
    : '';

  const pageStyle = {
    minHeight: '100vh',
    backgroundColor: SOFT_BG,
    padding: '32px',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#1b1b31',
  };

  const containerStyle = {
    maxWidth: 1040,
    margin: '0 auto',
    display: 'grid',
    gap: '24px',
  };

  const cardStyle = {
    backgroundColor: CARD_BG,
    borderRadius: '28px',
    boxShadow: SHADOW,
    padding: '32px',
  };

  const backButtonStyle = {
    border: '1px solid rgba(60, 52, 137, 0.16)',
    background: '#fff',
    color: BRAND_PURPLE,
    borderRadius: '14px',
    padding: '12px 18px',
    cursor: 'pointer',
    fontWeight: 600,
    boxShadow: '0 10px 25px rgba(60, 52, 137, 0.08)',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.05,
  };

  const subtitleStyle = {
    margin: '12px 0 0',
    color: '#5f5f7b',
    fontSize: '16px',
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    backgroundColor: SOFT_BG,
    color: BRAND_PURPLE,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: '10px 16px',
    fontSize: '12px',
  };

  const avatarStyle = {
    width: '110px',
    height: '110px',
    borderRadius: '28px',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: BRAND_PURPLE,
    color: '#fff',
    fontSize: '32px',
    fontWeight: 700,
    boxShadow: '0 20px 40px rgba(60, 52, 137, 0.18)',
  };

  const statCardStyle = {
    ...cardStyle,
    padding: '26px',
    minHeight: '136px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  const statLabelStyle = {
    fontSize: '14px',
    color: '#7c78a0',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
  };

  const statValueStyle = {
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: 1.2,
  };

  const sectionTitleStyle = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#241f48',
  };

  const sectionTextStyle = {
    marginTop: '16px',
    color: '#54507c',
    lineHeight: 1.75,
    fontSize: '15px',
  };

  const skillTagStyle = (index) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    borderRadius: '14px',
    margin: '6px',
    backgroundColor: ['#E9E4FF', '#F4EEFF', '#FBE9FF', '#F3F7FF'][index % 4],
    color: '#3B2F9E',
    fontSize: '14px',
    fontWeight: 600,
  });

  const actionPrimaryStyle = {
    backgroundColor: BRAND_PURPLE,
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    padding: '15px 24px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    boxShadow: '0 18px 40px rgba(60, 52, 137, 0.18)',
  };

  const actionOutlineStyle = {
    backgroundColor: '#fff',
    color: BRAND_PURPLE,
    border: `2px solid ${BRAND_PURPLE}`,
    borderRadius: '16px',
    padding: '15px 24px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
  };

  if (error) {
    return (
      <section style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <button style={backButtonStyle} onClick={handleBack}>← Back</button>
            <p style={{ marginTop: '24px', color: '#9f83e4', fontSize: '16px' }}>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!consultant) {
    return (
      <section style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <button style={backButtonStyle} onClick={handleBack}>← Back</button>
            <p style={{ marginTop: '24px', color: '#5f5f7b', fontSize: '16px' }}>Loading consultant…</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <button style={backButtonStyle} onClick={handleBack}>← Back</button>
          <div style={{ color: '#7c78a0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Consultant profile</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '28px', alignItems: 'center' }}>
            <div style={avatarStyle}>{initials}</div>

            <div>
              <h1 style={titleStyle}>{consultant.full_name}</h1>
              <p style={subtitleStyle}>{consultant.location || 'Location unavailable'}</p>
              <div style={{ marginTop: '18px' }}>
                <span style={badgeStyle}>{consultant.availability || 'Unknown'}</span>
              </div>
            </div>

            <div style={{ backgroundColor: SOFT_BG, borderRadius: '24px', padding: '22px 26px', textAlign: 'center' }}>
              <div style={{ color: '#7c78a0', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '12px', marginBottom: '10px' }}>Daily rate</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#241f48' }}>
                {consultant.daily_rate_gbp ? `£${consultant.daily_rate_gbp}/day` : 'Rate t.b.c.'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '20px' }}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Seniority</div>
            <div style={statValueStyle}>{consultant.seniority || '—'}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Daily rate</div>
            <div style={statValueStyle}>{consultant.daily_rate_gbp ? `£${consultant.daily_rate_gbp}/day` : 'TBC'}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Availability</div>
            <div style={statValueStyle}>{consultant.availability || '—'}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Location</div>
            <div style={statValueStyle}>{consultant.location || 'Remote / Hybrid'}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Skills</h2>
          <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {(consultant.skills || []).length > 0 ? (
              consultant.skills.map((skill, index) => (
                <div key={skill} style={skillTagStyle(index)}>{skill}</div>
              ))
            ) : (
              <p style={sectionTextStyle}>No skills listed for this consultant.</p>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>About</h2>
          <p style={sectionTextStyle}>{consultant.bio || 'No bio available. This consultant has not added a profile description yet.'}</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button style={actionPrimaryStyle}>Allocate to Project</button>
          <button style={actionOutlineStyle}>Send Message</button>
        </div>
      </div>
    </section>
  );
}
