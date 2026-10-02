import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, FormField, Input } from '../design/ui';
import { login } from '../lib/auth';

// Compiled out of production builds (Vite replaces import.meta.env.DEV with false).
const DevPersonaLogin = import.meta.env.DEV ? lazy(() => import('../components/DevPersonaLogin')) : null;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.status === 401 ? 'That email and password don\'t match an account.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-side ui-on-navy">
        <div className="ui-wordmark">Conncct</div>
        <p className="login-line">Understand your business. Become capital ready. Find the right capital. Get the right expertise. Execute the raise.</p>
        <p className="login-foot">We help you with fundraising. We never fundraise for you.</p>
      </aside>
      <main className="login-main">
        <form className="login-form" onSubmit={onSubmit}>
          <h1>Sign in</h1>
          <FormField label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
          <FormField label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormField>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" variant="primary" block loading={busy}>Sign in</Button>
          <p className="login-alt"><Link to="/forgot-password">Forgot password?</Link> · New here? <Link to="/signup">Create an account</Link></p>
          {DevPersonaLogin && (
            <Suspense fallback={null}>
              <DevPersonaLogin onSignedIn={() => navigate('/')} />
            </Suspense>
          )}
        </form>
      </main>
    </div>
  );
}
