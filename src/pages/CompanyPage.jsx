import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, FormField, Input, Modal, PageHeader, ProgressBar, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { ReadinessSnapshot } from '../components/capital/Readiness';
import { ConncctSourceTag } from '../components/capital/bits';
import { completeness } from '../lib/capital';
import { deleteCompany, canDeleteCompany } from '../lib/companies';
import { isMissingEndpoint } from '../lib/auth';
import { fmtUsd, fmtDateTime, timingLabel, countryName, DECLARED_LABEL, isDeclaredFigure } from '../lib/format';

function Unknown({ href }) {
  return <span className="unknown-pill" title="Not set yet. Every match shows this as unknown, and confidence drops.">unknown {href && <Link to="/company/business">Set it</Link>}</span>;
}
function Row({ label, value, href, field }) {
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
  const declared = !empty && field && isDeclaredFigure(field);
  return <div><dt>{label}</dt><dd>{empty ? <Unknown href={href} /> : Array.isArray(value) ? value.join(' · ') : value}{declared && <span className="ui-faint declared-note"> · {DECLARED_LABEL}</span>}</dd></div>;
}

export default function CompanyPage() {
  const { company, readiness, me, reloadCompanies } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const c = completeness(company);
  const href = '/company/business';
  const r = readiness?.readiness;
  const isOwner = !company.owner_user_id || company.owner_user_id === me?.user?.id;

  async function remove() {
    setBusy(true);
    try {
      await deleteCompany(company.id);
      toast.success(`${company.name} was removed from Deligato.`);
      reloadCompanies();
      navigate('/');
    } catch (e) {
      toast.error(isMissingEndpoint(e) ? "Removing a company isn't connected in this environment yet. Use Settings › Delete my Deligato account instead." : `Couldn't remove it: ${e.message}`);
    } finally { setBusy(false); setRemoving(false); }
  }

  return (
    <div className="company">
      <SubNav section="company" />
      <PageHeader title={company.name} subtitle="The facts that drive your routes and matches."
        meta={<>{company.source === 'conncct' && <ConncctSourceTag />}<div className="co-meter"><ProgressBar value={c.known} max={c.total} label="Matching inputs" valueText={`${c.known} of ${c.total}`} tone="gold" /></div></>}
        actions={<Button as={Link} to="/company/business" variant="secondary">Edit company details</Button>} />
      <div className="ui-grid ui-grid-2">
        <Card title="Identity">
          <dl className="facts">
            <Row label="Name" value={company.name} />
            <Row label="Website" value={company.website} href={href} />
            <Row label="Headquarters" value={[company.hq_city, countryName(company.hq_country_iso2)].filter(Boolean).join(', ')} href={href} />
            <Row label="Founded" value={company.founded_year} href={href} />
          </dl>
          {company.one_liner && <p>{company.one_liner}</p>}
          {company.description && <p className="ui-muted">{company.description}</p>}
        </Card>
        <Card title="What investors filter on" action={<Badge tone="outline" size="sm">Used by matching</Badge>}>
          <dl className="facts">
            <Row label="Stage" value={company.stage} href={href} />
            <Row label="Sector" value={company.sector ? `${company.sector}${company.sub_sectors?.length ? ` (also: ${company.sub_sectors.join(', ')})` : ''}` : null} href={href} />
            <Row label="Business model" value={company.business_model} href={href} />
            <Row label="HQ country" value={countryName(company.hq_country_iso2)} href={href} />
            <Row label="Revenue (12 months)" field="revenue_usd" value={company.revenue_usd != null ? `${fmtUsd(company.revenue_usd)} / yr` : null} href={href} />
            <Row label="Keywords" value={company.keywords} href={href} />
          </dl>
          {c.missing.length > 0 && <p className="ui-muted">Missing: {c.missing.map((m) => m.label.toLowerCase()).join(', ')}.</p>}
        </Card>
        <Card title="Traction, team, finances">
          <dl className="facts">
            <Row label="MRR" value={company.mrr_usd != null ? fmtUsd(company.mrr_usd) : null} href={href} />
            <Row label="Burn" field="burn_usd" value={company.burn_usd != null ? `${fmtUsd(company.burn_usd)} / mo` : null} href={href} />
            <Row label="Runway" field="runway_months" value={company.runway_months != null ? `${company.runway_months} months` : null} href={href} />
            <Row label="Raised to date" value={company.raised_to_date_usd != null ? fmtUsd(company.raised_to_date_usd) : null} href={href} />
            <Row label="Team" value={company.team_size ? `${company.team_size} people` : null} href={href} />
          </dl>
          <p className="ui-faint">Revenue, burn and runway here are the figures you typed into your profile. <Link to="/company/financial-health">Financial Health</Link> works its own from your monthly check-ins.</p>
          {company.traction && <p className="ui-muted">{company.traction}</p>}
          {isOwner && (company.founders || []).length > 0 && (
            <p className="ui-muted">Founders: {company.founders.map((f) => `${f.name}${f.role ? ` (${f.role})` : ''}`).join(' · ')} <Badge tone="outline" size="sm">Visible to you only</Badge></p>
          )}
        </Card>
        <Card title="Capital readiness" action={<Link to="/capital/readiness">Full breakdown</Link>}>
          {r ? <ReadinessSnapshot readiness={r} showLink={false} source={readiness} /> : <Alert tone="info">Not yet scored. <Link to="/capital/readiness/assess">Get your free readiness score</Link></Alert>}
        </Card>
        <Card title="The raise" action={<Badge tone="brand" size="sm">Managed here</Badge>}>
          <p>{[fmtUsd(company.raise_usd) || 'Amount not set', company.instrument || 'instrument not set', timingLabel(company.raise_timing), (company.investor_types_sought || []).join(', ') || 'any investor type', (company.target_markets || []).join(', ')].filter(Boolean).join(' · ')}</p>
          <Button as={Link} to="/capital/need" variant="secondary" size="sm">Edit capital need</Button>
        </Card>
      </div>
      <p className="ui-faint co-foot">
        {company.imported_at ? `Imported ${fmtDateTime(company.imported_at)}` : `Last updated ${fmtDateTime(company.updated_at)}`}
        {canDeleteCompany(company) && <>{' · '}<Button variant="link" size="sm" onClick={() => setRemoving(true)}>Remove this company from Deligato</Button></>}
      </p>
      <Modal open={removing} onClose={() => setRemoving(false)} size="sm" title={`Remove ${company.name} from Deligato?`}
        description="This deletes your matches, pipeline, outreach drafts and data-room files here."
        footer={<><Button variant="ghost" onClick={() => setRemoving(false)}>Cancel</Button><Button variant="danger" loading={busy} disabled={confirmName.trim() !== company.name} onClick={remove}>Remove from Deligato</Button></>}>
        <FormField label={`Type ${company.name} to confirm`}><Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} /></FormField>
      </Modal>
    </div>
  );
}
