import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button } from '../../design/ui';
import { apiFetch } from '../../lib/auth';

// DEVELOPMENT ONLY. Loaded through import.meta.env.DEV, so it never ships in a production build.
// The API's test adapter (BILLING_TEST_ADAPTER=on) takes no payment; completing runs the same
// state machine a signed provider webhook runs. The API refuses to start with it in production.
const PATH = /^\/api\/v1\/billing\/test\/checkouts\/[0-9a-f-]{36}\/complete$/i;

export default function TestCheckout({ out, onDone }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const path = PATH.test(out?.test_complete_path || '') ? out.test_complete_path : null;
  async function complete() {
    setBusy(true);
    try {
      await apiFetch(path, { method: 'POST', body: '{}' });
      onDone();
      navigate('/settings/billing?checkout=success');
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  function cancel() { onDone(); navigate('/settings/billing?checkout=cancelled'); }
  return (
    <div className="co-test">
      <Alert tone="warn" title="Development test checkout">No payment is taken. This stands in for the payment provider&apos;s page and exists only in development.</Alert>
      {err && <Alert tone="bad">{err}</Alert>}
      <div className="ui-row">
        <Button variant="ghost" onClick={cancel} disabled={busy}>Cancel (return as cancelled)</Button>
        <Button variant="primary" onClick={complete} loading={busy} disabled={!path}>Complete test checkout</Button>
      </div>
    </div>
  );
}
