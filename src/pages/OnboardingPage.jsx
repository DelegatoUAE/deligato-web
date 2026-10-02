import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, ChipToggle, FormField, Input, ProgressSteps, Select, Textarea, useToast } from '../design/ui';
import { useCompany } from '../components/company-context';
import { createCompany } from '../lib/companies';
import { POSITIONING, fmtUsd } from '../lib/format';

const COUNTRIES = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB', 'MA', 'TN', 'NG', 'KE', 'ZA', 'GB', 'IE', 'FR', 'DE', 'NL', 'ES', 'IT', 'SE', 'CH', 'US', 'CA', 'BR', 'MX', 'IN', 'PK', 'SG', 'ID', 'MY', 'VN', 'PH', 'AU', 'NZ', 'JP', 'KR', 'TR'];
const regionName = (() => {
  try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); return (c) => dn.of(c); } catch { return (c) => c; }
})();
const FALLBACK_STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];
const STEPS = ['Your company', 'What you do', 'Traction', 'Review'];
// Which step shows each field, so a server validation error lands on its input.
const STEP_OF = {
  company_name: 0, one_liner: 0, hq_country_iso2: 0, hq_city: 0, website: 0, founded_year: 0,
  stage: 1, sector: 1, sub_sectors: 1, business_model: 1, keywords: 1, description: 1,
  revenue_usd: 2, mrr_usd: 2, team_size: 2, runway_months: 2, traction: 2,
};

/**
 * Company onboarding for a founder who doesn't arrive from Conncct: a short
 * guided intake that creates the company (POST /capital/profiles), then Home.
 * Readiness comes next, from the Conncct method, on the Readiness screen.
 */
export default function OnboardingPage() {
  const { company, companiesLoading, meta, me, reloadCompanies, setCompanyId } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const vocab = meta?.vocab || {};
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    company_name: me?.profile?.organization || '', one_liner: '', website: '', hq_country_iso2: '',
    stage: '', sector: '', business_model: '', keywords: '', description: '', revenue_usd: '', traction: '',
    hq_city: '', founded_year: '', sub_sectors: [], team_size: '', mrr_usd: '', runway_months: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setNum = (k, dec = false) => (e) => setF({ ...f, [k]: e.target.value.replace(dec ? /[^0-9.]/g : /[^0-9]/g, '') });
  const num = (v) => (v === '' ? undefined : Number(v));

  if (!companiesLoading && company) return <Navigate to="/" replace />;

  function check(i) {
    const e = {};
    if (i === 0) {
      if (!f.company_name.trim()) e.company_name = "Your company's name.";
      if (!f.hq_country_iso2) e.hq_country_iso2 = 'Where the company is headquartered.';
    }
    if (i === 1) {
      if (!f.stage) e.stage = 'Choose your stage.';
      if (!f.sector) e.sector = 'Choose the closest sector.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  const next = () => { if (check(step)) setStep(step + 1); };

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        company_name: f.company_name.trim(),
        one_liner: f.one_liner.trim() || undefined,
        description: f.description.trim() || undefined,
        website: f.website.trim() || undefined,
        hq_country_iso2: f.hq_country_iso2,
        stage: f.stage,
        sector: f.sector,
        business_model: f.business_model || undefined,
        keywords: f.keywords.split(',').map((x) => x.trim()).filter(Boolean),
        revenue_usd: num(f.revenue_usd),
        traction: f.traction.trim() || undefined,
        hq_city: f.hq_city.trim() || undefined,
        founded_year: num(f.founded_year),
        sub_sectors: f.sub_sectors.length ? f.sub_sectors : undefined,
        team_size: num(f.team_size),
        mrr_usd: num(f.mrr_usd),
        runway_months: num(f.runway_months),
      };
      const c = await createCompany(payload);
      setCompanyId(c.id);
      reloadCompanies();
      toast.success(`${c.name} is set up. Next: your readiness and your raise.`);
      navigate('/');
    } catch (e) {
      const fields = e.body?.error?.fields || e.body?.fields;
      if (fields && typeof fields === 'object' && Object.keys(fields).length) {
        setErrors(fields);
        const first = Object.keys(fields)[0];
        const at = STEP_OF[first];
        if (at != null) setStep(at);
        setError('Some answers need a fix. They are marked below.');
        return;
      }
      setError(e.upgradeRequired ? 'Your plan allows one company. Remove the existing one first.' : e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="onboard">
      <header className="onboard-head">
        <p className="home-positioning onboard-line">{POSITIONING}</p>
        <h1>Tell us about your company</h1>
        <p className="ui-muted">These facts drive which kinds of capital fit you and who we match you with. You can change them later in Company.</p>
      </header>
      <ProgressSteps className="find-steps" steps={STEPS.map((s, i) => ({ label: s, status: i < step ? 'done' : i === step ? 'current' : 'upcoming', onClick: i < step ? () => setStep(i) : undefined }))} />
      <Card className="onboard-card">
        {step === 0 && (
          <div className="ui-form ui-form-2">
            <FormField label="Company name" required error={errors.company_name} wide><Input value={f.company_name} onChange={set('company_name')} autoComplete="organization" /></FormField>
            <FormField label="One line on what you do" optional wide hint="e.g. Automated reconciliation and VAT-ready books for GCC SMEs."><Input value={f.one_liner} onChange={set('one_liner')} maxLength={200} /></FormField>
            <FormField label="Headquarters" required error={errors.hq_country_iso2}>
              <Select value={f.hq_country_iso2} onChange={set('hq_country_iso2')} placeholder="Choose a country"
                options={COUNTRIES.map((c) => ({ value: c, label: regionName(c) })).sort((a, b) => a.label.localeCompare(b.label))} />
            </FormField>
            <FormField label="City" optional error={errors.hq_city}><Input value={f.hq_city} onChange={set('hq_city')} maxLength={120} autoComplete="address-level2" /></FormField>
            <FormField label="Website" optional error={errors.website}><Input value={f.website} onChange={set('website')} placeholder="https://" inputMode="url" /></FormField>
            <FormField label="Year founded" optional error={errors.founded_year}><Input numeric value={f.founded_year} onChange={setNum('founded_year')} maxLength={4} placeholder="e.g. 2023" /></FormField>
          </div>
        )}
        {step === 1 && (
          <div className="ui-form">
            <FormField label="Stage" required error={errors.stage} wide>
              {() => <ChipToggle single label="Stage" options={vocab.stages || FALLBACK_STAGES} value={f.stage ? [f.stage] : []} onChange={(v) => setF({ ...f, stage: v[0] || '' })} />}
            </FormField>
            <FormField label="Sector" required error={errors.sector}>
              <Select value={f.sector} onChange={set('sector')} placeholder="Choose the closest" options={vocab.sectors || []} />
            </FormField>
            <FormField label="Other sectors you touch" optional wide error={errors.sub_sectors} hint="Helps with investors whose thesis is a neighbouring sector.">
              {() => <ChipToggle label="Other sectors" options={(vocab.sectors || []).filter((x) => x !== f.sector)} value={f.sub_sectors} onChange={(v) => setF({ ...f, sub_sectors: v.slice(0, 5) })} />}
            </FormField>
            <FormField label="Business model" optional>
              <Select value={f.business_model} onChange={set('business_model')} placeholder="Not sure" options={(vocab.business_models || []).filter((m) => m !== 'Any')} />
            </FormField>
            <FormField label="Keywords" optional wide hint="Comma-separated: what an investor's thesis would mention, e.g. embedded finance, SME banking."><Input value={f.keywords} onChange={set('keywords')} /></FormField>
            <FormField label="Describe the business" optional wide><Textarea rows={3} value={f.description} onChange={set('description')} /></FormField>
          </div>
        )}
        {step === 2 && (
          <div className="ui-form">
            <FormField label="Revenue over the last 12 months" optional error={errors.revenue_usd} hint={f.revenue_usd !== '' ? `${fmtUsd(f.revenue_usd) || '$0'} · enter 0 if you're pre-revenue` : "USD. Enter 0 if you're pre-revenue; leave blank if you'd rather not say (it shows as unknown)."}>
              <Input prefix="$" numeric value={f.revenue_usd} onChange={(e) => setF({ ...f, revenue_usd: e.target.value.replace(/[^0-9]/g, '') })} />
            </FormField>
            <FormField label="Monthly recurring revenue" optional error={errors.mrr_usd} hint="USD, if you have recurring revenue.">
              <Input prefix="$" numeric value={f.mrr_usd} onChange={setNum('mrr_usd')} />
            </FormField>
            <FormField label="Team size" optional error={errors.team_size} hint="Full-time people, founders included.">
              <Input numeric value={f.team_size} onChange={setNum('team_size')} />
            </FormField>
            <FormField label="Runway" optional error={errors.runway_months} hint="In months, at today's burn. Leave blank if you don't know yet.">
              <Input numeric value={f.runway_months} onChange={setNum('runway_months', true)} />
            </FormField>
            <FormField label="Traction" optional wide hint="Customers, growth, partnerships. Numbers help."><Textarea rows={4} value={f.traction} onChange={set('traction')} /></FormField>
          </div>
        )}
        {step === 3 && (
          <dl className="facts">
            {[['Company', f.company_name], ['One-liner', f.one_liner], ['Headquarters', [f.hq_city.trim(), f.hq_country_iso2 && regionName(f.hq_country_iso2)].filter(Boolean).join(', ')], ['Website', f.website], ['Founded', f.founded_year],
              ['Stage', f.stage], ['Sector', f.sector], ['Other sectors', f.sub_sectors.join(', ')], ['Business model', f.business_model], ['Keywords', f.keywords],
              ['Revenue (12 months)', f.revenue_usd === '' ? null : fmtUsd(f.revenue_usd) || '$0'], ['Monthly recurring revenue', f.mrr_usd === '' ? null : fmtUsd(f.mrr_usd) || '$0'],
              ['Team size', f.team_size], ['Runway', f.runway_months === '' ? null : `${f.runway_months} months`], ['Traction', f.traction]].map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v || <span className="unknown-pill">unknown</span>}</dd></div>
            ))}
          </dl>
        )}
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="onboard-nav">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
          {step < 3 ? <Button variant="primary" onClick={next}>Continue</Button> : <Button variant="accent" loading={busy} onClick={create}>Create my company</Button>}
        </div>
      </Card>
      <p className="ui-faint onboard-foot"><Link to="/experts">Only looking for an expert?</Link></p>
    </div>
  );
}
