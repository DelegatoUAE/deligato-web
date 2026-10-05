import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, FormField, Input, Modal, PageHeader, Skeleton, Table, Tabs, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import AppearanceSetting from '../components/AppearanceSetting';
import TeamAccess from '../components/TeamAccess';
import useApi from '../lib/useApi';
import { getConsents, getConsentTexts, grantConsent, revokeConsent, getAiLog, exportMyData, deleteMyAccount } from '../lib/privacy';
import PlanBilling from '../components/billing/PlanBilling';
import { getNotifications, isUnavailable } from '../lib/companyIntel';
import { SETTINGS_TABS, settingsTab } from '../lib/portal';
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
        
      </Card>
      <Modal open={del} onClose={() => setDel(false)} size="sm" title="Delete your Deligato account?"
        description="This permanently deletes your matches, pipeline, outreach drafts, data-room files and history here. This can't be undone."
        footer={<><Button variant="ghost" onClick={() => setDel(false)}>Cancel</Button><Button variant="danger" disabled={typed !== 'DELETE'} loading={busy === 'delete'} onClick={doDelete}>Delete my account</Button></>}>
        <FormField label="Type DELETE to confirm"><Input value={typed} onChange={(e) => setTyped(e.target.value)} /></FormField>
      </Modal>
    </div>
  );
}

const LEVEL = { monthly_digest: 'A monthly digest', events: 'A monthly digest, plus event and deadline alerts', raise: 'Event, deadline and raise alerts' };
const EMAIL = { ready: 'Email is on for these alerts.', not_configured: 'Email isn\'t set up yet, so notifications appear in the app only.', disabled: 'Email is off, so notifications appear in the app only.' };
const KIND = { digest: 'Monthly digest', alert: 'Alert' };

function Notifications({ companyId }) {
  const q = useApi(() => (companyId ? getNotifications(companyId) : null), [companyId]);
  if (!companyId) return <Card title="Notifications"><p className="ui-muted">Notifications start once your company is set up.</p></Card>;
  if (q.error) return <Card title="Notifications"><Alert tone="warn">{isUnavailable(q.error) ? "Notifications aren't switched on here yet." : q.error.message}</Alert></Card>;
  if (!q.data) return <Card title="Notifications"><Skeleton variant="text" lines={3} /></Card>;
  const d = q.data;
  return (
    <div className="ui-stack">
      <Card title="What you receive">
        <p>{LEVEL[d.level] || humanise(d.level)} (set by your plan).</p>
        <p className="ui-muted">{EMAIL[d.email] || ''} There are no separate preferences to set yet.</p>
      </Card>
      <Card title="Recent">
        {(d.items || []).length ? (
          <ul className="notif">
            {d.items.map((n) => <li key={n.key + n.at}><span>{KIND[n.kind] || humanise(n.kind)}{n.code ? ` · ${n.code}` : ''}</span><span className="ui-faint">{fmtDateTime(n.at)} · {n.channel === 'email' ? 'Email' : 'In app'}</span></li>)}
          </ul>
        ) : <p className="ui-muted">Nothing yet. Your first monthly digest arrives at the start of next month.</p>}
      </Card>
    </div>
  );
}

function Security({ me }) {
  const navigate = useNavigate();
  return (
    <Card title="Security">
      <dl className="facts"><div><dt>Signed in as</dt><dd>{me?.user?.email}</dd></div></dl>
      <p>To change your password, use the reset link: we email you a secure link and nothing is changed until you open it.</p>
      <div className="ui-row">
        <Button as={Link} to="/forgot-password" variant="secondary">Reset my password</Button>
        <Button variant="ghost" iconLeft="logout" onClick={() => { logout(); navigate('/login'); }}>Sign out on this device</Button>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { me, company, companyId, entitlementsRaw, reloadEntitlements } = useCompany();
  const { tab: param } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const tab = settingsTab(param, query.get('tab'));
  return (
    <div>
      <PageHeader title="Settings" />
      <Tabs label="Settings" value={tab} onChange={(t) => navigate(`/settings/${t}`)} items={SETTINGS_TABS}>
        {(t) => ({
          account: <Account me={me} />,
          team: <TeamAccess me={me} company={company} companyId={companyId} entitlementsRaw={entitlementsRaw} />,
          plan: <PlanBilling companyId={companyId} entitlementsRaw={entitlementsRaw} reloadEntitlements={reloadEntitlements} />,
          notifications: <Notifications companyId={companyId} />,
          privacy: <Privacy companyId={companyId} />,
          security: <Security me={me} />,
          appearance: <AppearanceSetting />,
        }[t])}
      </Tabs>
    </div>
  );
}
