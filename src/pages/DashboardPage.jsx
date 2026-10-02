import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Skeleton, StatTile, ProgressSteps } from '../design/ui';
import { useCompany } from '../components/company-context';
import useApi from '../lib/useApi';
import { getUnlocks, listPipeline, ACTIVE_STAGES, stageLabel } from '../lib/capital';
import { getRecommendation } from '../lib/packages';
import { conncctLink } from '../lib/companies';
import { fmtUsd, fmtPrice, firstName, timingLabel, plural, POSITIONING } from '../lib/format';
import { nextBestActions, readinessGaps, staleItems } from '../lib/actions';
import { ReadinessSnapshot } from '../components/capital/Readiness';
import { bandLabel } from '../lib/readiness';
import NextActions from '../components/capital/NextActions';
import MatchRow from '../components/capital/MatchRow';
import { FundraisingNotice, GateCard, LoadError } from '../components/capital/bits';


function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Waiting({ staff }) {
  return (
    <div className="home-wait">
      <p className="home-positioning">{POSITIONING}</p>
      <EmptyState
        icon="building"
        title="We're waiting for your company from Conncct."
        body="Once Conncct shares your company profile and readiness score, your matches start here."
        action={(
          <div className="ui-row">
            <Button as="a" href={conncctLink(null)} target="_blank" rel="noreferrer" variant="primary">Open Conncct ↗</Button>
            <Button as={Link} to="/experts" variant="secondary">Talk to an expert</Button>
            {staff && import.meta.env.VITE_DEV_IMPORT === 'true' && <Button as={Link} to="/dev/import" variant="ghost">Import a test company</Button>}
          </div>
        )}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { me, staff, company, companyId, companiesLoading, readiness, readinessLoading, run, runLoading, capitalNeedConfirmed, entitlements } = useCompany();
  const unlocksQ = useApi(() => (companyId && run ? getUnlocks(companyId) : null), [companyId, Boolean(run)]);
  const pipeQ = useApi(() => (companyId ? listPipeline(companyId).then((x) => x.pipeline || []) : null), [companyId]);
  const recQ = useApi(() => (companyId ? getRecommendation(companyId, company?.raise_timing) : null), [companyId]);

  if (companiesLoading) return <Skeleton h="320px" />;
  if (!company) return <Waiting staff={staff} />;

  const name = firstName(me?.profile?.full_name) || firstName(company.founders?.[0]?.name) || 'there';
  const pipeline = pipeQ.data;
  const pipelineGated = pipeQ.error?.status === 402;
  const strong = run ? run.results.filter((r) => r.fit_tier === 'strong').length : null;
  const active = pipeline ? pipeline.filter((p) => ['contacted', 'in_conversation', 'diligence', 'term_sheet'].includes(p.stage)).length : null;
  const gaps = readiness ? readinessGaps(readiness.readiness).length : null;
  const r = readiness?.readiness;
  const actions = nextBestActions({ company, capitalNeedConfirmed, run, unlocks: unlocksQ.data, readiness: r, pipeline: pipeline || null });
  const preview = run ? run.results.slice(0, 3) : [];
  const stale = staleItems(pipeline)[0];

  const steps = [
    { label: 'Company', status: 'done' },
    { label: 'Capital need', status: capitalNeedConfirmed ? 'done' : 'current' },
    { label: 'Matches', status: run ? 'done' : capitalNeedConfirmed ? 'current' : 'upcoming' },
    { label: 'Saved', status: pipeline?.length ? 'done' : 'upcoming' },
    { label: 'Outreach', status: pipeline?.some((p) => ACTIVE_STAGES.indexOf(p.stage) >= 3) ? 'done' : 'upcoming' },
    { label: 'Outcomes', status: pipeline?.some((p) => ['closed_won', 'passed', 'not_now', 'term_sheet'].includes(p.stage)) ? 'done' : 'upcoming' },
  ];

  const rec = recQ.data;
  const recItem = rec?.recommended_code ? rec.ranked?.find((x) => x.id === rec.recommended_code) : null;

  return (
    <div className="home">
      <header className="home-head">
        <h1>{greeting()}, {name}. Here's where your company stands.</h1>
        <p className="home-sub">{company.name}{company.stage ? ` · ${company.stage}` : ''}{company.sector ? ` · ${company.sector}` : ''}</p>
      </header>

      <section className="home-stats" aria-label="Where you stand">
        <StatTile as={Link} to="/capital/readiness" tone="navy" label="Capital readiness" loading={readinessLoading}
          value={r ? Math.round(Number(r.score)) : '–'} unit={r ? '/100' : undefined} foot={r ? bandLabel(r) : 'Not yet scored in Conncct'} />
        <StatTile as={Link} to="/capital/need" label="Current raise" value={fmtUsd(company.raise_usd) || 'Not set'}
          foot={[company.instrument || 'instrument not set', timingLabel(company.raise_timing)].filter(Boolean).join(' · ')} />
        <StatTile as={Link} to="/capital/matches" label="Strong capital matches" loading={runLoading}
          value={strong ?? '–'} foot={run ? `${plural(run.counts?.eligible ?? run.results.length, 'eligible source')}` : 'No match run yet'} />
        <StatTile as={Link} to="/capital/pipeline" label="Active conversations" loading={pipeQ.loading && !pipeQ.data && !pipeQ.error}
          value={pipelineGated ? '–' : active ?? '–'} foot={pipelineGated ? 'Included from Investor-Ready' : pipeline ? `${plural(pipeline.length, 'investor')} tracked` : ''} />
        <StatTile as={Link} to="/capital/readiness" label="Readiness gaps" loading={readinessLoading}
          value={gaps ?? '–'} foot={r ? 'factors below full marks' : 'Scored in Conncct'} />
      </section>

      <section className="home-actions" aria-labelledby="nba-h">
        <h2 id="nba-h">Your next best actions</h2>
        {actions.length ? <NextActions actions={actions} company={company} /> : <Skeleton variant="text" lines={3} />}
      </section>

      <div className="home-grid">
        <Card title="Readiness · from Conncct" className="home-ready">
          {readinessLoading ? <Skeleton h="160px" /> : r ? <ReadinessSnapshot readiness={r} /> : (
            <EmptyState compact icon="gauge" title="Not yet scored in Conncct." body="Get your free score there to see package advice." action={<Button as="a" href={conncctLink(company, 'readiness')} target="_blank" rel="noreferrer" variant="secondary" size="sm">Open Conncct ↗</Button>} />
          )}
        </Card>

        <Card title="Capital matches" action={run && <Button as={Link} to="/capital/matches" variant="link" size="sm">See all matches</Button>}>
          {runLoading ? <Skeleton h="160px" /> : !run ? (
            <EmptyState compact icon="search" title="You haven't run a match yet." body="We check every verified capital source against your company and raise." action={<Button as={Link} to="/capital/find" variant="primary" size="sm">Find the right capital</Button>} />
          ) : (
            <>
              <p className="home-counts">
                {['strong', 'possible', 'lead'].map((t) => `${run.results.filter((x) => x.fit_tier === t).length} ${t === 'lead' ? 'leads' : t}`).join(' · ')}
                {run.counts?.considered ? ` · ${run.counts.eligible} eligible of ${run.counts.considered.toLocaleString('en-US')} sources` : ''}
              </p>
              {strong === 0 && <p className="ui-muted">No strong fits yet. Your possible fits are worth a look. <Link to="/capital/improve">See what would add more</Link>.</p>}
              <ul className="mrows">{preview.map((x) => <MatchRow key={x.record_id} r={x} runId={run.run_id} />)}</ul>
            </>
          )}
        </Card>

        <Card title="Pipeline">
          {pipelineGated ? <GateCard compact title="Track your raise in one place." body="Included from Investor-Ready." /> :
            pipeQ.error ? <LoadError error={pipeQ.error} onRetry={pipeQ.reload} what="your pipeline" /> :
              !pipeline ? <Skeleton h="100px" /> : pipeline.length === 0 ? (
                <p className="ui-muted">Nothing tracked yet. Save investors from your matches to start.</p>
              ) : (
                <>
                  <ul className="pipe-mini">
                    {ACTIVE_STAGES.map((s) => ({ s, n: pipeline.filter((p) => p.stage === s).length })).filter((x) => x.n).map((x) => (
                      <li key={x.s}><span>{stageLabel(x.s)}</span><strong>{x.n}</strong></li>
                    ))}
                  </ul>
                  {stale && <p className="stale-prompt">Any news from {stale.capital_sources?.name || 'an investor'}? <Link to="/capital/pipeline">Log an update</Link></p>}
                </>
              )}
        </Card>

        <Card title="Recommended for you">
          {recQ.error ? <LoadError error={recQ.error} onRetry={recQ.reload} what="your recommendation" /> : !rec ? <Skeleton h="100px" /> : recItem ? (
            <div className="rec-mini">
              <p className="rec-mini-name">{recItem.name || recItem.id} · {fmtPrice(recItem.price_usd)}</p>
              {rec.reason_lines?.[0] && <p className="ui-muted">{rec.reason_lines[0]}</p>}
              <Button as={Link} to="/packages" variant="secondary" size="sm">See packages</Button>
            </div>
          ) : <p className="ui-muted">{rec.reason_lines?.[0] || 'Get your free readiness score in Conncct for a tailored recommendation.'}</p>}
        </Card>
      </div>

      <section className="home-journey" aria-label="Your raise">
        <h2>Your raise</h2>
        <ProgressSteps steps={steps} compact />
      </section>

      {entitlements?.capital_plan === 'trial' && run && <p className="ui-faint">You're on the free plan: your top 5 matches are shown.</p>}
      <FundraisingNotice />
    </div>
  );
}
