import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, PageHeader, ProgressSteps, SkeletonCards, useToast } from '../design/ui';
import SubNav from '../components/SubNav';
import { useCompany } from '../components/company-context';
import { LoadError } from '../components/capital/bits';
import useApi from '../lib/useApi';
import { getRouting, normaliseRoute, ROUTE_FIT } from '../lib/routing';
import { runMatch } from '../lib/capital';
import { conncctLink } from '../lib/companies';
import { fmtUsd, timingLabel } from '../lib/format';
import { readinessSource } from '../lib/readiness';

const CONF = { high: 'High confidence', medium: 'Medium confidence', low: 'Based on limited information' };
const NEED_FIELDS = ['raise_usd', 'purposes', 'dilution_tolerance', 'instrument', 'raise_timing', 'investor_types_sought', 'target_markets'];
const READINESS_FIELDS = ['runway_months', 'revenue_stability', 'runway'];

function coverageLevel(c) {
  if (!c) return null;
  if (c.level) return c.level;
  if (!c.provider_count) return 'none';
  return c.provider_count >= 10 && (c.verified_count ?? 0) >= 3 && (c.hq_accepting_count ?? c.provider_count) >= 3 ? 'good' : 'thin';
}

function RouteCard({ r, coverage, country, onSee, seeing }) {
  const [open, setOpen] = useState(false);
  const fit = ROUTE_FIT[r.fit] || ROUTE_FIT.possible;
  const level = coverageLevel(coverage);
  const n = coverage?.provider_count;
  const thinN = coverage && (coverage.hq_accepting_count ?? n) < 3 ? (coverage.hq_accepting_count ?? n) : n;
  return (
    <article className={`rcard rcard-${r.fit}`} aria-labelledby={`rt-${r.key}`}>
      <header className="rcard-head">
        <h3 id={`rt-${r.key}`}>{r.label}</h3>
        <Badge tone={fit.tone}>{r.fit === 'strong' ? 'Fits you' : r.fit === 'possible' ? 'Worth a look' : 'Unlikely for now'}</Badge>
        {r.confidence && <span className="ui-faint">{CONF[r.confidence]}</span>}
      </header>
      {r.description && <p className="rcard-desc">{r.description}</p>}
      {r.fit !== 'unlikely' && r.reasons.length > 0 && (
        <ul className="rcard-reasons">
          {r.reasons.slice(0, 3).map((x, i) => (
            <li key={i}><span aria-hidden="true">{x.state === 'partial' ? '◐' : '✓'}</span> {x.text}{x.source && <Badge tone="outline" size="sm">{x.source}</Badge>}</li>
          ))}
        </ul>
      )}
      {r.fit === 'unlikely' && r.blockers[0] && <p className="rcard-block"><span aria-hidden="true">✕</span> {r.blockers[0].text}</p>}
      {r.cautions.map((c, i) => <p key={i} className="rcard-caution">⚠ {c.text}</p>)}
      {(r.dilution || r.time_to_cash) && <p className="ui-muted rcard-meta">{[r.dilution, r.time_to_cash].filter(Boolean).join(' · ')}</p>}
      {level === 'good' && <p className="ui-muted rcard-meta">{n} providers on record · {coverage.verified_count} Conncct Verified</p>}
      {level === 'thin' && <p className="rcard-thin">Thin coverage: only {thinN} providers on record for this route{coverage.hq_accepting_count != null && coverage.hq_accepting_count < 3 && country ? ` that accept ${country}` : ''}. Treat these as a starting point, not the whole market.</p>}
      {level === 'none' && <p className="rcard-thin">No providers on record for this route yet. This says more about our database than about your company.</p>}
      <div className="rcard-foot">
        <Button variant="link" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? 'Hide detail' : 'Why?'}</Button>
        {level !== 'none' && (r.fit === 'unlikely'
          ? <Button variant="link" size="sm" onClick={() => onSee(r.key)} loading={seeing}>See them anyway</Button>
          : <Button variant="secondary" size="sm" onClick={() => onSee(r.key)} loading={seeing}>{n ? `See ${n} providers` : 'See providers'}</Button>)}
      </div>
      {open && (
        <div className="rcard-why">
          {r.reasons.length > 0 && <ul>{r.reasons.map((x, i) => <li key={i}>✓ {x.text} <span className="ui-faint">· {x.source}</span></li>)}</ul>}
          {r.blockers.length > 0 && <ul>{r.blockers.map((x, i) => <li key={i}>✕ {x.text}</li>)}</ul>}
          {r.unknowns.length > 0 && <ul>{r.unknowns.map((u, i) => <li key={i}>? {u.question || u.dimension}: not on record</li>)}</ul>}
          {r.typical_use && <p>Typical use: {r.typical_use}</p>}
          {r.investor_types.length > 0 && <p>Provider types: {r.investor_types.join(', ')}</p>}
          {r.instruments.length > 0 && <p>Instruments: {r.instruments.join(', ')}</p>}
          {coverage?.ticket_observed_usd && <p>Providers we hold write {fmtUsd(coverage.ticket_observed_usd.min)}–{fmtUsd(coverage.ticket_observed_usd.max)}</p>}
        </div>
      )}
    </article>
  );
}

/** 16 · Find Capital: which kinds of capital fit, then the providers inside them. */
export default function FindCapitalPage() {
  const { company, companyId, readiness, capitalNeedConfirmed, run, reloadRun } = useCompany();
  const navigate = useNavigate();
  const toast = useToast();
  const q = useApi(() => getRouting(companyId), [companyId, company?.raise_usd, company?.instrument, company?.raise_timing]);
  const [showUnlikely, setShowUnlikely] = useState(false);
  const [showAllUnknowns, setShowAllUnknowns] = useState(false);
  const [seeing, setSeeing] = useState(null);

  async function see(routeKey) {
    setSeeing(routeKey);
    try {
      const routes = q.data?.routes?.map(normaliseRoute) || [];
      try { sessionStorage.setItem('conncct.routes', JSON.stringify(routes)); } catch { /* optional */ }
      let runId = run?.run_id;
      if (!runId) { const res = await runMatch(companyId); runId = res.run_id; reloadRun(); }
      navigate(`/capital/matches?route=${routeKey}${runId ? `&run=${runId}` : ''}`);
    } catch (e) {
      toast.error(e.status === 503 ? 'Matching is temporarily unavailable. Try again shortly.' : `Couldn't find providers: ${e.message}`);
    } finally { setSeeing(null); }
  }

  const r = readiness?.readiness;
  const steps = [
    { label: 'Your company', description: 'From Conncct', status: 'done', href: '/company' },
    { label: 'Readiness', description: r ? readinessSource(readiness).label : 'Optional', status: r ? 'done' : 'upcoming', href: '/capital/readiness' },
    { label: 'Your raise', description: capitalNeedConfirmed ? 'Confirmed' : 'To confirm', status: capitalNeedConfirmed ? 'done' : 'current', href: '/capital/need' },
    { label: 'Capital routes', description: 'This page', status: capitalNeedConfirmed ? 'current' : 'upcoming' },
    { label: 'Your matches', description: run ? 'Ready' : 'Next', status: run ? 'done' : 'upcoming', href: run ? '/capital/matches' : undefined },
  ];

  const routes = (q.data?.routes || []).map((x) => ({ ...normaliseRoute(x), coverage: x.coverage }));
  const groups = { strong: routes.filter((x) => x.fit === 'strong'), possible: routes.filter((x) => x.fit === 'possible'), unlikely: routes.filter((x) => x.fit === 'unlikely') };
  const unknowns = q.data?.unknown_fields || [];
  const filterRoutes = q.data?.capital_filter?.routes || [];

  const unknownLink = (field) => (NEED_FIELDS.includes(field)
    ? <Button as={Link} to="/capital/need" variant="link" size="sm">Edit your raise</Button>
    : READINESS_FIELDS.includes(field) && !(r && readinessSource(readiness).key === 'conncct')
      ? <Button as={Link} to="/capital/readiness/assess" variant="link" size="sm">Update your readiness answers</Button>
      : <Button as="a" href={conncctLink(company)} target="_blank" rel="noreferrer" variant="link" size="sm">Update in Conncct ↗</Button>);

  return (
    <div className="find">
      <SubNav section="capital" />
      <PageHeader title="Find capital" subtitle={`Which kinds of capital fit ${company.name}, and who offers them.`} />
      <ProgressSteps className="find-steps" steps={steps} compact />

      <Card className="raise-card" title="Your raise" action={<Button as={Link} to="/capital/need" variant="secondary" size="sm">Edit your raise</Button>}>
        <p className="raise-line">{capitalNeedConfirmed || company.raise_usd
          ? [fmtUsd(company.raise_usd) || 'Amount not set', company.instrument || 'instrument not set', timingLabel(company.raise_timing)].filter(Boolean).join(' · ')
          : 'Confirm your raise to sharpen these routes.'}</p>
      </Card>

      {q.error ? <LoadError error={q.error} onRetry={q.reload} what="your routes" /> : !q.data ? <SkeletonCards count={4} height={150} /> : (
        <>
          {q.data.ordering?.key === 'ownership_first' && <Alert tone="info">{q.data.ordering.text}</Alert>}
          {groups.strong.length > 0 && <section className="rgroup"><h2 className="sec-h">Fits you</h2>{groups.strong.map((x) => <RouteCard key={x.key} r={x} coverage={x.coverage} country={company.hq_country_iso2} onSee={see} seeing={seeing === x.key} />)}</section>}
          {groups.possible.length > 0 && <section className="rgroup"><h2 className="sec-h">Worth a look</h2>{groups.possible.map((x) => <RouteCard key={x.key} r={x} coverage={x.coverage} country={company.hq_country_iso2} onSee={see} seeing={seeing === x.key} />)}</section>}
          {groups.unlikely.length > 0 && (
            <section className="rgroup">
              <h2 className="sec-h"><button type="button" className="tier-toggle" aria-expanded={showUnlikely} onClick={() => setShowUnlikely((v) => !v)}>Unlikely for now <span className="ui-faint">({groups.unlikely.length})</span> {showUnlikely ? '▾' : '▸'}</button></h2>
              {showUnlikely ? groups.unlikely.map((x) => <RouteCard key={x.key} r={x} coverage={x.coverage} country={company.hq_country_iso2} onSee={see} seeing={seeing === x.key} />)
                : <Button variant="link" size="sm" onClick={() => setShowUnlikely(true)}>Show {groups.unlikely.length} more</Button>}
            </section>
          )}
          {unknowns.length > 0 && (
            <Card title="Answer to sharpen this">
              <ul className="unk">
                {(showAllUnknowns ? unknowns : unknowns.slice(0, 3)).map((u) => (
                  <li key={u.field}><span>{u.question}</span><span className="ui-faint">affects {u.routes_affected} {u.routes_affected === 1 ? 'route' : 'routes'}</span>{unknownLink(u.field)}</li>
                ))}
              </ul>
              {unknowns.length > 3 && <Button variant="link" size="sm" onClick={() => setShowAllUnknowns((v) => !v)}>{showAllUnknowns ? 'Show fewer' : 'Show all'}</Button>}
            </Card>
          )}
          <div className="find-cta">
            <Button variant="accent" size="lg" disabled={!filterRoutes.length} onClick={() => see('fits')} loading={seeing === 'fits'}>Find providers in every route that fits</Button>
            {!filterRoutes.length && <p className="ui-muted">{q.data.capital_filter?.note}</p>}
            <details className="explainer"><summary>How routing works</summary><p>We first work out which kinds of capital suit a company like yours, from your stage, revenue, profitability, growth and what the money is for. Then we match you with providers inside those routes. Your readiness score isn't used here, though some of your readiness answers (like runway) can be.</p></details>
          </div>
          {q.data.notice && <p className="ui-faint find-notice">{q.data.notice}</p>}
        </>
      )}
    </div>
  );
}
