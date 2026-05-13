import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setBusy(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="brand">Deligato</h1>
        <p className="tagline">AI-powered resource allocation for consultancies</p>

        <h2>Reset password</h2>
        {success ? (
          <div className="success-box">
            <p style={{ margin: '0 0 12px', fontWeight: 500 }}>Check your email</p>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-soft)' }}>
              We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
            </p>
            <Link to="/login" className="link-button">
              Back to Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
              />
            </label>
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className="alt" style={{ marginTop: success ? '16px' : '20px' }}>
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
