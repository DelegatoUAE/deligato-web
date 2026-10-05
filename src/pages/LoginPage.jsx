import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, FormField, Input } from '../design/ui';
import AuthLayout from '../components/AuthLayout';
import { afterSignIn } from '../lib/team';
import PasswordInput from '../components/PasswordInput';
import { publicAuthError } from '../lib/errorDetails';
import { login } from '../lib/auth';
import ResendConfirmation from '../components/ResendConfirmation';

// Compiled out of production builds (Vite replaces import.meta.env.DEV with false).
const DevPersonaLogin = import.meta.env.DEV ? lazy(() => import('../components/DevPersonaLogin')) : null;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setBusy(true);
    try {
      await login(email, password);
      navigate(afterSignIn('/'));
    } catch (err) {
      // The API says "Confirm your email…" only after the password matched (L-6); keep that message.
      const notConfirmed = err.status === 401 && /confirm your email/i.test(String(err.message || ''));
      setUnconfirmed(notConfirmed);
      setError(notConfirmed ? err.message : err.status === 401 ? "That email and password don't match an account." : publicAuthError(err, 'Sign-in is unavailable right now. Try again shortly.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Pick up where your company left off.">
      <form className="ui-stack" onSubmit={onSubmit}>
        <FormField label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
        <FormField label="Password"><PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormField>
        {error && <Alert tone="bad">{error}</Alert>}
        {unconfirmed && <ResendConfirmation email={email} />}
        <Button type="submit" variant="primary" block loading={busy}>Sign in</Button>
        <p className="login-alt"><Link to="/forgot-password">Forgot password?</Link> · New here? <Link to="/signup">Create an account</Link></p>
      </form>
      {DevPersonaLogin && (
        <Suspense fallback={null}>
          <DevPersonaLogin onSignedIn={() => navigate(afterSignIn('/'))} />
        </Suspense>
      )}
    </AuthLayout>
  );
}
