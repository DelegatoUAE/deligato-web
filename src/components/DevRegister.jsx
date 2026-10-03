// DEV ONLY. Imported behind import.meta.env.DEV, so production builds drop it.
// Creates a brand-new local founder through the API's dev-register endpoint
// (DEV_AUTH=true, loopback only, never Supabase). No password is typed or
// stored; the token goes through the normal auth path.
import { useState } from 'react';
import { Alert, Button } from '../design/ui';
import { apiFetch, setToken } from '../lib/auth';

export default function DevRegister({ fullName, email, onCreated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const body = {
        email: /@example\.test$/i.test(email || '') ? email : `founder+${Date.now()}@example.test`,
        full_name: (fullName || '').trim() || 'Test Founder',
      };
      const out = await apiFetch('/auth/dev-register', { method: 'POST', body: JSON.stringify(body) });
      const token = out?.session?.access_token;
      if (!token) throw new Error('The dev-register response had no token.');
      setToken(token);
      onCreated?.(out);
    } catch (e) {
      setError(e.status === 404 || e.status === 405 ? 'Test accounts are switched off on this API (DEV_AUTH).' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="devlogin">
      <p className="devlogin-h">Create a test account <span>(development only)</span></p>
      <p className="ui-faint">A new local founder with no company, under an @example.test address. Uses your name above if you typed one.</p>
      <Button variant="secondary" size="sm" block loading={busy} onClick={create}>Create a test account</Button>
      {error && <Alert tone="bad">{error}</Alert>}
    </div>
  );
}
