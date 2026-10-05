import { useState } from 'react';
import { Button } from '../design/ui';
import { apiFetch } from '../lib/auth';

/** "Resend the confirmation email" (incident 5 Oct). The API answers the same way whether or not the account exists. */
export default function ResendConfirmation({ email }) {
  const [state, setState] = useState({ busy: false, msg: null, err: null });
  async function resend() {
    setState({ busy: true, msg: null, err: null });
    try {
      const r = await apiFetch('/auth/resend-confirmation', { method: 'POST', body: JSON.stringify({ email }) });
      setState({ busy: false, msg: (r && r.message) || 'If this email has an unconfirmed account, we have sent a new confirmation link.', err: null });
    } catch (e) {
      setState({ busy: false, msg: null, err: e.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'We could not send it right now. Try again shortly.' });
    }
  }
  return (
    <div className="ui-stack resend-confirm">
      <Button type="button" variant="secondary" block loading={state.busy} disabled={!email} onClick={resend}>Resend the confirmation email</Button>
      {state.msg && <p className="login-alt" role="status">{state.msg} Check your spam or junk folder too.</p>}
      {state.err && <p className="login-alt" role="alert">{state.err}</p>}
    </div>
  );
}
