import { useState } from 'react';
import { Alert, Button, Card, PageHeader, Textarea, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import { PERSONA_FIXTURES, importFixture, validatePayload } from '../lib/companies';
import { isMissingEndpoint } from '../lib/auth';

/** Dev only (H13): load the 6 QA personas, or a pasted payload, as if Conncct sent them. */
export default function DevImportPage() {
  const { reloadCompanies } = useCompany();
  const toast = useToast();
  const [chosen, setChosen] = useState(PERSONA_FIXTURES[0].key);
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function run(label, fn) {
    setBusy(label); setError(null); setResult(null);
    try {
      const out = await fn();
      setResult(out);
      reloadCompanies();
    } catch (e) {
      setError(isMissingEndpoint(e) ? 'The dev import endpoints (/api/v1/conncct/dev/*) are not mounted in this API yet.' : e.body?.error?.details ? e.body.error.details.map((d) => `${d.path}: ${d.message}`).join(' · ') : e.message);
    } finally { setBusy(null); }
  }
  const parse = () => { try { return JSON.parse(json); } catch { throw new Error('That is not valid JSON.'); } };

  return (
    <div>
      <PageHeader title="Import a test company (dev)" subtitle="Load a QA persona, or any payload, as if a readiness partner had sent it. Staff and development only." />
      <Card title="Fixtures">
        <ul className="fixtures">
          {PERSONA_FIXTURES.map((f) => (
            <li key={f.key}><label className="check"><input type="radio" name="fx" checked={chosen === f.key} onChange={() => setChosen(f.key)} /> {f.label} <span className="ui-faint">{f.company_id}</span></label></li>
          ))}
        </ul>
        <div className="ui-row">
          <Button variant="primary" loading={busy === 'one'} onClick={() => run('one', () => importFixture({ fixture_key: chosen }))}>Import selected</Button>
          <Button variant="secondary" loading={busy === 'all'} onClick={() => run('all', async () => {
            const out = [];
            for (const f of PERSONA_FIXTURES) out.push(await importFixture({ fixture_key: f.key }));
            toast.success('Imported all 6 personas.');
            return out;
          })}>Import all 6</Button>
        </div>
      </Card>
      <Card title="Or paste a payload">
        <Textarea rows={8} value={json} onChange={(e) => setJson(e.target.value)} placeholder='{ "payload_version": "1.0", "company": {…}, "readiness": {…} }' />
        <div className="ui-row">
          <Button variant="secondary" loading={busy === 'val'} onClick={() => run('val', () => validatePayload(parse()))}>Validate</Button>
          <Button variant="primary" loading={busy === 'imp'} onClick={() => run('imp', () => importFixture({ payload: parse() }))}>Import</Button>
        </div>
      </Card>
      {error && <Alert tone="bad">{error}</Alert>}
      {result && <Alert tone="ok" title="Done"><pre className="pre-small">{JSON.stringify(result, null, 2)}</pre></Alert>}
    </div>
  );
}
