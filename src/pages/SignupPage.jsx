import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, ChipToggle, FormField, Input } from '../design/ui';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { publicAuthError } from '../lib/errorDetails';
import { apiFetch, setSession } from '../lib/auth';

const DevRegister = import.meta.env.DEV ? lazy(() => import('../components/DevRegister')) : null;

/** Register: every self-registered account is a founder (or SME); staff roles are assigned by an admin. */
export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', organization: '', account_type: 'founder' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [pwError, setPwError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    // UAT F29: the error sits on the field, and focus moves there.
    if (form.password.length < 8) { setPwError('Use at least 8 characters for your password.'); document.getElementById('signup-password')?.focus(); return; }
    setPwError(null);
    setError(null);
    setBusy(true);
    try {
      const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(form) });
      // Production confirms the email first: the account exists but there is no session yet.
      if (data && data.session && data.session.access_token) {
        setSession(data.session);
        navigate('/onboarding');
      } else {
        setSent(data && data.message ? data.message : 'Check your email to confirm your address, then sign in.');
      }
    } catch (err) {
      // UAT F16: a server fault never shows its internals (e.g. an env variable name).
      setError(publicAuthError(err, 'Sign-up is unavailable right now. Try again shortly.'));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${form.email}.`}>
        <div className="ui-stack">
          <Alert tone="ok">{sent}</Alert>
          <p className="login-alt">Confirmed already? <Link to="/login">Sign in</Link></p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Free to start. Then tell us about your company; it takes about three minutes.">
      <form className="ui-stack" onSubmit={onSubmit}>
        <FormField label="Your name" required><Input autoComplete="name" value={form.full_name} onChange={set('full_name')} required /></FormField>
        <FormField label="Work email" required><Input type="email" autoComplete="email" value={form.email} onChange={set('email')} required /></FormField>
        <FormField label="Password" required hint="At least 8 characters." error={pwError}><PasswordInput id="signup-password" autoComplete="new-password" value={form.password} onChange={set('password')} required /></FormField>
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
