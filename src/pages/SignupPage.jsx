import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../lib/auth';

const ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'employee', label: 'Employee / Consultant' },
  { value: 'finance', label: 'Finance' },
  { value: 'executive_hr', label: 'Executive / HR' },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'project_manager',
    organization: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(form);
      navigate('/');
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
        <p className="tagline">Get started in 30 seconds</p>

        <h2>Create your account</h2>
        <form onSubmit={onSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              minLength={8}
              required
            />
            <small>at least 8 characters</small>
          </label>
          <label>
            Your role
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label>
            Consultancy / company (optional)
            <input
              type="text"
              value={form.organization}
              onChange={(e) => set('organization', e.target.value)}
              placeholder="e.g. Acme Consulting"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
