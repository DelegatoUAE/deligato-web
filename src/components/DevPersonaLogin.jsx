// DEV ONLY. Imported behind import.meta.env.DEV, so production builds drop it.
// Signs in as one of the six seeded QA personas through the API's dev-login
// endpoint (DEV_AUTH=true, loopback only, refused in production). No password
// is typed or stored; the token goes through the normal auth path.
import { useState } from 'react';
import { Alert, Button } from '../design/ui';
import useApi from '../lib/useApi';
import { apiFetch, setToken } from '../lib/auth';

const PERSONAS = [
  { key: 'uae-fintech-seed', id: '00000000-0000-4000-a000-000000000001', email: 'founder.uae@test.local', label: 'Ledgerline · UAE fintech · Seed' },
  { key: 'us-ai-devtools-preseed', id: '00000000-0000-4000-a000-000000000002', email: 'founder.us@test.local', label: 'Stackhound · US devtools · Pre-seed' },
  { key: 'saudi-proptech-series-a', id: '00000000-0000-4000-a000-000000000003', email: 'founder.ksa@test.local', label: 'Bayt Grid · KSA proptech · Series A' },
  { key: 'uk-climate-hardware-seed-lowready', id: '00000000-0000-4000-a000-000000000004', email: 'founder.uk@test.local', label: 'Thermadyne Loop · UK climate hardware · Seed' },
  { key: 'egypt-edtech-preseed-revenue', id: '00000000-0000-4000-a000-000000000005', email: 'founder.eg@test.local', label: 'Fasla · Egypt edtech · Pre-seed' },
  { key: 'india-healthtech-series-a-strong', id: '00000000-0000-4000-a000-000000000006', email: 'founder.in@test.local', label: 'PulseCare · India healthtech · Series A' },
];

async function probe() {
  try {
    const out = await apiFetch('/auth/dev-login/personas');
    const list = Array.isArray(out) ? out : out?.personas || [];
    return { available: true, personas: list.length ? list : null };
  } catch {
    return { available: false, personas: null };
  }
}

export default function DevPersonaLogin({ onSignedIn }) {
  const q = useApi(probe, []);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  if (!q.data?.available) return null;
  const list = (q.data.personas || PERSONAS).map((p) => {
    const fixed = PERSONAS.find((x) => x.key === (p.key || p.persona_key) || x.id === (p.user_id || p.id));
    return { ...fixed, ...p, key: p.key || p.persona_key || fixed?.key, id: p.user_id || p.id || fixed?.id, label: fixed?.label || p.company_name || p.key };
  });

  async function signIn(p) {
    setBusy(p.key || p.id); setError(null);
    try {
      const out = await apiFetch('/auth/dev-login', { method: 'POST', body: JSON.stringify(p.key ? { persona_key: p.key } : { user_id: p.id }) });
      const token = out?.session?.access_token || out?.access_token;
      if (!token) throw new Error('The dev-login response had no token.');
      setToken(token);
      onSignedIn?.();
    } catch (e) { setError(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="devlogin">
      <p className="devlogin-h">Sign in as test persona <span>(development only)</span></p>
      <div className="devlogin-list">
        {list.map((p) => (
          <Button key={p.key || p.id} variant="secondary" size="sm" block loading={busy === (p.key || p.id)} disabled={Boolean(busy)} onClick={() => signIn(p)}>{p.label}</Button>
        ))}
      </div>
      {error && <Alert tone="bad">{error}</Alert>}
    </div>
  );
}
