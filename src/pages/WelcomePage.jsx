import { Link } from 'react-router-dom';
import { Alert, Button, Card } from '../design/ui';
import { useCompany } from '../components/company-context';
import { ReadinessSnapshot } from '../components/capital/Readiness';
import { ConncctSourceTag, FundraisingNotice } from '../components/capital/bits';
import { completeness } from '../lib/capital';
import { conncctLink } from '../lib/companies';
import { fmtUsd, firstName } from '../lib/format';

export default function WelcomePage() {
  const { me, company, readiness } = useCompany();
  const c = completeness(company);
  const r = readiness?.readiness;
  const name = firstName(me?.profile?.full_name) || firstName(company.founders?.[0]?.name) || 'there';
  const line2 = [company.stage, company.sector, company.business_model, [company.hq_city, company.hq_country_iso2].filter(Boolean).join(', '), company.founded_year && `founded ${company.founded_year}`].filter(Boolean).join(' · ');
  const line3 = [company.revenue_usd != null && `Revenue ${fmtUsd(company.revenue_usd)}/yr`, company.mrr_usd != null && `MRR ${fmtUsd(company.mrr_usd)}`, company.runway_months != null && `runway ${company.runway_months} months`, company.team_size && `team ${company.team_size}`].filter(Boolean).join(' · ');
  return (
    <div className="welcomep">
      <h1>Welcome, {name}. Your company is here from Conncct.</h1>
      <div className="welcomep-grid">
        <Card title={company.name} action={<ConncctSourceTag link={false} />}>
          {company.one_liner && <p>{company.one_liner}</p>}
          <p className="ui-muted">{line2}</p>
          {line3 && <p className="ui-muted">{line3}</p>}
          <p>Matching inputs: {c.known} of {c.total} known</p>
          <a href={conncctLink(company)} target="_blank" rel="noreferrer">Something wrong? Update it in Conncct ↗</a>
        </Card>
        <Card title="Readiness">
          {r ? <ReadinessSnapshot readiness={r} showLink={false} source={readiness} /> : (
            <Alert tone="info" action={<Button as="a" href={conncctLink(company, 'readiness')} target="_blank" rel="noreferrer" size="sm" variant="secondary">Open Conncct ↗</Button>}>
              Not yet scored in Conncct. Get your free score there to see package advice.
            </Alert>
          )}
        </Card>
      </div>
      {c.known < 6 && (
        <Alert tone="warn">{c.total - c.known} matching inputs are missing in Conncct. Your matches will show these as unknown.</Alert>
      )}
      <p className="welcomep-next">Next: confirm what you're raising. It takes a minute.</p>
      <Button as={Link} to="/capital/find?step=need" variant="accent" size="lg">Confirm your raise</Button>
      <FundraisingNotice />
    </div>
  );
}
