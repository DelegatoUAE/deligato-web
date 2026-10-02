import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, ProgressSteps, Skeleton } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import CapitalNeedForm from '../components/capital/CapitalNeedForm';
import ReadinessQuestionnaire from '../components/capital/ReadinessQuestionnaire';
import { ReadinessSnapshot } from '../components/capital/Readiness';
import { ConncctSourceTag } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getRouting, normaliseRoute, ROUTE_FIT } from '../lib/routing';
import { runMatch, completeness } from '../lib/capital';
import { conncctLink } from '../lib/companies';
import { isMissingEndpoint } from '../lib/auth';
import { fmtUsd, timingLabel } from '../lib/format';

const STEPS = [
  { id: 'company', label: 'Your company' },
  { id: 'readiness', label: 'Capital readiness' },
  { id: 'need', label: 'What you are raising' },
  { id: 'routing', label: 'Capital routes' },
  { id: 'matches', label: 'Your matches' },
];

function CompanyStep({ company, onNext }) {
  const c = completeness(company);
  const rows = [
    ['Stage', company.stage], ['Sector', company.sector], ['Business model', company.business_model],
    ['Headquarters', [company.hq_city, company.hq_country_iso2].filter(Boolean).join(', ')],
    ['Revenue (12 months)', fmtUsd(company.revenue_usd)], ['Team', company.team_size ? `${company.team_size} people` : null],
  ];
  return (
    <Card title={`Tell us about ${company.name}`} subtitle="This comes from your Conncct profile. Fix anything wrong there, and it updates here." action={<ConncctSourceTag href={conncctLink(company)} />}>
      {company.one_liner && <p className="find-oneliner">{company.one_liner}</p>}
      <dl className="facts">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v || <span className="unknown-pill">unknown</span>}</dd></div>
        ))}
      </dl>
      <p className="ui-muted">Matching inputs: {c.known} of {c.total} known{c.missing.length ? `. Missing: ${c.missing.map((m) => m.label.toLowerCase()).join(', ')}.` : '.'}</p>
      <div className="ui-row">
        <Button variant="accent" onClick={onNext}>Continue</Button>
        <Button as={Link} to="/company/business" variant="ghost">Review business information</Button>
      </div>
    </Card>
  );
}

function ReadinessStep({ companyId, readiness, onNext }) {
  const [asking, setAsking] = useState(!readiness);
  const [fresh, setFresh] = useState(null);
  const r = fresh || readiness;
  return (
    <Card title="Conncct Capital Readiness" subtitle="How ready your company is to raise, on Conncct's 14 factors. Matching never uses this score; it shapes your advice and packages.">
      {r && !asking && <ReadinessSnapshot readiness={r} showLink={false} />}
      {asking ? (
        <ReadinessQuestionnaire companyId={companyId} onScored={(out) => { setFresh(out.readiness || null); setAsking(false); }} onCancel={r ? () => setAsking(false) : undefined} />
      ) : (
        <div className="ui-row">
          <Button variant="accent" onClick={onNext}>Continue</Button>
          <Button variant="ghost" onClick={() => setAsking(true)}>Update my answers</Button>
        </div>
      )}
      {!r && !asking && <Button variant="accent" onClick={onNext}>Skip for now</Button>}
    </Card>
  );
}

function RoutingStep({ company, onFind, finding }) {
  const routeQ = useApi(() => getRouting(company.id), [company.id]);
  const [chosen, setChosen] = useState(null);
  const raw = routeQ.data?.routes || [];
  const routes = raw.map(normaliseRoute);
  const selected = chosen || routes.filter((r) => r.recommended).map((r) => r.key);
  const toggle = (k) => setChosen(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);
  const missing = routeQ.error && isMissingEndpoint(routeQ.error);

  return (
    <Card title="Capital routes" subtitle={`Which kinds of capital fit ${company.name} at ${company.stage || 'its stage'}, raising ${fmtUsd(company.raise_usd) || 'an amount not set'}${company.instrument ? ` by ${company.instrument}` : ''}${company.raise_timing ? `, ${timingLabel(company.raise_timing)?.toLowerCase()}` : ''}.`}>
      {routeQ.loading && !routeQ.data && !routeQ.error && <Skeleton variant="text" lines={5} />}
      {missing && (
        <EmptyState compact icon="info" title="Capital routing isn't connected here yet."
          body="We'll match you across every capital type, and each match still explains its fit." />
      )}
      {routeQ.error && !missing && <Alert tone="bad">Couldn't work out your capital routes. {routeQ.error.message}</Alert>}
      {routeQ.data?.notice && <p className="ui-faint">{routeQ.data.notice}</p>}
      {routes.length > 0 && (
        <ul className="routes">
          {routes.map((r) => (
            <li key={r.key} className={`route route-${r.fit}${selected.includes(r.key) ? ' is-on' : ''}`}>
              <label className="route-top">
                <input type="checkbox" checked={selected.includes(r.key)} onChange={() => toggle(r.key)} />
                <span className="route-name">{r.label}</span>
                <Badge tone={ROUTE_FIT[r.fit]?.tone || 'neutral'} size="sm">{ROUTE_FIT[r.fit]?.label || r.fit}</Badge>
                {r.confidence && <span className="ui-faint">{r.confidence} confidence</span>}
              </label>
              {r.description && <p className="route-desc">{r.description}</p>}
              {r.reasons.length > 0 && <ul className="route-why">{r.reasons.slice(0, 3).map((x, i) => <li key={i}>{x.text}{x.source ? <span className="route-src"> · {x.source}</span> : null}</li>)}</ul>}
              {r.blockers.length > 0 && <ul className="route-block">{r.blockers.slice(0, 2).map((x, i) => <li key={i}>{x.text}</li>)}</ul>}
              {(r.time_to_cash || r.dilution) && <p className="ui-faint">{[r.dilution, r.time_to_cash].filter(Boolean).join(' · ')}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="ui-row">
        <Button variant="accent" loading={finding} onClick={() => onFind(routes.length ? routes.filter((r) => selected.includes(r.key)) : [])}
          disabled={routes.length > 0 && selected.length === 0}>Find my matches</Button>
        <span className="ui-muted">We check every verified capital source. Unknowns are never counted as a fit.</span>
      </div>
    </Card>
  );
}

export default function FindCapitalPage() {
  const { company, companyId, readiness, reloadCompanies, reloadRun } = useCompany();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState(null);
  const step = STEPS.some((s) => s.id === params.get('step')) ? params.get('step') : 'company';
  const idx = STEPS.findIndex((s) => s.id === step);
  const go = (id) => { setParams({ step: id }); window.scrollTo?.(0, 0); };

  async function find(routes) {
    setFinding(true);
    setError(null);
    try {
      const res = await runMatch(companyId);
      reloadRun();
      const q = new URLSearchParams();
      if (res.run_id) q.set('run', res.run_id);
      if (routes.length) q.set('routes', routes.map((r) => r.key).join(','));
      try { sessionStorage.setItem('conncct.routes', JSON.stringify(routes)); } catch { /* optional */ }
      navigate(`/capital/matches?${q.toString()}`);
    } catch (e) {
      setError(e.status === 503 ? 'Matching is temporarily unavailable. Try again shortly.' : e.message);
    } finally {
      setFinding(false);
    }
  }

  return (
    <div>
      <SubNav section="capital" />
      <PageHeader title="Find the right capital" subtitle="Five short steps from your company to a ranked, explained list of capital sources. You decide who to contact." />
      <ProgressSteps className="find-steps" steps={STEPS.map((s, i) => ({ label: s.label, status: i < idx ? 'done' : i === idx ? 'current' : 'upcoming', onClick: i < idx ? () => go(s.id) : undefined }))} />
      <div className="find-body">
        {step === 'company' && <CompanyStep company={company} onNext={() => go('readiness')} />}
        {step === 'readiness' && <ReadinessStep companyId={companyId} readiness={readiness?.readiness} onNext={() => go('need')} />}
        {step === 'need' && (
          <Card title="What are you trying to raise?" subtitle="These are hard filters, so be exact.">
            <CapitalNeedForm submitLabel="Save and continue" onSaved={() => { reloadCompanies(); go('routing'); }} />
          </Card>
        )}
        {(step === 'routing' || step === 'matches') && <RoutingStep company={company} onFind={find} finding={finding} />}
        {error && <Alert tone="bad">{error}</Alert>}
      </div>
    </div>
  );
}
