import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, FormField, Input, Modal, PageHeader, Skeleton, Table, Tabs, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getConsents, getConsentTexts, grantConsent, revokeConsent, getAiLog, exportMyData, deleteMyAccount } from '../lib/privacy';
import { setPocPlan } from '../lib/packages';
import { isMissingEndpoint, logout } from '../lib/auth';
import { fmtDateTime, humanise } from '../lib/format';

function Account({ me }) {
  const p = me?.profile || {};
  return (
    <Card title="Account">
      <dl className="facts">
        <div><dt>Name</dt><dd>{p.full_name || 'Not set'}</dd></div>
        <div><dt>Email</dt><dd>{me?.user?.email}</dd></div>
        <div><dt>Role</dt><dd>{p.role ? humanise(p.role) : 'Founder'}</dd></div>
      </dl>
      <p className="ui-muted">To change your password, sign out and use "Forgot password" on the sign-in page.</p>
    </Card>
  );
}

function Privacy({ companyId }) {
  const toast = useToast();
  const navigate = useNavigate();
  const cQ = useApi(() => getConsents(companyId), [companyId]);
  const tQ = useApi(() => getConsentTexts(), []);
  const logQ = useApi(() => getAiLog(50), []);
  const [busy, setBusy] = useState(null);
  const [del, setDel] = useState(false);
  const [typed, setTyped] = useState('');

  const status = cQ.data?.status || {};
  const texts = tQ.data?.texts || [];
  const scopes = texts.length ? texts : Object.keys(status).map((k) => ({ scope: k }));

  async function toggle(t, on) {
    setBusy(t.scope);
    try {
      if (on) await grantConsent(t.scope, t.version || t.current, companyId);
      else await revokeConsent(t.scope, companyId);
      await cQ.reload();
      toast.success(on ? 'Consent recorded.' : 'Consent withdrawn. Rules-based methods are used from now on.');
    } catch (e) { toast.error(`Couldn't update consent: ${e.message}`); } finally { setBusy(null); }
  }
  async function doExport() {
    setBusy('export');
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = `deligato-data-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Your export is ready.');
    } catch (e) { toast.error(isMissingEndpoint(e) ? "Export isn't connected in this environment yet." : `Couldn't export: ${e.message}`); } finally { setBusy(null); }
  }
  async function doDelete() {
    setBusy('delete');
    try {
      await deleteMyAccount();
      logout();
      navigate('/login');
    } catch (e) { toast.error(isMissingEndpoint(e) ? "Account deletion isn't connected in this environment yet." : `Couldn't delete: ${e.message}`); setBusy(null); }
  }

  const granted = (scope) => {
    const s = status[scope];
    return Boolean(s && (s.granted === true || s === true || (s.granted_at && !s.revoked_at)));
  };

  return (
    <div className="ui-stack">
      <Card title="Consents" subtitle="What we send: company-level facts (stage, sector, raise, traction…), never names, emails, founder details or files. Nothing is used to train the provider's models.">
        {cQ.error || tQ.error ? (
          <Alert tone="warn">{isMissingEndpoint(cQ.error || tQ.error) ? "Consent settings aren't connected in this environment yet." : (cQ.error || tQ.error).message}</Alert>
        ) : !cQ.data || !tQ.data ? <Skeleton variant="text" lines={3} /> : (
          <ul className="consents">
            {scopes.map((t) => {
              const on = granted(t.scope);
              return (
                <li key={t.scope}>
                  <div>
                    <strong>{t.title || humanise(t.scope)}</strong>
                    {t.required_for && <p className="ui-muted">Used for {t.required_for}.</p>}
                    {!on && t.scope === 'ai_processing' && <p className="ui-faint">Off: your matches are ranked by rules only, and outreach uses templates.</p>}
                  </div>
                  <label className="switch">
                    <input type="checkbox" role="switch" checked={on} disabled={busy === t.scope} onChange={(e) => toggle(t, e.target.checked)} aria-label={t.title || t.scope} />
                    <span>{on ? 'On' : 'Off'}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title="AI call log" subtitle="Every AI request, with its purpose and the field names sent (never the values).">
        {logQ.error ? (
          <EmptyState compact icon="info" title={isMissingEndpoint(logQ.error) ? "The AI call log isn't connected in this environment yet." : "Couldn't load the AI call log."} />
        ) : (
          <Table dense loading={!logQ.data} rowKey={(r) => r.id || `${r.at}-${r.purpose}`} rows={logQ.data?.calls || logQ.data?.log || []}
            empty="No AI calls yet."
            columns={[
              { key: 'at', header: 'When', render: (r) => fmtDateTime(r.at || r.created_at) },
              { key: 'purpose', header: 'Purpose', render: (r) => humanise(String(r.purpose || '').split(':')[0]) },
              { key: 'provider', header: 'Provider' },
              { key: 'fields', header: 'Fields sent', render: (r) => (r.fields_sent || []).join(', ') || '–' },
            ]} />
        )}
      </Card>
      <Card title="Your data">
        <p>We'll prepare a file of everything Deligato holds about you.</p>
        <div className="ui-row">
          <Button variant="secondary" iconLeft="download" onClick={doExport} loading={busy === 'export'}>Export my data</Button>
          <Button variant="danger" onClick={() => setDel(true)}>Delete my Deligato account</Button>
        </div>
        <p className="ui-muted">Your company profile and readiness score live in Conncct and are not affected here.</p>
      </Card>
      <Modal open={del} onClose={() => setDel(false)} size="sm" title="Delete your Deligato account?"
        description="This permanently deletes your matches, pipeline, outreach drafts, data-room files and history here. Your Conncct profile and readiness score are not affected. This can't be undone."
        footer={<><Button variant="ghost" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" disabled={typed !== 'DELETE'} loading={busy === 'delete'} onClick={doDelete}>Delete my account</Button></>}>
        <FormField label="Type DELETE to confirm"><Input value={typed} onChange={(e) => setTyped(e.target.value)} /></FormField>
      </Modal>
    </div>
  );
}

function Plan({ companyId, plan, entitlements, reloadEntitlements }) {
  const toast = useToast();
  const [choice, setChoice] = useState(plan?.key || 'trial');
  const [busy, setBusy] = useState(false);
  const pocOn = import.meta.env.VITE_POC_PLAN_SWITCH === 'true';
  async function apply() {
    setBusy(true);
    try { await setPocPlan(companyId, choice); reloadEntitlements(); toast.success(`Plan set to ${choice}. POC: no payment taken.`); } catch (e) {
      toast.error(isMissingEndpoint(e) ? "The POC plan switch isn't available on this server." : e.message);
    } finally { setBusy(false); }
  }
  return (
    <div className="ui-stack">
      <Card title="Current plan" action={<Badge tone="brand">{plan?.label || 'Free'}</Badge>}>
        <p>Matches: {plan?.limits?.max_results === 5 ? 'top 5' : `up to ${plan?.limits?.max_results ?? 5}`} · Contact routes: {entitlements?.investor_profile_depth === 'full_with_contact' ? 'shown' : 'hidden'} · Pipeline: {plan?.limits?.pipeline ? 'yes' : 'no'} · Outreach drafts: {entitlements?.outreach_drafts_per_month || 0} a month</p>
        <Button as={Link} to="/packages" variant="secondary">See packages</Button>
      </Card>
      {pocOn && (
        <Card title="POC plan switcher (testing only)" subtitle="No payment is taken. The server refuses this unless its POC flag is on.">
          <div className="ui-row">
            {['trial', 'access', 'concierge'].map((p) => <label key={p} className="check"><input type="radio" name="poc" checked={choice === p} onChange={() => setChoice(p)} /> {p}</label>)}
            <Button variant="primary" size="sm" onClick={apply} loading={busy}>Apply</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { me, companyId, plan, entitlements, reloadEntitlements } = useCompany();
  const [params, setParams] = useSearchParams();
  const tab = ['account', 'privacy', 'plan'].includes(params.get('tab')) ? params.get('tab') : 'account';
  return (
    <div>
      <PageHeader title="Settings" />
      <Tabs label="Settings" value={tab} onChange={(t) => setParams({ tab: t })} items={[{ id: 'account', label: 'Account' }, { id: 'privacy', label: 'Privacy and AI' }, { id: 'plan', label: 'Plan' }]}>
        {(t) => (t === 'account' ? <Account me={me} /> : t === 'privacy' ? <Privacy companyId={companyId} /> : <Plan companyId={companyId} plan={plan} entitlements={entitlements} reloadEntitlements={reloadEntitlements} />)}
      </Tabs>
    </div>
  );
}
