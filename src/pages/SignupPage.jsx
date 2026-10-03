import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, ChipToggle, FormField, Input } from '../design/ui';
import AuthLayout from '../components/AuthLayout';
import { apiFetch, setToken } from '../lib/auth';

const DevRegister = import.meta.env.DEV ? lazy(() => import('../components/DevRegister')) : null;

/** Register: every self-registered account is a founder (or SME); staff roles are assigned by an admin. */
export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', organization: '', account_type: 'founder' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setError(null);
    setBusy(true);
    try {
      const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(form) });
      setToken(data.session.access_token);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Then tell us about your company. It takes about three minutes.">
      <form className="ui-stack" onSubmit={onSubmit}>
        <FormField label="Your name" required><Input autoComplete="name" value={form.full_name} onChange={set('full_name')} required /></FormField>
        <FormField label="Work email" required><Input type="email" autoComplete="email" value={form.email} onChange={set('email')} required /></FormField>
        <FormField label="Password" required hint="At least 8 characters."><Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required /></FormField>
        <FormField label="Company name" optional><Input autoComplete="organization" value={form.organization} onChange={set('organization')} /></FormField>
        <FormField label="Which describes you?">
          {() => <ChipToggle single label="Account type" value={[form.account_type]} onChange={(v) => setForm({ ...form, account_type: v[0] || 'founder' })}
            options={[{ key: 'founder', label: 'A startup raising capital' }, { key: 'sme', label: 'An established business looking for growth or working capital' }]} />}
        </FormField>
        {error && <Alert tone="bad">{error}</Alert>}
        <Button type="submit" variant="accent" block loading={busy}>Create account</Button>
        <p className="login-alt">Already have an account? <Link to="/login">Sign in</Link></p>
        <p className="ui-faint">By creating an account you agree to how we handle your data: company facts only go to AI with your consent, and you can export or delete everything at any time.</p>
      </form>
      {DevRegister && (
        <Suspense fallback={null}>
          <DevRegister fullName={form.full_name} email={form.email} onCreated={() => navigate('/onboarding')} />
        </Suspense>
      )}
    </AuthLayout>
  );
}
