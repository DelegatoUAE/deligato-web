import { useState } from 'react';
import { Alert, Badge, Button, Card, FormField, Input, PageHeader, Select, Skeleton, Textarea, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import AiOutput from '../components/AiOutput';
import { useCompany } from '../components/company-context';
import { updateProfile } from '../lib/capital';
import { runTask } from '../lib/intelligence';
import { isMissingEndpoint } from '../lib/auth';

const FIELDS = ['one_liner', 'description', 'website', 'business_model', 'keywords', 'traction'];

/**
 * Company › Business information. Descriptive facts the founder can refine
 * here (D23). Stage, sector, HQ and the readiness score stay with Conncct.
 */
export default function BusinessInfoPage() {
  const { company, companyId, meta, reloadCompanies } = useCompany();
  const toast = useToast();
  const init = () => Object.fromEntries(FIELDS.map((f) => [f, f === 'keywords' ? (company[f] || []).join(', ') : company[f] || '']));
  const [form, setForm] = useState(init);
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState({ loading: false, result: null, error: null });
  const dirty = JSON.stringify(form) !== JSON.stringify(init());

  async function save() {
    setBusy(true);
    try {
      await updateProfile(companyId, { ...form, keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean), business_model: form.business_model || null });
      reloadCompanies();
      toast.success('Business information saved.');
    } catch (e) { toast.error(`Couldn't save: ${e.message}`); } finally { setBusy(false); }
  }
  async function analyse() {
    setBrief({ loading: true, result: null, error: null });
    try {
      setBrief({ loading: false, result: await runTask('company_brief', { company_id: companyId }), error: null });
    } catch (e) {
      setBrief({ loading: false, result: null, error: isMissingEndpoint(e) ? "Company intelligence isn't connected in this environment yet." : e.message });
    }
  }

  return (
    <div>
      <SubNav section="company" />
      <PageHeader title="Business information" subtitle="How you describe the business. Better descriptions make thesis matching and outreach drafts sharper." />
      <div className="ui-grid ui-grid-2">
        <Card title="Describe your business" action={<Badge tone="brand" size="sm">Editable here</Badge>}>
          <div className="ui-form">
            <FormField label="One-liner" wide><Input value={form.one_liner} onChange={(e) => setForm({ ...form, one_liner: e.target.value })} maxLength={200} /></FormField>
            <FormField label="Description" wide><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
            <FormField label="Website"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></FormField>
            <FormField label="Business model"><Select value={form.business_model} onChange={(e) => setForm({ ...form, business_model: e.target.value })} placeholder="Not set" options={meta?.vocab?.business_models || []} /></FormField>
            <FormField label="Keywords" wide hint="Comma-separated. These feed thesis matching."><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></FormField>
            <FormField label="Traction" wide hint="Customers, revenue, growth, partnerships. Numbers help."><Textarea rows={4} value={form.traction} onChange={(e) => setForm({ ...form, traction: e.target.value })} /></FormField>
          </div>
          {company.source === 'conncct' && <Alert tone="info">Stage, sector, headquarters and your readiness score were imported. A later import may replace what you change here.</Alert>}
          <Button variant="primary" onClick={save} loading={busy} disabled={!dirty}>Save changes</Button>
        </Card>
        <Card title="Company intelligence" subtitle="How an investor would likely read your company, from your profile only.">
          <Button variant="secondary" iconLeft="spark" onClick={analyse} loading={brief.loading}>Analyse my company</Button>
          {brief.loading && <Skeleton variant="text" lines={6} />}
          {brief.error && <Alert tone="warn">{brief.error}</Alert>}
          {brief.result && <AiOutput result={brief.result} />}
        </Card>
      </div>
    </div>
  );
}
