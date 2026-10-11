import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, FormField, Input } from '../design/ui';
import AuthLayout from '../components/AuthLayout';
import { publicAuthError } from '../lib/errorDetails';
import { apiFetch } from '../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(publicAuthError(err, "Couldn't send the reset link right now. Try again shortly."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="ui-stack">
          <Alert tone="ok" title="Check your email">If an account exists for {email}, a reset link is on its way. It expires in an hour.</Alert>
          <Button as={Link} to="/login" variant="secondary" block>Back to sign in</Button>
        </div>
      ) : (
        <form className="ui-stack" onSubmit={onSubmit}>
          <FormField label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" variant="primary" block loading={busy}>Email me a reset link</Button>
          <p className="login-alt"><Link to="/login">Back to sign in</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}
