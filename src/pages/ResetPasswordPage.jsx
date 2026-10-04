import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, FormField, useToast } from '../design/ui';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import { apiFetch } from '../lib/auth';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    setError(null);
    setBusy(true);
    try {
      await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password">
      {!token ? (
        <div className="ui-stack">
          <Alert tone="bad">This reset link isn't valid. Request a new one.</Alert>
          <Button as={Link} to="/forgot-password" variant="primary" block>Request a new link</Button>
        </div>
      ) : (
        <form className="ui-stack" onSubmit={onSubmit}>
          <FormField label="New password" hint="At least 8 characters."><PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormField>
          <FormField label="Repeat it"><PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></FormField>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" variant="primary" block loading={busy}>Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
