// /invite/:token: the link an owner or admin sends (api modules/team builds it).
// Signed out: remember the token for this tab, then sign in or create an account.
// Signed in: join with one click. The API checks the token, its expiry, the
// invited email and the seat limit; this page shows its answer as given.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button } from '../design/ui';
import AuthLayout from '../components/AuthLayout';
import { getToken } from '../lib/auth';
import { acceptInvite, forgetInvite, isInviteToken, rememberInvite } from '../lib/team';
import { roleLabel } from '../lib/access';

const ACTIVE_KEY = 'conncct.active_company'; // CompanyProvider's key (internal identifier)

export default function InviteAcceptPage() {
  const { token } = useParams();
  const valid = isInviteToken(token);
  const signedIn = Boolean(getToken());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(null);

  useEffect(() => { if (valid && !signedIn) rememberInvite(token); }, [valid, signedIn, token]);

  async function join() {
    setBusy(true); setError(null);
    try {
      const out = await acceptInvite(token);
      forgetInvite();
      try { localStorage.setItem(ACTIVE_KEY, out.company_id); } catch { /* the company list still shows it */ }
      setJoined(out);
    } catch (e) {
      if (e.status === 410 || e.status === 400) forgetInvite();
      setError(e);
    } finally { setBusy(false); }
  }

  if (!valid) {
    return (
      <AuthLayout title="Invitation" subtitle="This invite link is not complete.">
        <Alert tone="warn">Open the link exactly as it was sent to you, or ask for a new invite.</Alert>
        <p className="login-alt"><Link to="/">Go to Deligato</Link></p>
      </AuthLayout>
    );
  }

  if (!signedIn) {
    return (
      <AuthLayout title="Join your team" subtitle="You've been invited to a company on Deligato.">
        <p>Sign in with the email address the invite was sent to. New to Deligato? Create an account with that address first.</p>
        <div className="ui-stack">
          <Button as={Link} to="/login" variant="primary" block>Sign in to accept</Button>
          <Button as={Link} to="/signup" variant="secondary" block>Create an account</Button>
        </div>
      </AuthLayout>
    );
  }

  if (joined) {
    return (
      <AuthLayout title="You've joined" subtitle={`You're now ${roleLabel(joined.role).toLowerCase()} on ${joined.company_name || 'the company'}.`}>
        <Button variant="primary" block onClick={() => window.location.assign('/')}>Open {joined.company_name || 'the company'}</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Join your team" subtitle="Accept the invitation to work on this company in Deligato.">
      {error && <Alert tone={error.status === 402 ? 'warn' : 'bad'}>{error.message}</Alert>}
      <div className="ui-stack">
        <Button variant="primary" block loading={busy} onClick={join} disabled={Boolean(error && (error.status === 410 || error.status === 400))}>Accept invitation</Button>
        <Button as={Link} to="/" variant="ghost" block>Not now</Button>
      </div>
    </AuthLayout>
  );
}
